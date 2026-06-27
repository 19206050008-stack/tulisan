"""
Indonesian TTS microservice — sherpa-onnx SupertonicTTS (10 voices).
Free, no API key, CPU-only, low RAM (~350MB).

Endpoints:
  GET  /health  -> { ok, voices: [...] }
  POST /speak   -> audio/wav
                   body: { "text": "...", "speaker": "sari", "speed": 1.0 }
"""

import io
import os
import wave

import numpy as np
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

MODELS_DIR = os.environ.get("MODELS_DIR", "models")
DEFAULT_SPEAKER = os.environ.get("DEFAULT_SPEAKER", "sari")
SUPERTONIC_DIR = "sherpa-onnx-supertonic-3-tts-int8-2026-05-11"

# 10 Indonesian voices: sid 0-4 wanita, sid 5-9 pria
VOICES = {
    "sari":  (0, "Sari — Wanita",  "Indonesia"),
    "dewi":  (1, "Dewi — Wanita",  "Indonesia"),
    "ayu":   (2, "Ayu — Wanita",   "Indonesia"),
    "rina":  (3, "Rina — Wanita",  "Indonesia"),
    "maya":  (4, "Maya — Wanita",  "Indonesia"),
    "budi":  (5, "Budi — Pria",    "Indonesia"),
    "agus":  (6, "Agus — Pria",    "Indonesia"),
    "bayu":  (7, "Bayu — Pria",    "Indonesia"),
    "dimas": (8, "Dimas — Pria",   "Indonesia"),
    "andi":  (9, "Andi — Pria",    "Indonesia"),
}

app = FastAPI(title="Indonesian TTS")

# --- Model (loaded once at startup) ------------------------------------------
_tts = None


def _model_dir():
    return os.path.join(MODELS_DIR, SUPERTONIC_DIR)


def _model_ready():
    return os.path.isfile(os.path.join(_model_dir(), "tts.json"))


def _load_model():
    """Load SupertonicTTS into memory. Called once at startup."""
    global _tts
    if _tts is not None:
        return
    if not _model_ready():
        print("WARNING: model not found, TTS will not work")
        return
    import sherpa_onnx
    d = _model_dir()
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
                duration_predictor=os.path.join(d, "duration_predictor.int8.onnx"),
                text_encoder=os.path.join(d, "text_encoder.int8.onnx"),
                vector_estimator=os.path.join(d, "vector_estimator.int8.onnx"),
                vocoder=os.path.join(d, "vocoder.int8.onnx"),
                tts_json=os.path.join(d, "tts.json"),
                unicode_indexer=os.path.join(d, "unicode_indexer.bin"),
                voice_style=os.path.join(d, "voice.bin"),
            ),
            provider="cpu",
            num_threads=1,
            debug=False,
        ),
    )
    _tts = sherpa_onnx.OfflineTts(cfg)
    print("Model loaded successfully")


@app.on_event("startup")
def startup():
    _load_model()


# --- Helpers ------------------------------------------------------------------

def _samples_to_wav(samples, sample_rate: int) -> bytes:
    arr = np.asarray(samples, dtype=np.float32)
    arr = np.clip(arr, -1.0, 1.0)
    pcm = (arr * 32767.0).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(int(sample_rate))
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


# --- API ----------------------------------------------------------------------

class SpeakRequest(BaseModel):
    text: str
    speaker: str | None = None
    speed: float | None = None


@app.get("/health")
def health():
    voices = [{"id": k, "label": v[1], "group": v[2]} for k, v in VOICES.items()]
    return {"ok": _tts is not None, "voices": voices}


@app.post("/speak")
def speak(req: SpeakRequest):
    text = (req.text or "").strip()
    if not text:
        return JSONResponse({"error": "Teks wajib diisi"}, status_code=400)
    if len(text) > 5000:
        return JSONResponse({"error": "Teks terlalu panjang (maks 5000)"}, status_code=400)

    if _tts is None:
        return JSONResponse({"error": "Model belum siap"}, status_code=503)

    speaker = (req.speaker or DEFAULT_SPEAKER).lower()
    if speaker not in VOICES:
        return JSONResponse({"error": f"Suara '{speaker}' tidak dikenal"}, status_code=400)

    sid = VOICES[speaker][0]
    speed = float(req.speed) if req.speed else 1.0

    try:
        import sherpa_onnx
        gen = sherpa_onnx.GenerationConfig()
        gen.sid = sid
        gen.num_steps = 8
        gen.speed = speed
        gen.extra["lang"] = "id"
        out = _tts.generate(text, gen)
    except Exception as e:
        return JSONResponse({"error": f"Gagal: {e}"}, status_code=503)

    if out is None or len(out.samples) == 0:
        return JSONResponse({"error": "Audio kosong"}, status_code=503)

    wav = _samples_to_wav(out.samples, out.sample_rate)
    return Response(content=wav, media_type="audio/wav")
