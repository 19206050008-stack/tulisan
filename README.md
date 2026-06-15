# StoryVerse

Platform menulis dan membaca cerita berbasis web, dibangun dengan Next.js 15, Supabase, dan TipTap editor.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Database & Auth**: Supabase
- **Editor**: TipTap v2
- **Cover AI**: gen.pollinations.ai (Flux)
- **Styling**: Tailwind CSS v4

## Setup Lokal

```bash
npm install
cp .env.example .env.local
# Isi variabel di .env.local
npm run dev
```

## Variabel Environment

Buat file `.env.local` berdasarkan `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Deploy ke Vercel

1. Push ke GitHub
2. Import repo di [vercel.com](https://vercel.com)
3. Tambahkan environment variables di Vercel dashboard
4. Deploy otomatis
