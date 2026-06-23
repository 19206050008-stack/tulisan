"""
Indonesian TTS microservice using Wikidepia's Coqui TTS (VITS) model.

Model: https://github.com/Wikidepia/indonesian-tts (v1.2)
License: NON-COMMERCIAL USE ONLY.

Run:
  pip install -r requirements.txt
  python download_models.py        # downloads checkpoint.pth, config.json, speakers.pth
  uvicorn app:app --host 0.0.0.0 --port 8080

Endpoints:
  GET  /health              -> { ok, speakers: [...] }
  POST /speak               -> audio/wav
       body: { "text": "...", "speaker": "wibowo" }
"""

import io
import os
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from TTS.utils.synthesizer import Synthesizer
from g2p_id import G2p

MODEL_DIR = os.environ.get("MODEL_DIR", "models")
CHECKPOINT = os.path.join(MODEL_DIR, "checkpoint.pth")
CONFIG = os.path.join(MODEL_DIR, "config.json")
SPEAKERS = os.path.join(MODEL_DIR, "speakers.pth")
DEFAULT_SPEAKER = os.environ.get("DEFAULT_SPEAKER", "wibowo")

app = FastAPI(title="Indonesian TTS (Coqui VITS)")

# Loaded once at startup
_synth: Synthesizer | None = None
_g2p: G2p | None = None


@app.on_event("startup")
def _load():
    global _synth, _g2p
    use_cuda = os.environ.get("USE_CUDA", "0") == "1"
    _synth = Synthesizer(
        tts_checkpoint=CHECKPOINT,
        tts_config_path=CONFIG,
        tts_speakers_file=SPEAKERS,
        use_cuda=use_cuda,
    )
    _g2p = G2p()


def _speaker_list() -> list[str]:
    if not _synth or not _synth.tts_model:
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
    return {"ok": _synth is not None, "speakers": _speaker_list()}


@app.post("/speak")
def speak(req: SpeakRequest):
    if not _synth or not _g2p:
        return JSONResponse({"error": "Model belum dimuat"}, status_code=503)

    text = (req.text or "").strip()
    if not text:
        return JSONResponse({"error": "Teks wajib diisi"}, status_code=400)
    if len(text) > 5000:
        return JSONResponse({"error": "Teks terlalu panjang (maks 5000)"}, status_code=400)

    speaker = req.speaker or DEFAULT_SPEAKER

    # Grapheme -> phoneme (Indonesian). G2p returns a list of words,
    # each a list of phoneme symbols, e.g. [['a','p','ə','l'], ['i','t','u']].
    # Coqui's VITS model expects a phoneme STRING (words separated by spaces),
    # matching the Wikidepia README usage.
    phoneme_words = _g2p(text)
    phoneme_str = " ".join("".join(word) for word in phoneme_words)

    wav = _synth.tts(phoneme_str, speaker_name=speaker)

    buf = io.BytesIO()
    _synth.save_wav(wav, buf)
    return Response(content=buf.getvalue(), media_type="audio/wav")
