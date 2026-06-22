'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { StoryCover } from '@/components/StoryCover';
import { getGenreGradient } from '@/lib/genre-colors';
import { toggleLike, isLiked as checkLiked, toggleSave, isSaved as checkSaved } from '@/lib/supabase';
import { loadTTSPrefs, saveTTSPrefs, saveTTSPrefsToDB, loadTTSPrefsFromDB, pickVoiceWithPitch, preloadVoices, type TTSGender } from '@/lib/tts-prefs';
import { preprocessTextForTTS, getIntonationForSentence } from '@/lib/tts-text-preprocessor';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { Play, Pause, SkipForward, SkipBack, Square, Heart, Bookmark, Search, Music, X, Moon, ChevronRight, ChevronLeft, TrendingUp, Calendar, Flame, Star, LayoutGrid, List as ListIcon, Settings2 } from 'lucide-react';

interface AudioStory {
  id: string;
  title: string;
  description?: string;
  category?: string;
  cover_url?: string;
  reads_count?: number;
  likes_count?: number;
  profiles?: { username?: string; full_name?: string };
}

export default function AudioLibraryClient({ stories }: { stories: AudioStory[] }) {
  const { user, lang } = useStore();
  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [tab, setTab] = useState<'all' | 'saved'>('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Player state
  const [current, setCurrent] = useState<AudioStory | null>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [totalSentences, setTotalSentences] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sleepMin, setSleepMin] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const [showSleep, setShowSleep] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [gender, setGender] = useState<TTSGender>('wanita');
  const [speed, setSpeed] = useState(1);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [currentSentence, setCurrentSentence] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sentencesRef = useRef<string[]>([]);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const abortRef = useRef(false);
  const pausedRef = useRef(false);
  const currentIdRef = useRef<string | null>(null);
  const genderRef = useRef<TTSGender>('wanita');
  const speedRef = useRef(1);
  const newScrollRef = useRef<HTMLDivElement>(null);

  const scrollNew = (dir: number) => {
    const el = newScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };

  // Load saved story ids for "Saved" tab
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { getSavedStories } = await import('@/lib/supabase');
        const data = await getSavedStories(user.id);
        const ids = new Set<string>((data || []).map((s: any) => s.story_id || s.id || s.stories?.id).filter(Boolean));
        setSavedIds(ids);
      } catch {}
    })();
  }, [user?.id]);

  // Load saved TTS prefs from DB (synced across devices) and preload voices
  useEffect(() => {
    preloadVoices();
    if (user?.id) {
      loadTTSPrefsFromDB(user.id).then(p => {
        setGender(p.gender);
        setSpeed(p.speed);
        genderRef.current = p.gender;
        speedRef.current = p.speed;
      });
    } else {
      const p = loadTTSPrefs();
      setGender(p.gender);
      setSpeed(p.speed);
      genderRef.current = p.gender;
      speedRef.current = p.speed;
    }
  }, [user?.id]);

  const genres = ['All', ...Array.from(new Set(stories.map(s => s.category).filter(Boolean)))] as string[];

  const filtered = stories.filter(s => {
    if (tab === 'saved' && !savedIds.has(s.id)) return false;
    if (activeGenre !== 'All' && s.category !== activeGenre) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.title.toLowerCase().includes(q) ||
        (s.profiles?.full_name || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q);
    }
    return true;
  });

  const fetchAudio = useCallback(async (sentence: string): Promise<string | null> => {
    const key = `${lang}_${sentence}`;
    if (cacheRef.current.has(key)) return cacheRef.current.get(key)!;
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence, lang }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      cacheRef.current.set(key, url);
      return url;
    } catch {
      return null;
    }
  }, [lang]);

  const playWithWebSpeech = useCallback((sentence: string): Promise<void> => {
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(sentence);
      u.lang = lang === 'id' ? 'id-ID' : 'en-US';
      
      // Get base voice and pitch from gender preference
      const { voice, pitch: basePitch } = pickVoiceWithPitch(genderRef.current, lang as 'id' | 'en');
      if (voice) u.voice = voice;
      
      // Apply intonation based on sentence punctuation
      const intonation = getIntonationForSentence(sentence);
      u.pitch = basePitch * intonation.pitch;
      u.rate = speedRef.current * intonation.rate;
      
      // Word boundary event for highlighting
      u.onboundary = (event) => {
        if (event.name === 'word') {
          const word = sentence.substr(event.charIndex, event.charLength);
          setCurrentWord(word);
        }
      };
      
      u.onend = () => {
        setCurrentWord('');
        resolve();
      };
      u.onerror = () => {
        setCurrentWord('');
        resolve();
      };
      speechSynthesis.speak(u);
    });
  }, [lang]);

  const playSequence = useCallback(async (startIdx: number) => {
    abortRef.current = false;
    setPlaying(true);
    for (let i = startIdx; i < sentencesRef.current.length; i++) {
      if (abortRef.current) break;
      setSentenceIdx(i);
      const sentence = sentencesRef.current[i];
      setCurrentSentence(sentence);
      if (currentIdRef.current) {
        try { localStorage.setItem(`audio_pos_${currentIdRef.current}`, String(i)); } catch {}
      }
      await playWithWebSpeech(sentence);
      while (pausedRef.current && !abortRef.current) {
        await new Promise(r => setTimeout(r, 150));
      }
      if (!abortRef.current && i + 1 < sentencesRef.current.length) {
        await new Promise(r => setTimeout(r, 250));
      }
    }
    if (!abortRef.current && currentIdRef.current) {
      try { localStorage.removeItem(`audio_pos_${currentIdRef.current}`); } catch {}
    }
    setPlaying(false);
    setSentenceIdx(0);
    setCurrentSentence('');
    setCurrentWord('');
  }, [playWithWebSpeech]);

  const loadStoryContent = useCallback(async (story: AudioStory) => {
    // Fetch chapters text via API
    try {
      const { getChapters } = await import('@/lib/supabase');
      const chapters = await getChapters(story.id);
      const fullText = (chapters || []).map((c: any) => {
        const raw = typeof c.content === 'string' ? c.content : JSON.stringify(c.content);
        return raw.replace(/<[^>]+>/g, ' ');
      }).join(' ');
      // Use preprocessor: normalizes numbers, abbreviations, and splits into sentences
      const list = preprocessTextForTTS(fullText || story.description || story.title);
      sentencesRef.current = list;
      setTotalSentences(list.length);
      return list.length > 0;
    } catch {
      const list = preprocessTextForTTS(story.description || story.title);
      sentencesRef.current = list;
      setTotalSentences(list.length);
      return list.length > 0;
    }
  }, []);

  const startPlayback = useCallback(async (story: AudioStory) => {
    // Stop current
    abortRef.current = true;
    pausedRef.current = false;
    audioRef.current?.pause();
    speechSynthesis.cancel();
    cacheRef.current.clear();

    setCurrent(story);
    currentIdRef.current = story.id;
    setPaused(false);
    setSentenceIdx(0);
    setLoading(true);

    // Check like/save status
    if (user?.id) {
      checkLiked(user.id, story.id).then(setLiked).catch(() => setLiked(false));
      checkSaved(user.id, story.id).then(setSaved).catch(() => setSaved(false));
    }

    const ok = await loadStoryContent(story);
    setLoading(false);
    if (ok) {
      // Resume from saved position if available
      let startAt = 0;
      try {
        const saved = localStorage.getItem(`audio_pos_${story.id}`);
        if (saved) {
          const idx = parseInt(saved, 10);
          if (!isNaN(idx) && idx > 0 && idx < sentencesRef.current.length) startAt = idx;
        }
      } catch {}
      setSentenceIdx(startAt);
      playSequence(startAt);
    }
  }, [user, loadStoryContent, playSequence]);

  // Direct play: click = play immediately. If same story playing, toggle pause.
  const selectAndPlay = useCallback((story: AudioStory) => {
    if (current?.id === story.id && playing) {
      togglePlayPause();
      return;
    }
    startPlayback(story);
  }, [current?.id, playing, startPlayback]);

  const togglePlayPause = () => {
    if (!current) return;
    if (playing && !paused) {
      pausedRef.current = true;
      setPaused(true);
      audioRef.current?.pause();
      speechSynthesis.pause();
    } else if (playing && paused) {
      pausedRef.current = false;
      setPaused(false);
      audioRef.current?.play().catch(() => {});
      speechSynthesis.resume();
    } else if (current) {
      setPaused(false);
      pausedRef.current = false;
      playSequence(sentenceIdx);
    }
  };

  const stopPlayback = () => {
    abortRef.current = true;
    pausedRef.current = false;
    audioRef.current?.pause();
    speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    setCurrent(null);
    setSentenceIdx(0);
    setCurrentSentence('');
    setCurrentWord('');
  };

  const skipSentence = (dir: number) => {
    if (!current) return;
    audioRef.current?.pause();
    speechSynthesis.cancel();
    const next = Math.max(0, Math.min(sentenceIdx + dir, sentencesRef.current.length - 1));
    setSentenceIdx(next);
    playSequence(next);
  };

  const handleLike = async () => {
    if (!user?.id || !current) return;
    const result = await toggleLike(user.id, current.id);
    setLiked(result);
  };

  const handleSave = async () => {
    if (!user?.id || !current) return;
    const result = await toggleSave(user.id, current.id);
    setSaved(result);
  };

  useEffect(() => {
    return () => {
      abortRef.current = true;
      audioRef.current?.pause();
      speechSynthesis.cancel();
    };
  }, []);

  // Sleep timer countdown
  useEffect(() => {
    if (sleepRemaining <= 0) return;
    const t = setInterval(() => {
      setSleepRemaining(prev => {
        if (prev <= 1) {
          // Time's up — stop playback
          abortRef.current = true;
          pausedRef.current = false;
          audioRef.current?.pause();
          speechSynthesis.cancel();
          setPlaying(false);
          setPaused(false);
          setCurrentSentence('');
          setCurrentWord('');
          setSleepMin(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [sleepRemaining]);

  const startSleepTimer = (minutes: number) => {
    setSleepMin(minutes);
    setSleepRemaining(minutes * 60);
  };

  const formatSleep = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = totalSentences > 0 ? Math.round((sentenceIdx / totalSentences) * 100) : 0;

  // Build SoundCloud-style sections (5 items each). Derived from available metrics.
  const base = tab === 'saved' ? stories.filter(s => savedIds.has(s.id)) : stories;
  const searched = base.filter(s => {
    if (activeGenre !== 'All' && s.category !== activeGenre) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.title.toLowerCase().includes(q) ||
        (s.profiles?.full_name || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q);
    }
    return true;
  });

  const byReads = [...searched].sort((a, b) => (b.reads_count || 0) - (a.reads_count || 0));
  const byLikes = [...searched].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
  const byNewest = [...searched].sort((a, b) => String(b.id).localeCompare(String(a.id)));
  const byScore = [...searched].sort((a, b) => ((b.reads_count || 0) + (b.likes_count || 0) * 2) - ((a.reads_count || 0) + (a.likes_count || 0) * 2));

  const isSearching = search.trim().length > 0 || activeGenre !== 'All' || tab === 'saved';

  const sections = [
    { key: 'new', title: lang === 'en' ? 'New Audio Release' : 'Rilis Audio Terbaru', icon: Music, items: byNewest.slice(0, 5) },
    { key: 'picks', title: lang === 'en' ? "Listener's Picks" : 'Pilihan Pendengar', icon: Star, items: byLikes.slice(0, 5) },
    { key: 'monthly', title: lang === 'en' ? 'Top This Month' : 'Pilihan Bulan Ini', icon: Calendar, items: byScore.slice(0, 5) },
    { key: 'weekly', title: lang === 'en' ? 'Top This Week' : 'Pilihan Minggu Ini', icon: TrendingUp, items: byNewest.slice(0, 5) },
    { key: 'most', title: lang === 'en' ? 'Most Listened' : 'Paling Banyak Didengar', icon: Flame, items: byReads.slice(0, 5) },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-32">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-accent/10">
            <Music className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-serif">Audio Cerita</h1>
            <p className="text-sm text-tx-muted">{lang === 'en' ? 'Listen to stories narrated by AI' : 'Dengarkan cerita dengan narasi AI'}</p>
          </div>
        </div>
      </div>

      {/* Search + genre filter */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={lang === 'en' ? 'Search stories...' : 'Cari cerita...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-bg-input rounded-xl text-sm focus:outline-none border border-border focus:border-accent"
          />
        </div>
        {user?.id && (
          <div className="flex gap-2">
            <button
              onClick={() => setTab('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${tab === 'all' ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft hover:bg-bg-soft'}`}
            >
              {lang === 'en' ? 'All' : 'Semua'}
            </button>
            <button
              onClick={() => setTab('saved')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${tab === 'saved' ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft hover:bg-bg-soft'}`}
            >
              <Bookmark className="h-3 w-3" /> {lang === 'en' ? 'Saved' : 'Tersimpan'}
            </button>
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${showVoiceSettings ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft hover:bg-bg-soft'}`}
              title={lang === 'en' ? 'Voice Settings' : 'Pengaturan Suara'}
            >
              <Settings2 className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <select
            value={activeGenre}
            onChange={e => setActiveGenre(e.target.value)}
            className="flex-1 px-3 py-2 text-xs rounded-xl bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx"
          >
            {genres.map(g => (
              <option key={g} value={g}>{g === 'All' ? (lang === 'en' ? 'All Genres' : 'Semua Genre') : g}</option>
            ))}
          </select>
          <div className="flex rounded-xl border border-border overflow-hidden shrink-0">
            <button
              onClick={() => setView('grid')}
              className={`p-2 transition-colors ${view === 'grid' ? 'bg-accent text-white' : 'bg-bg-input text-tx-muted hover:text-tx'}`}
              title="Grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 transition-colors ${view === 'list' ? 'bg-accent text-white' : 'bg-bg-input text-tx-muted hover:text-tx'}`}
              title="List"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Speed settings popup */}
      {showVoiceSettings && (
        <div className="mb-4 p-3 md:p-4 rounded-2xl bg-bg-card border border-border shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">{lang === 'en' ? 'Playback Speed' : 'Kecepatan Baca'}</span>
            <button onClick={() => setShowVoiceSettings(false)} className="p-1 rounded-full hover:bg-bg-soft">
              <X className="h-3.5 w-3.5 text-tx-muted" />
            </button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {[{ v: 0.75, l: '0.75x' }, { v: 1, l: '1x' }, { v: 1.25, l: '1.25x' }, { v: 1.5, l: '1.5x' }].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => {
                    setSpeed(opt.v);
                    speedRef.current = opt.v;
                    if (user?.id) saveTTSPrefsToDB(user.id, { gender: 'wanita', speed: opt.v });
                    else saveTTSPrefs({ gender: 'wanita', speed: opt.v });
                  }}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${speed === opt.v ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft hover:bg-bg-soft'}`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[9px] text-tx-muted">
            {lang === 'en'
              ? 'Settings sync across all your devices.'
              : 'Setting tersimpan di semua perangkat.'}
          </p>
        </div>
      )}

      {/* Sections (SoundCloud-style) */}
      {searched.length === 0 ? (
        <div className="text-center py-16 text-tx-muted">
          <Music className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{lang === 'en' ? 'No stories found' : 'Tidak ada cerita'}</p>
        </div>
      ) : isSearching ? (
        <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
          {searched.map((story, i) => {
            const isCurrent = current?.id === story.id;
            const isActive = isCurrent && playing && !paused;
            return (
               <button
                 key={story.id}
                 onClick={() => selectAndPlay(story)}
                 className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isCurrent ? 'bg-accent/5' : 'hover:bg-bg-soft'}`}
               >
                 <span className="w-5 text-center text-xs text-tx-muted shrink-0">{i + 1}</span>
                 <div className="flex-1 min-w-0">
                   <span className="block text-sm font-medium truncate">{story.title}</span>
                   <span className="block text-[11px] text-tx-muted truncate">{story.profiles?.full_name || story.profiles?.username || 'Anonim'}{story.category ? ` · ${story.category}` : ''}</span>
                 </div>
                 {/* Equalizer - right side, no border */}
                 {isCurrent && isActive && (
                   <div className="shrink-0 ml-auto overflow-hidden" style={{ width: '40px', height: '20px' }}>
                     <AudioVisualizer
                       audioElement={null}
                       barCount={6}
                       barColor="#E65A28"
                       barGap={1}
                       active={isActive}
                     />
                   </div>
                 )}
               </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map(sec => {
            const SecIcon = sec.icon;
            if (sec.items.length === 0) return null;
            return (
              <section key={sec.key} className="rounded-2xl border border-border bg-bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 rounded-lg bg-accent/10 text-accent shrink-0"><SecIcon className="h-4 w-4" /></span>
                    <h2 className="text-sm md:text-base font-bold font-serif truncate">{sec.title}</h2>
                  </div>
                  <Link href="/browse" className="text-[10px] md:text-xs font-medium text-tx-muted hover:text-accent flex items-center shrink-0">
                    {lang === 'en' ? 'More' : 'Lainnya'} <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                {sec.key === 'new' && view === 'grid' ? (
                  <div className="relative">
                  <div ref={newScrollRef} className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:mx-0 lg:px-0">
                    {sec.items.map((story, i) => {
                      const isCurrent = current?.id === story.id;
                      const isActive = isCurrent && playing && !paused;
                      const cardProgress = isCurrent ? progress : 0;
                      const palette = ['#E65A28', '#2563EB', '#059669', '#7C3AED', '#DB2777'];
                      const color = palette[i % palette.length];
                      return (
                        <div
                          key={story.id}
                          className="rounded-2xl p-3 transition-transform hover:-translate-y-0.5 text-white shrink-0 w-[52%] sm:w-[40%] lg:w-auto"
                          style={{ backgroundColor: color }}
                        >
                          {/* Tag (Introducing) */}
                          <p className="text-[9px] font-semibold mb-1 truncate text-white/70">{story.category || (lang === 'en' ? 'Story' : 'Cerita')}</p>
                          {/* Number (New Recorder) */}
                          <p className="text-2xl font-extrabold leading-none tracking-tight mb-1.5 text-white">#{i + 1}</p>
                          {/* Title (description) */}
                          <p className="text-[11px] font-medium leading-snug line-clamp-2 min-h-[1.9rem] text-white">{story.title}</p>
                          {/* Author */}
                          <p className="text-[9px] mt-0.5 mb-2.5 truncate text-white/60">{story.profiles?.full_name || story.profiles?.username || 'Anonim'}</p>

                          {/* Waveform box — same AudioVisualizer equalizer as elsewhere */}
                          <div className="relative bg-black/25 rounded-lg h-8 px-2 flex items-center mb-2.5 overflow-hidden">
                            <div className="absolute inset-0 px-2 py-1.5">
                              <AudioVisualizer audioElement={null} barCount={20} barColor={isActive ? '#ffffff' : '#d1d5db'} barGap={1} active={isActive} />
                            </div>
                            <div className="absolute top-1.5 bottom-1.5 w-0.5 bg-white transition-all duration-300" style={{ left: `${Math.min(cardProgress, 88)}%` }} />
                          </div>

                          {/* Controls — Play, Pause, Stop + Like, Save */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); if (isCurrent && paused) togglePlayPause(); else if (!isCurrent) selectAndPlay(story); }} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors" title="Play">
                                <Play className="h-3 w-3 text-white" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); if (isActive) togglePlayPause(); }} className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${isActive ? 'bg-white' : 'bg-white/15 hover:bg-white/25'}`} title="Pause">
                                <Pause className="h-3 w-3" style={{ color: isActive ? color : '#fff' }} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); stopPlayback(); }} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors" title="Stop">
                                <Square className="h-2.5 w-2.5 text-white" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {user?.id && (
                                <>
                                  <button onClick={async (e) => { e.stopPropagation(); if (!user?.id) return; const r = await toggleLike(user.id, story.id); if (isCurrent) setLiked(r); }} className="text-white/80 hover:text-white transition-colors" title="Like">
                                    <Heart className={`h-3.5 w-3.5 ${isCurrent && liked ? 'fill-current' : ''}`} />
                                  </button>
                                  <button onClick={async (e) => { e.stopPropagation(); if (!user?.id) return; const r = await toggleSave(user.id, story.id); if (isCurrent) setSaved(r); }} className="text-white/80 hover:text-white transition-colors" title="Save">
                                    <Bookmark className={`h-3.5 w-3.5 ${isCurrent && saved ? 'fill-current' : ''}`} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Scroll buttons — mobile only */}
                  <button onClick={() => scrollNew(-1)} className="lg:hidden absolute left-0 top-1/2 -translate-y-1/2 -ml-1 w-8 h-8 flex items-center justify-center rounded-full bg-bg-card border border-border shadow-md text-tx" title="Scroll left">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => scrollNew(1)} className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 -mr-1 w-8 h-8 flex items-center justify-center rounded-full bg-bg-card border border-border shadow-md text-tx" title="Scroll right">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  </div>
                ) : view === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sec.items.map((story, i) => {
                      const isCurrent = current?.id === story.id;
                      const isActive = isCurrent && playing && !paused;
                      return (
                        <button
                          key={story.id}
                          onClick={() => selectAndPlay(story)}
                          className={`relative flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors overflow-hidden ${isCurrent ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40 hover:bg-bg-soft'}`}
                        >
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-accent text-white' : 'bg-accent/10 text-accent'}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">{story.title}</span>
                            <span className="block text-[11px] text-tx-muted truncate">{story.profiles?.full_name || story.profiles?.username || 'Anonim'}</span>
                          </div>
                          {isCurrent && isActive && (
                            <div className="shrink-0 ml-auto overflow-hidden" style={{ width: '40px', height: '20px' }}>
                              <AudioVisualizer audioElement={null} barCount={6} barColor="#E65A28" barGap={1} active={isActive} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {sec.items.map((story, i) => {
                      const isCurrent = current?.id === story.id;
                      const isActive = isCurrent && playing && !paused;
                      return (
                        <button
                          key={story.id}
                          onClick={() => selectAndPlay(story)}
                          className={`w-full flex items-center gap-3 px-1 py-2 text-left transition-colors rounded-lg ${isCurrent ? 'bg-accent/5' : 'hover:bg-bg-soft'}`}
                        >
                          <span className="w-5 text-center text-xs font-bold text-tx-muted shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">{story.title}</span>
                            <span className="block text-[11px] text-tx-muted truncate">{story.profiles?.full_name || story.profiles?.username || 'Anonim'}</span>
                          </div>
                          {/* Equalizer - right side, no border */}
                          {isCurrent && isActive && (
                            <div className="shrink-0 ml-auto overflow-hidden" style={{ width: '40px', height: '20px' }}>
                              <AudioVisualizer
                                audioElement={null}
                                barCount={6}
                                barColor="#E65A28"
                                barGap={1}
                                active={isActive}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Now-playing — floating recorder card */}
      {current && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md md:max-w-lg">
          <div className="rounded-2xl bg-bg-card border border-border shadow-2xl p-4 md:p-5 space-y-3">
            {/* Title + author */}
            <div className="min-w-0">
              <p className="text-sm md:text-base font-bold font-serif truncate">{current.title}</p>
              <p className="text-[11px] md:text-xs text-tx-muted truncate">
                {current.profiles?.full_name || current.profiles?.username || 'Anonim'}
                {loading ? ` · ${lang === 'en' ? 'Loading...' : 'Memuat...'}` : ''}
              </p>
            </div>

            {/* Sentence progress counter */}
            <div className="flex justify-center">
              <span className="text-[11px] md:text-xs font-mono text-accent">{sentenceIdx + 1}/{totalSentences}</span>
            </div>

            {/* Waveform bar */}
            <div className="relative h-10 md:h-12 rounded-xl bg-bg-input overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-accent/8 transition-all duration-300" style={{ width: `${progress}%` }} />
              <div className="absolute inset-0">
                <AudioVisualizer audioElement={null} barCount={32} barColor="#E65A28" barGap={2} active={playing && !paused} />
              </div>
              <div className="absolute top-0 bottom-0 w-0.5 bg-accent transition-all duration-300" style={{ left: `${progress}%` }} />
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between">
              {/* Left: Play, Pause, Stop */}
              <div className="flex items-center gap-1.5">
                <button onClick={() => { if (!playing) { pausedRef.current = false; setPaused(false); playSequence(sentenceIdx); } }} className="p-2 rounded-full bg-bg-input border border-border hover:border-accent/40 transition-colors" title="Play">
                  <Play className="h-4 w-4" />
                </button>
                <button onClick={togglePlayPause} className="p-2.5 rounded-full bg-accent text-white hover:opacity-90 transition-opacity" title={playing && !paused ? 'Pause' : 'Resume'}>
                  {playing && !paused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button onClick={stopPlayback} className="p-2 rounded-full bg-bg-input border border-border hover:border-red-400 transition-colors" title="Stop">
                  <Square className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Right: Skip, Like, Save */}
              <div className="flex items-center gap-1">
                <button onClick={() => skipSentence(-1)} className="p-1.5 rounded-full hover:bg-bg-soft transition-colors" title="Previous">
                  <SkipBack className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => skipSentence(1)} className="p-1.5 rounded-full hover:bg-bg-soft transition-colors" title="Next">
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
                {user?.id && (
                  <button onClick={handleSave} className={`p-1.5 rounded-full transition-colors ${saved ? 'text-accent' : 'text-tx-muted hover:text-tx'}`} title="Save">
                    <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
                  </button>
                )}
                <button onClick={stopPlayback} className="p-1.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
