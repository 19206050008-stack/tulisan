import { NextRequest, NextResponse } from 'next/server';

// Text-to-Speech via self-hosted Indonesian TTS server (Microsoft Edge TTS).
// No API key. The Python service (see /tts-server) exposes
// POST /speak { text, speaker } -> audio/mpeg.
//
// Configure the server URL via env: LOCAL_TTS_URL=http://localhost:8080

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOCAL_TTS_URL = process.env.LOCAL_TTS_URL || '';

interface TTSBody {
  text?: string;
  speaker?: string;
  voice?: string;
}

export async function POST(req: NextRequest) {
  if (!LOCAL_TTS_URL) {
    return NextResponse.json({ error: 'TTS belum dikonfigurasi (set LOCAL_TTS_URL ke server TTS).' }, { status: 500 });
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

  try {
    const res = await fetch(`${LOCAL_TTS_URL.replace(/\/$/, '')}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speaker: body.speaker || body.voice || 'gadis' }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({ error: `TTS server ${res.status}: ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    if (audioBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Audio kosong dari server TTS' }, { status: 502 });
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: `TTS server tidak terjangkau: ${err?.message || ''}` }, { status: 502 });
  }
}
