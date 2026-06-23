'use client';

// Helper untuk mengekspor narasi cerita jadi file audio (WAV / MP3).
// Alur: teks -> potong jadi chunk -> /api/tts (suara terpilih) -> decode WAV
// -> gabung PCM -> encode WAV atau MP3. Mendukung gabung-satu-file & per-bab.

import lamejs from '@breezystack/lamejs';
import { preprocessTextForTTS } from './tts-text-preprocessor';

export type AudioFormat = 'wav' | 'mp3';

// Potong teks (HTML dibersihkan) jadi beberapa chunk <= maxLen karakter,
// memotong di batas kalimat agar natural & di bawah limit /api/tts (5000).
export function textToChunks(rawText: string, maxLen = 3500): string[] {
  const sentences = preprocessTextForTTS(rawText || '');
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur.length + s.length + 1) > maxLen) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

// Hasilkan audio satu chunk via /api/tts.
export async function synthChunk(text: string, speaker: string): Promise<Blob> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speaker }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({} as any));
    throw new Error(j.error || `TTS gagal (${res.status})`);
  }
  return await res.blob();
}

let _ctx: AudioContext | null = null;
function audioCtx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return _ctx;
}

// Decode beberapa blob audio -> gabung jadi satu Float32 PCM mono.
export async function blobsToSamples(blobs: Blob[]): Promise<{ samples: Float32Array; sampleRate: number }> {
  const c = audioCtx();
  const buffers: AudioBuffer[] = [];
  for (const b of blobs) {
    const ab = await b.arrayBuffer();
    const buf = await c.decodeAudioData(ab.slice(0));
    buffers.push(buf);
  }
  const sampleRate = buffers[0]?.sampleRate || 24000;
  const total = buffers.reduce((n, b) => n + b.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const b of buffers) { out.set(b.getChannelData(0), off); off += b.length; }
  return { samples: out, sampleRate };
}

function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const n = samples.length;
  const buffer = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); writeStr(8, 'WAVE');
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeStr(36, 'data'); view.setUint32(40, n * 2, true);
  const int16 = toInt16(samples);
  let off = 44;
  for (let i = 0; i < n; i++) { view.setInt16(off, int16[i], true); off += 2; }
  return new Blob([buffer], { type: 'audio/wav' });
}

export function encodeMp3(samples: Float32Array, sampleRate: number): Blob {
  const enc = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const int16 = toInt16(samples);
  const block = 1152;
  const data: BlobPart[] = [];
  for (let i = 0; i < int16.length; i += block) {
    const buf = enc.encodeBuffer(int16.subarray(i, i + block));
    if (buf.length) data.push(new Uint8Array(buf).buffer);
  }
  const end = enc.flush();
  if (end.length) data.push(new Uint8Array(end).buffer);
  return new Blob(data, { type: 'audio/mpeg' });
}

export function encodeAudio(samples: Float32Array, sampleRate: number, format: AudioFormat): Blob {
  return format === 'mp3' ? encodeMp3(samples, sampleRate) : encodeWav(samples, sampleRate);
}

export function sanitizeFilename(name: string): string {
  return (name || 'audio').replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_').slice(0, 80) || 'audio';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Render teks panjang -> satu Blob audio (format dipilih), dengan callback progres.
export async function renderTextToAudio(
  rawText: string,
  speaker: string,
  format: AudioFormat,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const chunks = textToChunks(rawText);
  if (chunks.length === 0) throw new Error('Teks kosong');
  const blobs: Blob[] = [];
  for (let i = 0; i < chunks.length; i++) {
    blobs.push(await synthChunk(chunks[i], speaker));
    onProgress?.(i + 1, chunks.length);
  }
  const { samples, sampleRate } = await blobsToSamples(blobs);
  return encodeAudio(samples, sampleRate, format);
}
