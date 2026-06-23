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

## Deploy ke Railway (langkah demi langkah)

1. **Buat service baru** di Railway → **New** → **Deploy from GitHub repo** →
   pilih repo `tulisan`.
2. Di **Settings** service:
   - **Root Directory**: `tts-server`  (penting — agar Railway pakai Dockerfile di folder ini)
   - **Builder**: Dockerfile (otomatis terdeteksi via `railway.json`)
3. Railway akan build image (instal torch + Coqui TTS, unduh model ~300MB).
   Build pertama lama (~5–10 menit). Pastikan plan punya **RAM ≥ 2–4GB**
   (model VITS butuh memori; trial gratis bisa kurang — pakai Hobby plan).
4. Setelah deploy, buka tab **Settings → Networking → Generate Domain** untuk
   dapat URL publik, mis. `https://ditulis-tts-production.up.railway.app`.
5. Uji: buka `https://<domain>/health` → harus muncul `{ "ok": true, "speakers": [...] }`.

### Sambungkan ke aplikasi Next.js (Vercel)

Di dashboard **Vercel** project Di.tulis → **Settings → Environment Variables**,
tambahkan:

```
LOCAL_TTS_URL = https://<domain-railway-anda>.up.railway.app
```

Redeploy Vercel. Halaman `/tts-demo` akan memanggil server Railway ini.

> Railway otomatis menyuntik `PORT`; Dockerfile sudah listen ke `$PORT`.
> Tidak ada API key yang diperlukan.
