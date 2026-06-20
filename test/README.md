# Test Suite - StoryVerse / Di.tulis

## Cara Menjalankan

```bash
# Jalankan semua test
node test/run-all.mjs

# Jalankan test tertentu
node test/frontend/public-pages.mjs
node test/frontend/admin-pages.mjs
node test/frontend/write-page.mjs
node test/frontend/homepage-browse.mjs
node test/frontend/nana-chat.mjs
node test/backend/api-routes.mjs
node test/backend/supabase-data.mjs
```

## Environment Variables

```bash
TEST_URL=http://localhost:3000           # atau URL Vercel
NEXT_PUBLIC_SUPABASE_URL=...            # untuk test data layer
NEXT_PUBLIC_SUPABASE_ANON_KEY=...       # untuk test data layer
```

## Struktur

```
test/
├── helpers.mjs              # Shared utilities (fetch, assert, runner)
├── run-all.mjs              # Run semua suites
├── frontend/
│   ├── public-pages.mjs     # Test semua halaman publik
│   ├── admin-pages.mjs      # Test semua halaman admin
│   ├── write-page.mjs       # Test halaman write/edit
│   ├── homepage-browse.mjs  # Test homepage & browse filter
│   └── nana-chat.mjs        # Test Nana AI chat
└── backend/
    ├── api-routes.mjs       # Test API endpoints
    └── supabase-data.mjs    # Test Supabase tables & queries
```

## Known Issues & Fix Plan

### CRITICAL
| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Nana AI admin tidak tampil data user | lib/supabase/nana.ts | FIXED - upsert sync, RLS perlu dicek di Supabase dashboard |
| 2 | Homepage cerita tidak muncul saat filter aktif | components/HomePageClient.tsx | FIXED - cek both 'All' dan t.all |
| 3 | Tier badge tampil nama lama (Pendek/Sedang) | components/HomePageClient.tsx, BrowsePageClient.tsx, my-stories | FIXED - getTierDisplayName() |
| 4 | Category dropdown hardcoded | app/write/page.tsx, app/write/[id]/page.tsx | FIXED - dynamic from DB |

### MEDIUM
| # | Issue | File | Fix Plan |
|---|-------|------|----------|
| 5 | RLS policies mungkin memblokir admin SELECT di nana_chats | Supabase Dashboard | Tambah policy: SELECT for role = 'admin' |
| 6 | Genre color tidak muncul untuk kategori Indonesia baru | components/* | FIXED - centralized genre-colors.ts |
| 7 | Dark mode dropdown tidak terbaca | app/write/[id]/page.tsx | FIXED - option styling |

### LOW / COSMETIC
| # | Issue | File | Fix Plan |
|---|-------|------|----------|
| 8 | img elements harusnya pakai next/image | Various admin pages | Ganti <img> ke <Image> saat ada waktu |
| 9 | exhaustive-deps warnings | Various | Intentional, tidak perlu fix |
| 10 | Unused eslint-disable directives | Various | Cleanup saat ada waktu |

## Manual Test Checklist

### Homepage
- [ ] Cerita muncul saat default (All)
- [ ] Filter genre menampilkan cerita sesuai
- [ ] Badge tier tampil "Cerita Pendek" bukan "Pendek"
- [ ] HeroSlider gradient sesuai genre
- [ ] StoryCover gradient sesuai genre

### Write/Edit
- [ ] Category dropdown isi dari database
- [ ] Tier dropdown: Cerita Pendek, Cerita Sedang, Cerita Panjang, Novel
- [ ] Save menyimpan category dan tags ke DB
- [ ] Chapter navigation (dropdown + prev/next) berfungsi
- [ ] Dark mode semua dropdown terbaca

### Nana AI
- [ ] Response tidak hilang setelah streaming selesai
- [ ] Admin /admin/nana menampilkan percakapan user
- [ ] Chat tersimpan di localStorage dan sync ke DB

### Admin
- [ ] /admin/categories — CRUD kategori
- [ ] /admin/stories — list, filter, toggle status
- [ ] /admin/users — list, role toggle
- [ ] /admin/nana — tampilkan data chat user
- [ ] /admin/settings — save/load config
