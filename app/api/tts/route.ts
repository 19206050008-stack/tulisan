import { NextRequest, NextResponse } from 'next/server';

// Text-to-Speech via Pollinations (gen.pollinations.ai).
// OpenAI-compatible endpoint: POST /v1/audio/speech { model, input, voice }
// Returns raw audio bytes (mp3). Keeps the API key server-side.
//
// Get a key with pollen balance at https://enter.pollinations.ai
// TTS models (paid): elevenlabs, elevenflash, eleven-multilingual-v2, qwen-tts, qwen-tts-instruct

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.POLLINATIONS_BASE_URL || 'https://gen.pollinations.ai';
// Prefer a dedicated server key; fall back to the public cover-gen key.
const API_KEY = process.env.POLLINATIONS_API_KEY || process.env.NEXT_PUBLIC_POLLINATIONS_KEY || '';

interface TTSBody {
  text?: string;
  voice?: string;
  model?: string;
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'TTS belum dikonfigurasi (POLLINATIONS_API_KEY kosong).' }, { status: 500 });
  }

  let body: TTSBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 });
  }

  const text = (body.text || '').trim();
  if (!text) return NextResponse.json({ error: 'Teks wajib diisi' }, { status: 400 });
  if (text.length > 5000) return NextResponse.json({ error: 'Teks terlalu panjang (maks 5000 karakter)' }, { status: 400 });

  const payload = {
    model: body.model || 'eleven-multilingual-v2',
    input: text,
    voice: body.voice || 'nova',
  };

  try {
    const res = await fetch(`${BASE_URL}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok || contentType.includes('application/json')) {
      const errText = await res.text().catch(() => '');
      let msg = errText.slice(0, 300);
      try {
        const j = JSON.parse(errText);
        msg = j?.error?.message || j?.error || j?.message || msg;
      } catch {}
      const status = res.status === 402 ? 402 : res.status === 401 ? 401 : 502;
      const friendly = res.status === 401
        ? 'API key Pollinations tidak valid untuk gen.pollinations.ai. Buat key baru di enter.pollinations.ai.'
        : res.status === 402
          ? 'Saldo pollen tidak cukup. Top up di enter.pollinations.ai.'
          : `Upstream ${res.status}: ${msg}`;
      return NextResponse.json({ error: friendly }, { status });
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    if (audioBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Audio kosong dari server TTS' }, { status: 502 });
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Permintaan TTS gagal' }, { status: 500 });
  }
}
