'use client';

// Shared TTS preferences (persisted in localStorage)
// Uses Web Speech API which reliably supports voice gender + speed without server errors.

export type TTSGender = 'wanita' | 'pria';

export interface TTSPrefs {
  gender: TTSGender;
  speed: number; // 0.75 | 1 | 1.25 | 1.5
}

const KEY = 'tts_prefs_v1';

export function loadTTSPrefs(): TTSPrefs {
  if (typeof window === 'undefined') return { gender: 'wanita', speed: 1 };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        gender: p.gender === 'pria' ? 'pria' : 'wanita',
        speed: typeof p.speed === 'number' ? p.speed : 1,
      };
    }
  } catch {}
  return { gender: 'wanita', speed: 1 };
}

export function saveTTSPrefs(prefs: TTSPrefs) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
}

// Pick a Web Speech voice for the requested gender + language.
// Based on: https://github.com/readium/speech/blob/main/json/id.json
//
// Best voices (free, no API key):
//   Edge:     Microsoft Gadis (female, veryHigh) / Microsoft Ardi (male, veryHigh)
//   Chrome:   Google Bahasa Indonesia (female, high) — has 14s bug
//   Android:  Google BI 1-4 (high quality, 2 female + 2 male)
//   macOS:    Damayanti (female, low-normal)
//   Windows:  Andika (female, normal)
export function pickVoice(gender: TTSGender, lang: 'id' | 'en'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const wantLang = lang === 'id' ? 'id' : 'en';
  const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(wantLang));
  const pool = langVoices.length > 0 ? langVoices : voices;

  // Priority voices for Indonesian (based on Readium speech data)
  const PRIORITIES: { match: (name: string) => boolean; gender: TTSGender }[] = [
    // Edge Neural voices (veryHigh quality)
    { match: n => n.includes('Gadis') && n.includes('Online'), gender: 'wanita' },
    { match: n => n.includes('Ardi') && n.includes('Online'), gender: 'pria' },
    // Chrome Desktop
    { match: n => n === 'Google Bahasa Indonesia', gender: 'wanita' },
    // Android/ChromeOS (high quality)
    { match: n => /id-id-x-idc/.test(n.toLowerCase()), gender: 'wanita' },
    { match: n => /id-id-x-idd/.test(n.toLowerCase()), gender: 'wanita' },
    { match: n => /id-id-x-ide/.test(n.toLowerCase()), gender: 'pria' },
    { match: n => /id-id-x-dfz/.test(n.toLowerCase()), gender: 'pria' },
    // Windows
    { match: n => n.includes('Andika'), gender: 'wanita' },
    // macOS/iOS
    { match: n => n.includes('Damayanti'), gender: 'wanita' },
  ];

  // Try priority voices first (exact gender match, then any gender)
  for (const prio of PRIORITIES) {
    if (prio.gender !== gender) continue;
    const found = pool.find(v => prio.match(v.name));
    if (found) return found;
  }
  // Fallback: any priority voice regardless of gender
  for (const prio of PRIORITIES) {
    const found = pool.find(v => prio.match(v.name));
    if (found) return found;
  }

  // Heuristic fallback
  const maleHints = ['male', 'pria', 'ardi', 'guy', 'david', 'mark', 'rama', 'andika', 'budi', 'ide', 'dfz'];
  const femaleHints = ['female', 'wanita', 'gadis', 'jenny', 'zira', 'siti', 'damayanti', 'maya', 'idc', 'idd'];

  const matches = (v: SpeechSynthesisVoice, hints: string[]) =>
    hints.some(h => v.name.toLowerCase().includes(h));

  if (gender === 'pria') {
    return pool.find(v => matches(v, maleHints)) || pool[1] || pool[0] || null;
  } else {
    return pool.find(v => matches(v, femaleHints)) || pool[0] || null;
  }
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
