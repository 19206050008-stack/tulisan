// F5-TTS Indonesia — narasi natural + voice cloning.
//
// Memanggil REST API Gradio Space (publik) LANGSUNG dari browser dengan fetch
// biasa (tanpa credentials), supaya lolos CORS. Tidak pakai @gradio/client
// karena klien itu mengirim credentials:include yang ditolak CORS Space.
//
// F5 di CPU lambat (1-4 menit); fetch dari browser aman (tak kena timeout Vercel).
//
// Konfigurasi: NEXT_PUBLIC_HF_TTS_SPACE="VIU43/tts"  (atau URL penuh Space)

const SPACE = process.env.NEXT_PUBLIC_HF_TTS_SPACE || '';

export interface F5Voice { id: string; label: string }

// Suara natural dari folder refs/ di Space.
export const F5_VOICES: F5Voice[] = [
  { id: 'rosa', label: 'Rosa — Narasi' },
  { id: 'rae', label: 'Rae — Narasi' },
  { id: 'santi', label: 'Santi — Narasi' },
  { id: 'candra', label: 'Candra' },
  { id: 'charma', label: 'Charma' },
  { id: 'eras', label: 'Eras' },
  { id: 'masdi', label: 'Masdi' },
  { id: 'ozie', label: 'Ozie' },
  { id: 'zul', label: 'Zul' },
];

export function f5Available(): boolean {
  return !!SPACE;
}

export function isF5Voice(id: string): boolean {
  return F5_VOICES.some(v => v.id === id);
}

function baseUrl(): string {
  const s = SPACE.trim();
  if (s.startsWith('http')) return s.replace(/\/$/, '');
  // "VIU43/tts" -> "https://viu43-tts.hf.space"
  const sub = s.replace(/[/_.]/g, '-').toLowerCase();
  return `https://${sub}.hf.space`;
}

// Panggil endpoint Gradio (pola /call async): POST -> event_id, GET -> SSE hasil.
async function callGradio(api: string, payload: any[]): Promise<any[]> {
  const base = baseUrl();
  const post = await fetch(`${base}/call/${api}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: payload }),
  });
  if (!post.ok) throw new Error(`Gagal memulai (${post.status})`);
  const startJson = await post.json();
  const eventId = startJson?.event_id || startJson?.hash;
  if (!eventId) throw new Error('Server tidak mengembalikan event id.');

  // GET stream menunggu sampai selesai (bisa beberapa menit).
  const res = await fetch(`${base}/call/${api}/${eventId}`);
  if (!res.ok) throw new Error(`Gagal mengambil hasil (${res.status})`);
  const text = await res.text();

  // Parse SSE: cari event "complete".
  let ev = '';
  let result: any[] | null = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('event:')) {
      ev = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      const d = line.slice(5).trim();
      if (ev === 'error') throw new Error(`Server error: ${d || 'tidak diketahui'}`);
      if (ev === 'complete' && d) {
        try { result = JSON.parse(d); } catch { /* abaikan */ }
      }
    }
  }
  if (!result) throw new Error('Tidak ada hasil dari server.');
  return result;
}

/**
 * Hasilkan audio narasi natural untuk teks dengan suara terpilih.
 * Catatan: proses bisa 1-4 menit (CPU gratis). Tampilkan indikator loading.
 */
export async function generateF5(voice: string, text: string): Promise<Blob> {
  if (!SPACE) throw new Error('Space TTS belum dikonfigurasi (NEXT_PUBLIC_HF_TTS_SPACE).');
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Teks tidak boleh kosong.');

  const data = await callGradio('infer', [voice, trimmed]);
  const out = data[0];
  if (!out) throw new Error('Tidak ada audio dari Space.');

  const base = baseUrl();
  let url: string | undefined;
  if (typeof out === 'string') url = out;
  else if (out.url) url = out.url;
  else if (out.path) url = `${base}/file=${out.path}`;
  if (!url) throw new Error('Format audio tidak dikenal dari Space.');

  const r = await fetch(url);
  if (!r.ok) throw new Error('Gagal mengambil audio hasil.');
  return await r.blob();
}
