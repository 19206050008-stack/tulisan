import { NextRequest, NextResponse } from 'next/server';

// Text-to-Speech proxy via TokenRouter (OpenAI-compatible endpoint).
// Keeps the API key server-side. Returns audio/mpeg (mp3).
//
// Verified: TokenRouter exposes the OpenAI-compatible route:
//   POST {base}/audio/speech  with { model, input, voice, speed, response_format }
//   Response: raw binary audio (audio/mpeg)
// (The MiniMax-native /t2a_v2 path returns 404 on TokenRouter.)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.TOKENROUTER_BASE_URL || 'https://api.tokenrouter.com/v1';
const API_KEY = process.env.TOKENROUTER_API_KEY || '';
const SPEECH_MODEL = 'speech-2.8-hd';

interface TTSBody {
  text?: string;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  emotion?: string;
  languageBoost?: string;
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'TTS belum dikonfigurasi (TOKENROUTER_API_KEY kosong).' }, { status: 500 });
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

  // OpenAI-compatible payload. Extra fields (emotion/pitch/language_boost) are
  // passed best-effort; TokenRouter ignores unknown fields.
  const payload: Record<string, unknown> = {
    model: SPEECH_MODEL,
    input: text,
    voice: body.voiceId || 'Wise_Woman',
    speed: typeof body.speed === 'number' ? body.speed : 1,
    response_format: 'mp3',
    language_boost: body.languageBoost || 'Indonesian',
  };
  if (body.emotion && body.emotion !== 'neutral') payload.emotion = body.emotion;
  if (typeof body.pitch === 'number' && body.pitch !== 0) payload.pitch = body.pitch;

  try {
    const res = await fetch(`${BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      // Error responses are JSON
      const errText = await res.text().catch(() => '');
      let msg = errText.slice(0, 300);
      try {
        const j = JSON.parse(errText);
        msg = j?.error?.message || j?.message || msg;
      } catch {}
      return NextResponse.json({ error: `Upstream ${res.status}: ${msg}` }, { status: 502 });
    }

    // If upstream returned JSON despite ok status, surface it as an error
    if (contentType.includes('application/json')) {
      const j = await res.json().catch(() => null);
      const msg = j?.error?.message || j?.message || 'Respon tidak berisi audio';
      return NextResponse.json({ error: msg }, { status: 502 });
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
