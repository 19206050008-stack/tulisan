import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

// Microsoft Edge TTS now requires a Sec-MS-GEC security token (DRM).
// The token is a SHA-256 hash of (winFileTime rounded to 5-min + trusted token).
function generateSecMsGec(): string {
  const ticks = BigInt(Math.floor(Date.now() / 1000) + 11644473600) * BigInt(10000000);
  const rounded = ticks - (ticks % BigInt(3000000000));
  const strToHash = `${rounded.toString()}${TRUSTED_TOKEN}`;
  return crypto.createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

function buildWssUrl(): string {
  const secMsGec = generateSecMsGec();
  return `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-130.0.2849.68`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSSML(text: string, voice: string, rate: string, pitch: string, style: string): string {
  // Add natural micro-pauses after punctuation for more human-like rhythm
  const escaped = escapeXml(text)
    .replace(/([,;])\s/g, '$1<break time="180ms"/> ')
    .replace(/([.!?])\s/g, '$1<break time="350ms"/> ')
    .replace(/(:)\s/g, '$1<break time="250ms"/> ');

  const safeStyle = style || 'narration-relaxed';

  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='id-ID'>` +
    `<voice name='${voice}'>` +
    `<mstts:express-as style='${safeStyle}' styledegree='1'>` +
    `<prosody rate='${rate}' pitch='${pitch}' volume='+0%'>${escaped}</prosody>` +
    `</mstts:express-as>` +
    `</voice></speak>`;
}

function generateAudio(text: string, voice: string, rate: string, pitch: string, style: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const connectId = crypto.randomUUID().replace(/-/g, '');
    const ws = new WebSocket(buildWssUrl(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      },
    });

    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('TTS timeout'));
    }, 20000);

    ws.on('open', () => {
      const configMsg = `X-Timestamp:${new Date().toString()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
      ws.send(configMsg);

      const ssmlMsg = `X-RequestId:${connectId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${new Date().toString()}Z\r\n` +
        `Path:ssml\r\n\r\n` +
        buildSSML(text, voice, rate, pitch, style);
      ws.send(ssmlMsg);
    });

    ws.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
      if (isBinary) {
        const buf = data as Buffer;
        // Binary message: header length is first 2 bytes (big-endian)
        const headerLen = (buf[0] << 8) | buf[1];
        const header = buf.slice(2, 2 + headerLen).toString('utf-8');
        if (header.includes('Path:audio')) {
          chunks.push(buf.slice(2 + headerLen));
        }
      } else {
        const msg = data.toString();
        if (msg.includes('Path:turn.end')) {
          clearTimeout(timeout);
          ws.close();
          resolve(Buffer.concat(chunks));
        }
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      if (chunks.length > 0) resolve(Buffer.concat(chunks));
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'id-ID-GadisNeural', rate = '+0%', pitch = '+0Hz', style = 'narration-relaxed' } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text too long (max 5000 chars)' }, { status: 400 });
    }

    const audioBuffer = await generateAudio(text.trim(), voice, rate, pitch, style);

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
