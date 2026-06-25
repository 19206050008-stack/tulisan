'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, Pause, Play, SkipForward, Settings2, Square, Loader2 } from 'lucide-react';
import { loadTTSPrefs, DEFAULT_VOICE, type TTSGender } from '@/lib/tts-prefs';
import { decodeHtmlEntities, cleanTextForTTS } from '@/lib/tts-text-preprocessor';

interface TTSPlayerProps {
  text: string;
  lang?: 'id' | 'en';
  genre?: string;
  onSentenceChange?: (idx: number, sentence: string) => void;
  onPlayStateChange?: (playing: boolean) => void;
  registerControls?: (controls: { toggle: () => void }) => void;
}

// Map story genre to Edge TTS emotion style for more immersive narration
function genreToStyle(genre?: string): string {
  const g = (genre || '').toLowerCase();
  if (g.includes('horor') || g.includes('horror') || g.includes('misteri') || g.includes('mystery') || g.includes('thriller')) return 'gentle';
  if (g.includes('komedi') || g.includes('comedy') || g.includes('humor')) return 'cheerful';
  if (g.includes('romansa') || g.includes('romance') || g.includes('chicklit')) return 'gentle';
  if (g.includes('aksi') || g.includes('action') || g.includes('adventure') || g.includes('petualangan')) return 'excited';
  if (g.includes('drama') || g.includes('sejarah') || g.includes('historical')) return 'sad';
  return 'narration-relaxed';
}

const VOICES = {
  id: [
    { id: 'id-ID-GadisNeural', name: 'Wanita' },
    { id: 'id-ID-ArdiNeural', name: 'Pria' },
  ],
  en: [
    { id: 'en-US-JennyNeural', name: 'Wanita' },
    { id: 'en-US-GuyNeural', name: 'Pria' },
  ],
};

function splitIntoSentences(text: string): string[] {
  // Strip HTML tags, then run full TTS cleaning (decode entities, strip quotes,
  // bullets, decorative Unicode so nothing is "read" that shouldn't be).
  let cleaned = text.replace(/<[^>]+>/g, ' ');
  cleaned = cleanTextForTTS(cleaned);
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  return sentences.map(s => s.trim()).filter(s => s.length > 2);
}

