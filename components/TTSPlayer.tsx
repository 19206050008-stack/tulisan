'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, Pause, Play, SkipForward, Settings2, Square } from 'lucide-react';
import { loadTTSPrefs, saveTTSPrefs, pickVoice, type TTSGender } from '@/lib/tts-prefs';

interface TTSPlayerProps {
  text: string;
  lang?: 'id' | 'en';
  genre?: string;
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
  const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  return sentences.map(s => s.trim()).filter(s => s.length > 2);
}

export function TTSPlayer({ text, lang = 'id', genre }: TTSPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gender, setGender] = useState<TTSGender>('wanita');
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  const [sentenceList, setSentenceList] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sentencesRef = useRef<string[]>([]);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const abortRef = useRef(false);
  const pausedRef = useRef(false);
  const genderRef = useRef<TTSGender>('wanita');
  const speedRef = useRef(1);

  // Load saved prefs once
  useEffect(() => {
    const p = loadTTSPrefs();
    setGender(p.gender);
    setSpeed(p.speed);
    genderRef.current = p.gender;
    speedRef.current = p.speed;
  }, []);

  useEffect(() => {
    const list = splitIntoSentences(text);
    sentencesRef.current = list;
    setSentenceList(list);
  }, [text]);

  const fetchEdgeAudio = useCallback(async (sentence: string): Promise<string | null> => {
    const cacheKey = `${lang}_${sentence}`;
    if (cacheRef.current.has(cacheKey)) return cacheRef.current.get(cacheKey)!;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence, lang }),
      });
      if (!res.ok) throw new Error('TTS API failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      cacheRef.current.set(cacheKey, url);
      return url;
    } catch {
      return null;
    }
  }, [lang]);

  const playWithWebSpeech = useCallback((sentence: string): Promise<void> => {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = lang === 'id' ? 'id-ID' : 'en-US';
      utterance.rate = speedRef.current;
      const v = pickVoice(genderRef.current, lang as 'id' | 'en');
      if (v) utterance.voice = v;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      speechSynthesis.speak(utterance);
    });
  }, [lang]);

  const playSequence = useCallback(async (startIdx: number) => {
    abortRef.current = false;
    setPlaying(true);

    for (let i = startIdx; i < sentencesRef.current.length; i++) {
      if (abortRef.current) break;
      setCurrentIdx(i);
      const sentence = sentencesRef.current[i];

      await playWithWebSpeech(sentence);

      // Wait while paused before moving to next sentence
      while (pausedRef.current && !abortRef.current) {
        await new Promise(r => setTimeout(r, 150));
      }

      // Natural pause between sentences (breath)
      if (!abortRef.current && i + 1 < sentencesRef.current.length) {
        await new Promise(r => setTimeout(r, 250));
      }
    }

    setPlaying(false);
    setCurrentIdx(0);
  }, [playWithWebSpeech]);

  const handlePlay = () => {
    if (playing && !paused) {
      // Pause
      pausedRef.current = true;
      setPaused(true);
      audioRef.current?.pause();
      speechSynthesis.pause();
    } else if (playing && paused) {
      // Resume
      pausedRef.current = false;
      setPaused(false);
      audioRef.current?.play().catch(() => {});
      speechSynthesis.resume();
    } else {
      // Start
      setPaused(false);
      pausedRef.current = false;
      playSequence(currentIdx);
    }
  };

  const handleStop = () => {
    abortRef.current = true;
    pausedRef.current = false;
    audioRef.current?.pause();
    speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    setCurrentIdx(0);
  };

  const handleSkip = () => {
    if (!playing) return;
    audioRef.current?.pause();
    speechSynthesis.cancel();
    const next = Math.min(currentIdx + 1, sentencesRef.current.length - 1);
    setCurrentIdx(next);
    playSequence(next);
  };

  const progress = sentenceList.length > 0
    ? Math.round((currentIdx / sentenceList.length) * 100)
    : 0;

  return (
    <div className="flex items-center gap-2 p-2 md:p-3 rounded-xl bg-bg-soft border border-border">
      <button
        onClick={handlePlay}
        className={`p-2 rounded-full transition-colors ${playing && !paused ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-accent/10 text-accent hover:bg-accent/20'}`}
        title={playing && !paused ? 'Jeda' : paused ? 'Lanjutkan' : 'Dengarkan'}
      >
        {playing && !paused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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

      {playing && (
        <>
          <div className="flex-1 min-w-0">
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[9px] md:text-[10px] text-tx-muted mt-0.5 truncate">
              {loading ? 'Memuat suara...' : paused ? 'Dijeda' : `Membaca: "${(sentenceList[currentIdx] || '').slice(0, 40)}${(sentenceList[currentIdx] || '').length > 40 ? '...' : ''}"`}
            </p>
          </div>
          <button onClick={handleSkip} className="p-1.5 rounded-full hover:bg-bg-input transition-colors" title="Kalimat berikutnya">
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      {!playing && (
        <span className="text-[10px] md:text-xs text-tx-muted">
          {sentenceList.length} kalimat
        </span>
      )}

      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-1.5 rounded-full hover:bg-bg-input transition-colors ml-auto"
        title="Pengaturan suara"
      >
        <Settings2 className="h-3.5 w-3.5 text-tx-muted" />
      </button>

      {showSettings && (
        <div className="absolute right-0 top-full mt-2 z-50 p-3 rounded-xl bg-bg-card border border-border shadow-xl space-y-3 w-56">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-tx-muted">Suara</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setGender('wanita'); genderRef.current = 'wanita'; saveTTSPrefs({ gender: 'wanita', speed: speedRef.current }); }}
                className={`flex-1 px-2 py-1.5 text-xs rounded-lg font-medium transition-colors ${gender === 'wanita' ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft'}`}
              >
                Wanita
              </button>
              <button
                onClick={() => { setGender('pria'); genderRef.current = 'pria'; saveTTSPrefs({ gender: 'pria', speed: speedRef.current }); }}
                className={`flex-1 px-2 py-1.5 text-xs rounded-lg font-medium transition-colors ${gender === 'pria' ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft'}`}
              >
                Pria
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-tx-muted">Kecepatan</label>
            <select
              value={speed}
              onChange={e => { const v = Number(e.target.value); setSpeed(v); speedRef.current = v; saveTTSPrefs({ gender: genderRef.current, speed: v }); }}
              className="w-full px-2 py-1.5 text-xs rounded-lg bg-bg-input border border-border [&>option]:bg-bg-card [&>option]:text-tx"
            >
              <option value="0.75">Lambat</option>
              <option value="1">Normal</option>
              <option value="1.25">Cepat</option>
              <option value="1.5">Sangat Cepat</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
