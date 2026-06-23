# Indonesian TTS Server (Coqui VITS — Wikidepia v1.2)

Self-hosted, no API key. Powers the `/api/tts` route in the Next.js app.

> ⚠️ **Lisensi: NON-KOMERSIAL.** Model Wikidepia indonesian-tts hanya untuk
> penggunaan non-komersial. Jangan dipakai jika Di.tulis komersial.

## Kenapa terpisah?

Model ini PyTorch (VITS) + butuh Python, ~4GB RAM (ideal GPU). Tidak bisa jalan
di Vercel/Next.js. Jalankan sebagai service terpisah, lalu Next.js memanggilnya
lewat env `LOCAL_TTS_URL`.

## Jalankan dengan Docker (disarankan)

```bash
cd tts-server
docker build -t ditulis-tts .
docker run -p 8080:8080 ditulis-tts
```

## Jalankan manual (Python 3.10–3.12)

```bash
cd tts-server
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python download_models.py
uvicorn app:app --host 0.0.0.0 --port 8080
```

## Uji

```bash
curl http://localhost:8080/health
curl -X POST http://localhost:8080/speak \
  -H "Content-Type: application/json" \
  -d '{"text":"Halo dunia, ini contoh suara.","speaker":"wibowo"}' \
  -o out.wav
```

Speaker yang tersedia muncul di `GET /health` (mis. wibowo, ardi, gadis).

## Sambungkan ke Next.js

Set di `.env.local` (dan di host produksi):

```
LOCAL_TTS_URL=http://localhost:8080
```

Route `/api/tts` akan memakai server ini lebih dulu jika `LOCAL_TTS_URL` diset,
dan fallback ke Pollinations bila tidak.

## Hosting

Service ini butuh host yang mendukung Python/Docker dengan RAM cukup, mis:
Railway, Render, Fly.io, HuggingFace Spaces, atau VPS. Vercel tidak cocok.
