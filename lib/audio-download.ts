'use client';

// Audio download helper - generates MP3 via TTS API and triggers browser download.
// TTS is client-side so no server storage needed (avoids 50MB limit).

import { preprocessTextForTTS, formatChapterTitleForTTS, isChapterTitle } from './tts-text-preprocessor';

// Sanitize filename: keep alphanumeric, replace spaces with underscore
function sanitizeFilename(s: string): string {
  return (s || 'untitled')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

// Build filename per spec:
// - non-chapter: judul_oleh.mp3
// - chapter:     judul_bab_oleh.mp3
export function buildAudioFilename(title: string, author: string, chapterTitle?: string): string {
  const t = sanitizeFilename(title);
  const a = sanitizeFilename(author);
  if (chapterTitle) {
    const c = sanitizeFilename(chapterTitle);
    return `${t}_${c}_${a}.mp3`;
  }
  return `${t}_${a}.mp3`;
}

// Fetch a single TTS chunk as a Blob via the API
async function fetchTTSBlob(text: string, lang: 'id' | 'en' = 'id'): Promise<Blob | null> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

// Generate full audio for a text by concatenating sentence chunks, then download
export async function generateAndDownloadAudio(params: {
  text: string;
  filename: string;
  lang?: 'id' | 'en';
  chapterTitle?: string;
  onProgress?: (done: number, total: number) => void;
}): Promise<boolean> {
  const { text, filename, lang = 'id', chapterTitle, onProgress } = params;

  // Build the full reading text: chapter title first (if any), then content
  let fullText = text;
  if (chapterTitle && isChapterTitle(chapterTitle)) {
    fullText = `${formatChapterTitleForTTS(chapterTitle)}. ${text}`;
  } else if (chapterTitle) {
    fullText = `${chapterTitle}. ${text}`;
  }

  const sentences = preprocessTextForTTS(fullText);
  if (sentences.length === 0) return false;

  const blobs: Blob[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const blob = await fetchTTSBlob(sentences[i], lang);
    if (blob) blobs.push(blob);
    onProgress?.(i + 1, sentences.length);
  }

  if (blobs.length === 0) return false;

  // Concatenate MP3 blobs (simple binary concat works for MP3 playback)
  const merged = new Blob(blobs, { type: 'audio/mpeg' });
  const url = URL.createObjectURL(merged);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
