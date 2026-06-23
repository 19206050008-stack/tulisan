"""
Hybrid Indonesian TTS microservice.

Two engines combined behind one API:

1) Microsoft Edge TTS (online, high quality, no API key)
   - id-ID-GadisNeural / id-ID-ArdiNeural  (Indonesia)
   - ms-MY-YasminNeural / ms-MY-OsmanNeural (Melayu)
   Output: MP3.

2) sherpa-onnx (offline, ONNX/onnxruntime, no torch, low RAM)
   - Piper Indonesian + Meta MMS regional voices (Jawa, Sunda, Minang, Bali,
     Bugis, Ngaju/Kalimantan, Aceh, Madura). Models are downloaded at build
     time (see download_models.py) and loaded lazily with a small LRU cache.
   Output: WAV.

Endpoints:
  GET  /health  -> { ok, voices: [ {id,label,group}, ... ] }
  POST /speak   -> audio/mpeg (edge) or audio/wav (local)
                   body: { "text": "...", "speaker": "jawa",
                           "rate": "+0%", "pitch": "+0Hz", "speed": 1.0 }
"""

import asyncio
import io
import os
import threading
import wave
from collections import OrderedDict

import edge_tts
import numpy as np
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

MODELS_DIR = os.environ.get("MODELS_DIR", "models")
DEFAULT_SPEAKER = os.environ.get("DEFAULT_SPEAKER", "gadis")

# id -> (edge voice, label, group)
EDGE_VOICES = {
    "gadis":  ("id-ID-GadisNeural",  "Gadis — Indonesia (Wanita)", "Indonesia"),
    "ardi":   ("id-ID-ArdiNeural",   "Ardi — Indonesia (Pria)",    "Indonesia"),
    "yasmin": ("ms-MY-YasminNeural", "Yasmin — Melayu (Wanita)",   "Melayu"),
    "osman":  ("ms-MY-OsmanNeural",  "Osman — Melayu (Pria)",      "Melayu"),
}

# id -> (model folder, label, group)
LOCAL_VOICES = {
    "indo-piper": ("vits-piper-id_ID-news_tts-medium", "Indonesia (Piper)", "Indonesia"),
    "jawa":   ("vits-mms-jav", "Jawa",               "Daerah"),
    "sunda":  ("vits-mms-sun", "Sunda",              "Daerah"),
    "minang": ("vits-mms-min", "Minang",             "Daerah"),
    "bali":   ("vits-mms-ban", "Bali",               "Daerah"),
    "bugis":  ("vits-mms-bug", "Bugis",              "Daerah"),
    "ngaju":  ("vits-mms-nij", "Ngaju (Kalimantan)", "Daerah"),
    "aceh":   ("vits-mms-ace", "Aceh",               "Daerah"),
    "madura": ("vits-mms-mad", "Madura",             "Daerah"),
}

app = FastAPI(title="Hybrid Indonesian TTS (Edge + sherpa-onnx)")

# --- lazy-loaded local model cache (LRU, capped to keep RAM low) ------------
_CACHE_MAX = 3
_local_cache: "OrderedDict[str, object]" = OrderedDict()
_cache_lock = threading.Lock()


def _local_available(folder: str) -> bool:
    return os.path.isdir(os.path.join(MODELS_DIR, folder))


def _resolve_model(folder: str):
    """Find .onnx, tokens.txt and optional espeak-ng-data inside a model dir."""
    path = os.path.join(MODELS_DIR, folder)
    onnx = None
    for f in sorted(os.listdir(path)):
        if f.endswith(".onnx"):
            onnx = os.path.join(path, f)
            break
    tokens = os.path.join(path, "tokens.txt")
    data_dir = os.path.join(path, "espeak-ng-data")
    data_dir = data_dir if os.path.isdir(data_dir) else ""
    return onnx, tokens, data_dir


def _get_local_tts(folder: str):
    with _cache_lock:
        if folder in _local_cache:
            _local_cache.move_to_end(folder)
            return _local_cache[folder]

    import sherpa_onnx  # lazy import so /health works even if unavailable

    onnx, tokens, data_dir = _resolve_model(folder)
    if not onnx or not os.path.exists(tokens):
        raise FileNotFoundError(f"Model {folder} tidak lengkap")

    config = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=onnx,
                tokens=tokens,
                lexicon="",
                data_dir=data_dir,
            ),
            provider="cpu",
            num_threads=1,
            debug=False,
        ),
        max_num_sentences=1,
    )
    tts = sherpa_onnx.OfflineTts(config)

    with _cache_lock:
        _local_cache[folder] = tts
        _local_cache.move_to_end(folder)
        while len(_local_cache) > _CACHE_MAX:
            _local_cache.popitem(last=False)
    return tts


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


