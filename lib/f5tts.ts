// F5-TTS Indonesia — narasi natural + voice cloning.
//
// Dipanggil LANGSUNG dari browser ke HF Space publik (VIU43/tts) memakai
// @gradio/client. Alasannya: F5 di CPU lambat (1-4 menit) sehingga tidak bisa
// lewat serverless (timeout). Space publik = tidak butuh token untuk inference.
//
// Konfigurasi: NEXT_PUBLIC_HF_TTS_SPACE="VIU43/tts"

import { Client } from '@gradio/client';

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

let _client: Promise<Client> | null = null;
function getClient(): Promise<Client> {
  if (!_client) _client = Client.connect(SPACE);
  return _client;
}

/**
 * Hasilkan audio narasi natural untuk teks dengan suara terpilih.
 * Catatan: proses bisa 1-4 menit (CPU gratis). Tampilkan indikator loading.
 */
export async function generateF5(voice: string, text: string): Promise<Blob> {
  if (!SPACE) throw new Error('Space TTS belum dikonfigurasi (NEXT_PUBLIC_HF_TTS_SPACE).');
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Teks tidak boleh kosong.');

  const client = await getClient();
  const result: any = await client.predict('/infer', [voice, trimmed]);

  const out = Array.isArray(result?.data) ? result.data[0] : null;
  if (!out) throw new Error('Tidak ada audio dari Space.');
  const url: string | undefined = typeof out === 'string' ? out : (out.url || out.path);
  if (!url) throw new Error('Format audio tidak dikenal dari Space.');

  const res = await fetch(url);
  if (!res.ok) throw new Error('Gagal mengambil audio hasil.');
  return await res.blob();
}
