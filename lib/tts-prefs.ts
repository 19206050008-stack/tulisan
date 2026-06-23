'use client';

// Shared TTS preferences (persisted in localStorage)
// Uses Web Speech API which reliably supports voice gender + speed without server errors.

export type TTSGender = 'wanita' | 'pria';

// 10 suara natural (SupertonicTTS) — id harus cocok dengan backend tts-server.
export interface TTSVoiceOption { id: string; label: string; gender: TTSGender }
export const TTS_VOICES: TTSVoiceOption[] = [
  { id: 'sari',  label: 'Sari',  gender: 'wanita' },
  { id: 'dewi',  label: 'Dewi',  gender: 'wanita' },
  { id: 'ayu',   label: 'Ayu',   gender: 'wanita' },
  { id: 'rina',  label: 'Rina',  gender: 'wanita' },
  { id: 'maya',  label: 'Maya',  gender: 'wanita' },
  { id: 'budi',  label: 'Budi',  gender: 'pria' },
  { id: 'agus',  label: 'Agus',  gender: 'pria' },
  { id: 'bayu',  label: 'Bayu',  gender: 'pria' },
  { id: 'dimas', label: 'Dimas', gender: 'pria' },
  { id: 'andi',  label: 'Andi',  gender: 'pria' },
];
export const DEFAULT_VOICE = 'sari';

function validVoice(v: any): string {
  return TTS_VOICES.some(x => x.id === v) ? v : DEFAULT_VOICE;
}

export interface TTSPrefs {
  gender: TTSGender;
  speed: number; // 0.75 | 1 | 1.25 | 1.5
  voice: string; // salah satu TTS_VOICES id
}

const KEY = 'tts_prefs_v1';

export function loadTTSPrefs(): TTSPrefs {
  if (typeof window === 'undefined') return { gender: 'wanita', speed: 1, voice: DEFAULT_VOICE };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        gender: p.gender === 'pria' ? 'pria' : 'wanita',
        speed: typeof p.speed === 'number' ? p.speed : 1,
        voice: validVoice(p.voice),
      };
    }
  } catch {}
  return { gender: 'wanita', speed: 1, voice: DEFAULT_VOICE };
}

export function saveTTSPrefs(prefs: TTSPrefs) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
}

// Load TTS prefs from Supabase (synced across devices)
export async function loadTTSPrefsFromDB(userId: string): Promise<TTSPrefs> {
  try {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return loadTTSPrefs();
    const { data } = await supabase
      .from('profiles')
      .select('tts_gender, tts_speed, tts_voice')
      .eq('id', userId)
      .single();
    if (data) {
      const prefs: TTSPrefs = {
        gender: data.tts_gender === 'pria' ? 'pria' : 'wanita',
        speed: typeof data.tts_speed === 'number' && data.tts_speed > 0 ? data.tts_speed : 1,
        voice: validVoice(data.tts_voice),
      };
      saveTTSPrefs(prefs);
      return prefs;
    }
  } catch {}
  return loadTTSPrefs();
}

// Save TTS prefs to Supabase (synced across devices)
export async function saveTTSPrefsToDB(userId: string, prefs: TTSPrefs): Promise<void> {
  saveTTSPrefs(prefs);
  try {
    const { supabase } = await import('@/lib/supabase/client');
    if (!supabase) return;
    await supabase
      .from('profiles')
      .update({ tts_gender: prefs.gender, tts_speed: prefs.speed, tts_voice: prefs.voice })
      .eq('id', userId);
  } catch {}
}

// Pick a Web Speech voice for the requested gender + language.
// Uses pitch adjustment to simulate male/female when only one voice is available.
// Works on ALL browsers (Chrome, Firefox, Safari, Edge) - 100% free, no API key.
//
// Priority voices (best quality when available):
//   Edge:     Microsoft Gadis (female) / Microsoft Ardi (male)
//   Chrome:   Google Bahasa Indonesia (female)
//   Android:  Google BI 1-4
//   macOS:    Damayanti
//   Windows:  Andika
export interface VoiceSelection {
  voice: SpeechSynthesisVoice | null;
  pitch: number;
}

export function pickVoiceWithPitch(gender: TTSGender, lang: 'id' | 'en'): VoiceSelection {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return { voice: null, pitch: gender === 'pria' ? 0.7 : 1.1 };
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return { voice: null, pitch: gender === 'pria' ? 0.7 : 1.1 };
  }

  const wantLang = lang === 'id' ? 'id' : 'en';
  const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(wantLang));
  const pool = langVoices.length > 0 ? langVoices : voices;

  // Priority voices for Indonesian
  const PRIORITIES: { match: (name: string) => boolean; gender: TTSGender; pitch: number }[] = [
    // Edge Neural voices (veryHigh quality, native gender)
    { match: n => n.includes('Gadis') && n.includes('Online'), gender: 'wanita', pitch: 1.0 },
    { match: n => n.includes('Ardi') && n.includes('Online'), gender: 'pria', pitch: 1.0 },
    // Chrome Desktop
    { match: n => n === 'Google Bahasa Indonesia', gender: 'wanita', pitch: 1.0 },
    // Android/ChromeOS
    { match: n => /id-id-x-idc/.test(n.toLowerCase()), gender: 'wanita', pitch: 1.0 },
    { match: n => /id-id-x-idd/.test(n.toLowerCase()), gender: 'wanita', pitch: 1.0 },
    { match: n => /id-id-x-ide/.test(n.toLowerCase()), gender: 'pria', pitch: 1.0 },
    { match: n => /id-id-x-dfz/.test(n.toLowerCase()), gender: 'pria', pitch: 1.0 },
    // Windows
    { match: n => n.includes('Andika'), gender: 'wanita', pitch: 1.0 },
    // macOS/iOS
    { match: n => n.includes('Damayanti'), gender: 'wanita', pitch: 1.0 },
  ];

  // Try to find exact gender match from priority list
  for (const prio of PRIORITIES) {
    if (prio.gender !== gender) continue;
    const found = pool.find(v => prio.match(v.name));
    if (found) return { voice: found, pitch: prio.pitch };
  }

  // Find any Indonesian voice
  const anyIDVoice = pool[0];
  if (anyIDVoice) {
    // Adjust pitch based on desired gender
    const pitch = gender === 'pria' ? 0.7 : 1.1;
    return { voice: anyIDVoice, pitch };
  }

  // Fallback: no voices found
  return { voice: null, pitch: gender === 'pria' ? 0.7 : 1.1 };
}

// Preload voices (call once on mount). Voices load asynchronously in browsers.
export function preloadVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  // Trigger initial load
  window.speechSynthesis.getVoices();
  // Re-fetch when voices become available
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
