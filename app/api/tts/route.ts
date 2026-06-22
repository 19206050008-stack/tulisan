import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'id-ID-GadisNeural', rate = '+0%', pitch = '+0Hz' } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text too long (max 5000 chars)' }, { status: 400 });
    }

    const { tts } = await import('edge-tts');
    const audioBuffer = await tts(text.trim(), { voice, rate, pitch });

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
