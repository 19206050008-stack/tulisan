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
export function pickVoice(gender: TTSGender, lang: 'id' | 'en'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  // Always get fresh voices list (may be empty on first call until voiceschanged fires)
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const wantLang = lang === 'id' ? 'id' : 'en';
  const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(wantLang));
  const pool = langVoices.length > 0 ? langVoices : voices;

  // Heuristic gender detection by common voice-name keywords
  const maleHints = ['male', 'pria', 'ardi', 'guy', 'david', 'mark', 'rama', 'andika', 'budi'];
  const femaleHints = ['female', 'wanita', 'gadis', 'jenny', 'zira', 'siti', 'damayanti', 'maya'];

  const matches = (v: SpeechSynthesisVoice, hints: string[]) =>
    hints.some(h => v.name.toLowerCase().includes(h));

  if (gender === 'pria') {
    const male = pool.find(v => matches(v, maleHints));
    if (male) return male;
    return pool[1] || pool[0] || null;
  } else {
    const female = pool.find(v => matches(v, femaleHints));
    if (female) return female;
    return pool[0] || null;
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
