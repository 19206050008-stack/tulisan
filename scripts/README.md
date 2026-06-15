# Cover Generation Scripts

Script untuk batch generate cover cerita menggunakan gen.pollinations.ai (Flux).

## Cara Pakai

### Step 1: Generate Prompts dari Database

```bash
npm run generate-prompts [jumlah]
```

Output: `scripts/cover-prompts.json`

### Step 2: Generate Cover Images

```bash
npm run generate-covers [jumlah]
```

Contoh:
```bash
npm run generate-covers 1    # Test 1 cover
npm run generate-covers 10   # Generate 10 covers
npm run generate-covers      # Semua covers
```

Gambar disimpan ke `public/covers/{story-id}.png`

## File

- `generate-covers.ts` — Buat prompts dari data cerita di Supabase
- `generate-images.ts` — Generate gambar via gen.pollinations.ai
- `cover-generator.html` — Tool HTML manual untuk generate cover satu per satu
- `cover-prompts.json` — Output prompts (auto-generated)