# --- emotion presets ---------------------------------------------------------
# Edge TTS gratis tidak punya style emosi, jadi emosi diperkirakan lewat
# prosodi (rate, volume, pitch). Untuk voice lokal (sherpa) hanya 'speed'.
# id -> (rate, volume, pitch, speed_lokal, label)
EMOTIONS = {
    "netral":   ("+0%",  "+0%",  "+0Hz",  1.00, "Netral"),
    "senang":   ("+10%", "+0%",  "+22Hz", 1.10, "Senang"),
    "marah":    ("+16%", "+28%", "+16Hz", 1.15, "Marah"),
    "sedih":    ("-16%", "+0%",  "-22Hz", 0.90, "Sedih"),
    "nangis":   ("-26%", "-6%",  "-32Hz", 0.82, "Nangis"),
    "ketawa":   ("+18%", "+12%", "+38Hz", 1.16, "Ketawa"),
    "semangat": ("+20%", "+16%", "+26Hz", 1.16, "Semangat"),
    "takut":    ("+22%", "+0%",  "+28Hz", 1.14, "Takut"),
}
DEFAULT_EMOTION = "netral"


def _emotion(name: str | None):
    return EMOTIONS.get((name or DEFAULT_EMOTION).lower(), EMOTIONS[DEFAULT_EMOTION])


# --- edge-tts ----------------------------------------------------------------
async def _edge_once(text: str, voice: str, rate: str, volume: str, pitch: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume, pitch=pitch)
    chunks = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.extend(chunk["data"])
    return bytes(chunks)


async def _edge_tts(text: str, voice: str, rate: str, volume: str, pitch: str) -> bytes:
    last_err = None
    for _ in range(3):
        try:
            audio = await _edge_once(text, voice, rate, volume, pitch)
            if audio:
                return audio
        except Exception as e:  # noqa: BLE001
            last_err = e
            await asyncio.sleep(0.5)
    if last_err:
        raise last_err
    return b""


# --- API ---------------------------------------------------------------------
class SpeakRequest(BaseModel):
    text: str
    speaker: str | None = None
    emotion: str | None = None
    rate: str | None = None
    pitch: str | None = None
    speed: float | None = None


def _voice_list():
    out = []
    for vid, (_v, label, group) in EDGE_VOICES.items():
        out.append({"id": vid, "label": label, "group": group})
    for vid, (folder, label, group) in LOCAL_VOICES.items():
        if _local_available(folder):
            out.append({"id": vid, "label": label, "group": group})
    return out


def _emotion_list():
    return [{"id": k, "label": v[4]} for k, v in EMOTIONS.items()]


@app.get("/health")
def health():
    return {"ok": True, "voices": _voice_list(), "emotions": _emotion_list()}


@app.post("/speak")
def speak(req: SpeakRequest):
    text = (req.text or "").strip()
    if not text:
        return JSONResponse({"error": "Teks wajib diisi"}, status_code=400)
    if len(text) > 5000:
        return JSONResponse({"error": "Teks terlalu panjang (maks 5000)"}, status_code=400)

    speaker = (req.speaker or DEFAULT_SPEAKER).lower()
    e_rate, e_volume, e_pitch, e_speed, _ = _emotion(req.emotion)

    # Edge voices (MP3) — emotion via prosody (rate/volume/pitch)
    if speaker in EDGE_VOICES:
        voice = EDGE_VOICES[speaker][0]
        rate = req.rate or e_rate
        pitch = req.pitch or e_pitch
        volume = e_volume
        try:
            audio = asyncio.run(_edge_tts(text, voice, rate, volume, pitch))
        except Exception as e:  # noqa: BLE001
            return JSONResponse({"error": f"Gagal membuat audio: {e}"}, status_code=503)
        if not audio:
            return JSONResponse({"error": "Audio kosong"}, status_code=503)
        return Response(content=audio, media_type="audio/mpeg")

    # Local sherpa-onnx voices (WAV) — emotion approximated via speed only
    if speaker in LOCAL_VOICES:
        folder = LOCAL_VOICES[speaker][0]
        if not _local_available(folder):
            return JSONResponse({"error": f"Suara '{speaker}' tidak tersedia"}, status_code=404)
        speed = float(req.speed) if req.speed else e_speed
        try:
            tts = _get_local_tts(folder)
            out = tts.generate(text, sid=0, speed=speed)
        except Exception as e:  # noqa: BLE001
            return JSONResponse({"error": f"Gagal membuat audio: {e}"}, status_code=503)
        if out is None or len(out.samples) == 0:
            return JSONResponse({"error": "Audio kosong"}, status_code=503)
        wav = _samples_to_wav(out.samples, out.sample_rate)
        return Response(content=wav, media_type="audio/wav")

    return JSONResponse({"error": f"Suara '{speaker}' tidak dikenal"}, status_code=400)
