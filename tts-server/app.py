"""
Indonesian TTS microservice using Wikidepia's Coqui TTS (VITS) model.

Model: https://github.com/Wikidepia/indonesian-tts (v1.2)
License: NON-COMMERCIAL USE ONLY.

The heavy model is loaded LAZILY on the first /speak request (not at startup),
so /health responds immediately and the platform healthcheck passes while the
model downloads/loads in the background on demand.

Endpoints:
  GET  /health   -> { ok: true, loaded: bool, speakers: [...] }
  POST /speak    -> audio/wav   body: { "text": "...", "speaker": "wibowo" }
"""

import io
import os
import threading

from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Limit CPU threads to keep memory/CPU spikes down on small instances.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

MODEL_DIR = os.environ.get("MODEL_DIR", ".")
CHECKPOINT = os.path.join(MODEL_DIR, "checkpoint.pth")
CONFIG = os.path.join(MODEL_DIR, "config.json")
SPEAKERS = os.path.join(MODEL_DIR, "speakers.pth")
DEFAULT_SPEAKER = os.environ.get("DEFAULT_SPEAKER", "wibowo")
# Lighter grapheme->phoneme neural net for OOV words ("LSTM" vs heavy "BERT").
G2P_MODEL = os.environ.get("G2P_MODEL", "LSTM")

app = FastAPI(title="Indonesian TTS (Coqui VITS)")

_synth = None
_g2p = None
_load_lock = threading.Lock()
_load_error: str | None = None


def _ensure_loaded():
    """Load Synthesizer + G2p once, lazily. Returns (synth, g2p) or raises."""
    global _synth, _g2p, _load_error
    if _synth is not None and _g2p is not None:
        return _synth, _g2p
    with _load_lock:
        if _synth is not None and _g2p is not None:
            return _synth, _g2p
        from TTS.utils.synthesizer import Synthesizer
        from g2p_id import G2p
        try:
            import torch
            torch.set_num_threads(1)
        except Exception:
            pass
        use_cuda = os.environ.get("USE_CUDA", "0") == "1"
        synth = Synthesizer(
            tts_checkpoint=CHECKPOINT,
            tts_config_path=CONFIG,
            tts_speakers_file=SPEAKERS,
            use_cuda=use_cuda,
        )
        g2p = G2p(model_type=G2P_MODEL)
        _synth, _g2p = synth, g2p
        _load_error = None
        return _synth, _g2p


def _speaker_list() -> list[str]:
    if _synth is None or not getattr(_synth, "tts_model", None):
        return []
    sm = getattr(_synth.tts_model, "speaker_manager", None)
    if sm and getattr(sm, "name_to_id", None):
        return list(sm.name_to_id.keys())
    return []


class SpeakRequest(BaseModel):
    text: str
    speaker: str | None = None


@app.get("/health")
def health():
    # Lightweight — does NOT load the model, so healthcheck passes immediately.
    return {"ok": True, "loaded": _synth is not None, "speakers": _speaker_list(), "error": _load_error}


@app.post("/speak")
def speak(req: SpeakRequest):
    global _load_error
    text = (req.text or "").strip()
    if not text:
        return JSONResponse({"error": "Teks wajib diisi"}, status_code=400)
    if len(text) > 5000:
        return JSONResponse({"error": "Teks terlalu panjang (maks 5000)"}, status_code=400)

    try:
        synth, g2p = _ensure_loaded()
    except Exception as e:  # noqa: BLE001
        _load_error = str(e)
        return JSONResponse({"error": f"Gagal memuat model: {e}"}, status_code=503)

    speaker = req.speaker or DEFAULT_SPEAKER

    # Grapheme -> phoneme (Indonesian). G2p returns a list of words, each a list
    # of phoneme symbols, e.g. [['a','p','ə','l'], ['i','t','u']]. Coqui's VITS
    # model expects a phoneme STRING (words separated by spaces).
    phoneme_words = g2p(text)
    phoneme_str = " ".join("".join(word) for word in phoneme_words)

    wav = synth.tts(phoneme_str, speaker_name=speaker)

    buf = io.BytesIO()
    synth.save_wav(wav, buf)
    return Response(content=buf.getvalue(), media_type="audio/wav")
