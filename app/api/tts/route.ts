import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Google Translate TTS - reliable REST endpoint (no WebSocket, works on serverless)
function buildGoogleTTSUrl(text: string, lang: string): string {
  const tl = lang.startsWith('en') ? 'en' : 'id';
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(text)}`;
}

// Normalisasi teks agar dibaca lebih natural oleh TTS Indonesia
function normalizeForTTS(text: string, lang: string): string {
  if (lang.startsWith('en')) return text;
  let s = text;

  // Singkatan umum Indonesia -> bentuk lengkap
  const abbreviations: Record<string, string> = {
    '\\bdll\\.?': 'dan lain-lain',
    '\\bdsb\\.?': 'dan sebagainya',
    '\\bdkk\\.?': 'dan kawan-kawan',
    '\\byg\\b': 'yang',
    '\\bdg\\b': 'dengan',
    '\\btsb\\.?': 'tersebut',
    '\\bsbg\\b': 'sebagai',
    '\\bspt\\b': 'seperti',
    '\\bkrn\\b': 'karena',
    '\\btdk\\b': 'tidak',
    '\\bjml\\b': 'jumlah',
    '\\bhal\\.': 'halaman',
    '\\bNo\\.': 'nomor',
    '\\bdr\\.': 'dokter',
    '\\bPm\\b': 'sore',
    '\\bAm\\b': 'pagi',
  };
  for (const [pattern, replacement] of Object.entries(abbreviations)) {
    s = s.replace(new RegExp(pattern, 'gi'), replacement);
  }

  // Beri jeda natural: ganti elipsis dan tanda hubung panjang
  s = s.replace(/\.\.\./g, ', ');
  s = s.replace(/[—–-]{1,}/g, ', ');

  // Rapikan spasi ganda
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Split text into chunks <= 200 chars (Google TTS limit), breaking on word boundaries
function chunkText(text: string, maxLen = 190): string[] {
  if (text.length <= maxLen) return [text];
  const words = text.split(' ');
  const chunks: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxLen) {
      if (current) chunks.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

async function fetchGoogleAudio(text: string, lang: string): Promise<Buffer> {
  const url = buildGoogleTTSUrl(text, lang);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/',
    },
  });
  if (!res.ok) throw new Error(`Google TTS failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const { text, lang = 'id' } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text too long (max 5000 chars)' }, { status: 400 });
    }

    const normalized = normalizeForTTS(text.trim(), lang);
    const chunks = chunkText(normalized);
    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const audio = await fetchGoogleAudio(chunk, lang);
      buffers.push(audio);
    }

    const audioBuffer = Buffer.concat(buffers);
    if (audioBuffer.length === 0) {
      return NextResponse.json({ error: 'No audio generated' }, { status: 500 });
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: error.message || 'TTS generation failed' }, { status: 500 });
  }
}