export function TTSPlayer({ text, lang = 'id', genre, onSentenceChange, onPlayStateChange, registerControls }: TTSPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gender, setGender] = useState<TTSGender>('wanita');
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  const [sentenceList, setSentenceList] = useState<string[]>([]);
  const [wordIdx, setWordIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sentencesRef = useRef<string[]>([]);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const abortRef = useRef(false);
  const pausedRef = useRef(false);
  const genderRef = useRef<TTSGender>('wanita');
  const speedRef = useRef(1);
  const voiceRef = useRef(DEFAULT_VOICE);
  const resolveRef = useRef<(() => void) | null>(null);

  // Load saved prefs (voice picked on the Audio page; synced via localStorage/DB)
  useEffect(() => {
    const p = loadTTSPrefs();
    setGender(p.gender);
    setSpeed(p.speed);
    genderRef.current = p.gender;
    speedRef.current = p.speed;
    voiceRef.current = p.voice;
    // Warm up the TTS server (wakes a sleeping Railway container) so the first
    // "Dengarkan" doesn't pay the cold-start cost.
    fetch('/api/tts', { method: 'GET', cache: 'no-store' }).catch(() => {});
  }, []);

  useEffect(() => {
    const list = splitIntoSentences(text);
    sentencesRef.current = list;
    setSentenceList(list);
  }, [text]);

  const fetchEdgeAudio = useCallback(async (sentence: string): Promise<string | null> => {
    const sp = voiceRef.current;
    const cacheKey = `${sp}_${sentence}`;
    if (cacheRef.current.has(cacheKey)) return cacheRef.current.get(cacheKey)!;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence, speaker: sp }),
      });
      if (!res.ok) throw new Error('TTS API failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      cacheRef.current.set(cacheKey, url);
      return url;
    } catch {
      return null;
    }
  }, []);

  // Play one sentence using the self-hosted neural TTS (Supertonic) via <audio>.
  const playWithServerTTS = useCallback((sentence: string): Promise<void> => {
    return new Promise(async (resolve) => {
      const a = audioRef.current;
      const url = await fetchEdgeAudio(sentence);
      if (!url || !a || abortRef.current) { setLoading(false); resolve(); return; }
      const words = sentence.split(/\s+/).filter(Boolean);
      setWordIdx(0);
      // Karaoke: approximate active word from audio progress.
      const onTime = () => {
        const dur = a.duration;
        if (dur && isFinite(dur) && words.length) {
          const ratio = Math.min(1, a.currentTime / dur);
          setWordIdx(Math.min(words.length - 1, Math.floor(ratio * words.length)));
        }
      };
      const onPlaying = () => { setLoading(false); a.removeEventListener('playing', onPlaying); };
      const done = () => {
        a.removeEventListener('ended', done);
        a.removeEventListener('error', done);
        a.removeEventListener('timeupdate', onTime);
        a.removeEventListener('playing', onPlaying);
        setLoading(false);
        if (resolveRef.current === done) resolveRef.current = null;
        resolve();
      };
      resolveRef.current = done;
      a.addEventListener('playing', onPlaying);
      a.addEventListener('ended', done);
      a.addEventListener('error', done);
      a.addEventListener('timeupdate', onTime);
      a.src = url;
      a.playbackRate = speedRef.current || 1;
      a.play().catch(() => done());
    });
  }, [fetchEdgeAudio]);

  const playSequence = useCallback(async (startIdx: number) => {
    abortRef.current = false;
    setPlaying(true);
    onPlayStateChange?.(true);

    for (let i = startIdx; i < sentencesRef.current.length; i++) {
      if (abortRef.current) break;
      setCurrentIdx(i);
      const sentence = sentencesRef.current[i];
      onSentenceChange?.(i, sentence);

      const next = sentencesRef.current[i + 1];
      if (next) fetchEdgeAudio(next);
      await playWithServerTTS(sentence);

      // Wait while paused before moving to next sentence
      while (pausedRef.current && !abortRef.current) {
        await new Promise(r => setTimeout(r, 150));
      }

      // Natural pause between sentences — longer pause every ~3 sentences
      // (simulates paragraph break / breath like a storyteller).
      if (!abortRef.current && i + 1 < sentencesRef.current.length) {
        const isParagraphBreak = (i + 1) % 3 === 0;
        const pause = isParagraphBreak ? 500 : 280;
        await new Promise(r => setTimeout(r, pause));
      }
    }

    setPlaying(false);
    setCurrentIdx(0);
    setLoading(false);
    onPlayStateChange?.(false);
  }, [playWithServerTTS, fetchEdgeAudio, onPlayStateChange, onSentenceChange]);

  const handlePlay = () => {
    if (playing && !paused) {
      // Pause
      pausedRef.current = true;
      setPaused(true);
      audioRef.current?.pause();
    } else if (playing && paused) {
      // Resume
      pausedRef.current = false;
      setPaused(false);
      audioRef.current?.play().catch(() => {});
    } else {
      // Start
      setPaused(false);
      pausedRef.current = false;
      setLoading(true);
      // Prefetch the first couple of sentences in parallel to cut the gap.
      const s0 = sentencesRef.current[currentIdx];
      const s1 = sentencesRef.current[currentIdx + 1];
      if (s0) fetchEdgeAudio(s0);
      if (s1) fetchEdgeAudio(s1);
      playSequence(currentIdx);
    }
  };

  // Register toggle control for external keyboard shortcuts (Enter key)
  useEffect(() => {
    registerControls?.({ toggle: handlePlay });
  }, [registerControls, playing, paused, currentIdx]);

  const handleStop = () => {
    abortRef.current = true;
    pausedRef.current = false;
    resolveRef.current?.();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.removeAttribute('src'); }
    setPlaying(false);
    setPaused(false);
    setCurrentIdx(0);
  };

  const handleSkip = () => {
    if (!playing) return;
    abortRef.current = true;
    resolveRef.current?.();
    audioRef.current?.pause();
    const next = Math.min(currentIdx + 1, sentencesRef.current.length - 1);
    setCurrentIdx(next);
    setLoading(true);
    setTimeout(() => playSequence(next), 0);
  };

  const progress = sentenceList.length > 0
    ? Math.round((currentIdx / sentenceList.length) * 100)
    : 0;
  const lyricStart = Math.max(0, currentIdx - 1);
  const lyricWindow = sentenceList.slice(lyricStart, currentIdx + 4);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2 md:p-3 rounded-xl bg-bg-soft border border-border">
        <button
          onClick={handlePlay}
          className={`p-2 rounded-full transition-colors ${playing && !paused ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-accent/10 text-accent hover:bg-accent/20'}`}
          title={loading ? 'Menyiapkan suara…' : playing && !paused ? 'Jeda' : paused ? 'Lanjutkan' : 'Dengarkan'}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing && !paused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        {playing && (
          <button
            onClick={handleStop}
            className="p-2 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            title="Berhenti"
          >
            <Square className="h-4 w-4" />
          </button>
        )}

        {playing ? (
          <>
            <div className="flex-1 min-w-0">
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[9px] md:text-[10px] text-tx-muted mt-0.5">
                {loading ? 'Menyiapkan suara…' : paused ? 'Dijeda' : `Kalimat ${currentIdx + 1} / ${sentenceList.length}`}
              </p>
            </div>
            <button onClick={handleSkip} className="p-1.5 rounded-full hover:bg-bg-input transition-colors" title="Kalimat berikutnya">
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <span className="text-[10px] md:text-xs text-tx-muted">
            {sentenceList.length} kalimat
          </span>
        )}
      </div>

      {/* Karaoke lyrics — kata yang dibaca ter-highlight, auto berpindah ke bawah */}
      {playing && (
        <div className="rounded-xl bg-bg-soft border border-border px-3 py-3 md:px-4 md:py-4 overflow-hidden">
          <div className="space-y-2">
            {lyricWindow.map((s, k) => {
              const idx = lyricStart + k;
              if (idx !== currentIdx) {
                return (
                  <p key={idx} className={`text-sm leading-relaxed transition-opacity ${idx < currentIdx ? 'opacity-30' : 'opacity-50'}`}>
                    {s}
                  </p>
                );
              }
              const words = s.split(/\s+/).filter(Boolean);
              return (
                <p key={idx} className="text-base md:text-lg font-medium leading-relaxed">
                  {words.map((w, wi) => (
                    <span
                      key={wi}
                      className={`transition-colors ${wi === wordIdx ? 'bg-accent text-white rounded px-1' : wi < wordIdx ? 'text-accent' : 'text-tx-soft'}`}
                    >
                      {w}{' '}
                    </span>
                  ))}
                </p>
              );
            })}
          </div>
        </div>
      )}

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
