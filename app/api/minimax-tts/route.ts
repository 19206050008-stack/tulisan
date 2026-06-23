import { NextRequest, NextResponse } from 'next/server';

// MiniMax Text-to-Speech (T2A v2) — direct API.
// Keeps the API key server-side. Returns audio/mpeg (mp3).
//
// Verified endpoint: POST https://api.minimax.io/v1/t2a_v2
//   Headers: Authorization: Bearer {MINIMAX_API_KEY}
//   Body: { model, text, stream:false, voice_setting, audio_setting, language_boost }
//   Response (success): { data: { audio: "<hex mp3>" }, base_resp: { status_code: 0 } }
//   Response (error):   { base_resp: { status_code, status_msg } }

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';
const API_KEY = process.env.MINIMAX_API_KEY || '';
const GROUP_ID = process.env.MINIMAX_GROUP_ID || '';
const SPEECH_MODEL = 'speech-2.8-hd';

interface TTSBody {
  text?: string;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  vol?: number;
  emotion?: string;
  languageBoost?: string;
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'TTS belum dikonfigurasi (MINIMAX_API_KEY kosong).' }, { status: 500 });
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

  const voiceSetting: Record<string, unknown> = {
    voice_id: body.voiceId || 'Wise_Woman',
    speed: typeof body.speed === 'number' ? body.speed : 1,
    vol: typeof body.vol === 'number' ? body.vol : 1,
    pitch: typeof body.pitch === 'number' ? body.pitch : 0,
  };
  if (body.emotion && body.emotion !== 'neutral') voiceSetting.emotion = body.emotion;

  const payload = {
    model: SPEECH_MODEL,
    text,
    stream: false,
    voice_setting: voiceSetting,
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: 'mp3',
      channel: 1,
    },
    language_boost: body.languageBoost || 'Indonesian',
  };

  try {
    const url = GROUP_ID
      ? `${BASE_URL}/t2a_v2?GroupId=${encodeURIComponent(GROUP_ID)}`
      : `${BASE_URL}/t2a_v2`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({ error: `Upstream ${res.status}: ${errText.slice(0, 300)}` }, { status: 502 });
    }

    const json = await res.json();

    const code = json?.base_resp?.status_code;
    if (code !== undefined && code !== 0) {
      const msg = json?.base_resp?.status_msg || 'TTS error';
      // Friendly message for common cases
      const friendly = code === 1008
        ? 'Saldo Developer API MiniMax kosong. Catatan: kredit di tool web minimax.io/audio TERPISAH dari saldo API. Top up di platform.minimax.io > Account > Billing.'
        : `MiniMax error ${code}: ${msg}`;
      return NextResponse.json({ error: friendly }, { status: 402 });
    }

    const audioHex: string | undefined = json?.data?.audio;
    if (!audioHex) {
      return NextResponse.json({ error: 'Audio tidak ditemukan pada respons TTS' }, { status: 502 });
    }

    const audioBuffer = Buffer.from(audioHex, 'hex');
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
