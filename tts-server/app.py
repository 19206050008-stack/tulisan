"""
Indonesian TTS microservice using Microsoft Edge TTS (edge-tts).

No model download, no torch, no API key. Very light (~50-100MB RAM) so it runs
comfortably on small instances. Uses Microsoft's online neural voices.

Indonesian voices:
  - id-ID-ArdiNeural   (male)
  - id-ID-GadisNeural  (female)

Endpoints:
  GET  /health   -> { ok: true, voices: [...] }
  POST /speak    -> audio/mpeg   body: { "text": "...", "speaker": "gadis",
                                          "rate": "+0%", "pitch": "+0Hz" }
"""

import asyncio
import os

import edge_tts
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Friendly speaker names -> Edge neural voices.
VOICES = {
    "ardi": "id-ID-ArdiNeural",     # male
    "wibowo": "id-ID-ArdiNeural",   # alias (male)
    "gadis": "id-ID-GadisNeural",   # female
    "juminten": "id-ID-GadisNeural" # alias (female)
}
DEFAULT_SPEAKER = os.environ.get("DEFAULT_SPEAKER", "gadis")

app = FastAPI(title="Indonesian TTS (Edge TTS)")


class SpeakRequest(BaseModel):
    text: str
    speaker: str | None = None
    rate: str | None = None   # e.g. "+0%", "-10%"
    pitch: str | None = None  # e.g. "+0Hz", "-5Hz"


@app.get("/health")
def health():
    return {"ok": True, "voices": list(VOICES.keys())}


async def _synthesize(text: str, voice: str, rate: str, pitch: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    chunks = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.extend(chunk["data"])
    return bytes(chunks)


@app.post("/speak")
def speak(req: SpeakRequest):
    text = (req.text or "").strip()
    if not text:
        return JSONResponse({"error": "Teks wajib diisi"}, status_code=400)
    if len(text) > 5000:
        return JSONResponse({"error": "Teks terlalu panjang (maks 5000)"}, status_code=400)

    speaker = (req.speaker or DEFAULT_SPEAKER).lower()
    voice = VOICES.get(speaker, VOICES[DEFAULT_SPEAKER])
    rate = req.rate or "+0%"
    pitch = req.pitch or "+0Hz"

    try:
        audio = asyncio.run(_synthesize(text, voice, rate, pitch))
    except Exception as e:  # noqa: BLE001
        return JSONResponse({"error": f"Gagal membuat audio: {e}"}, status_code=503)

    if not audio:
        return JSONResponse({"error": "Audio kosong"}, status_code=503)

    return Response(content=audio, media_type="audio/mpeg")
