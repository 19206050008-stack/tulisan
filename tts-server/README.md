# Indonesian TTS Server (Microsoft Edge TTS)

Self-hosted, no API key, no model download. Powers the `/api/tts` route in the
Next.js app. Sangat ringan (~50-100MB RAM) — cocok untuk Railway free/Hobby.

## Kenapa terpisah?

`edge-tts` memanggil layanan neural voice Microsoft Edge. Dipisah sebagai
service kecil agar gampang di-host dan dipanggil Next.js lewat env `LOCAL_TTS_URL`.

## Suara Indonesia

- `gadis` → `id-ID-GadisNeural` (wanita)
- `ardi`  → `id-ID-ArdiNeural` (pria)

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
uvicorn app:app --host 0.0.0.0 --port 8080
```

## Uji

```bash
curl http://localhost:8080/health
curl -X POST http://localhost:8080/speak \
  -H "Content-Type: application/json" \
  -d '{"text":"Halo dunia, ini contoh suara.","speaker":"gadis"}' \
  -o out.mp3
```

Output adalah MP3 (`audio/mpeg`).

## Sambungkan ke Next.js

Set di `.env.local` (dan di host produksi):

```
LOCAL_TTS_URL=http://localhost:8080
```

Route `/api/tts` memakai server ini (tanpa fallback).

## Deploy ke Railway

1. **New** → **Deploy from GitHub repo** → pilih repo.
2. Di **Settings** service:
   - **Root Directory**: `tts-server`
   - **Builder**: Dockerfile (otomatis via `railway.json`)
3. Build cepat (tanpa torch / tanpa unduh model). RAM kecil sudah cukup.
4. **Settings → Networking → Generate Domain** untuk dapat URL publik.
5. Uji `https://<domain>/health` → `{ "ok": true, "voices": ["ardi","wibowo","gadis","juminten"] }`.

### Sambungkan ke Vercel

**Settings → Environment Variables**:

```
LOCAL_TTS_URL = https://<domain-railway-anda>.up.railway.app
```

Redeploy Vercel. Halaman `/tts-demo` memanggil server Railway ini.

> Railway otomatis menyuntik `PORT`; Dockerfile sudah listen ke `$PORT`.
> Tidak ada API key yang diperlukan.
