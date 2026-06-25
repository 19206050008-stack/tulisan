'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { StoryCover } from '@/components/StoryCover';
import { getGenreGradient } from '@/lib/genre-colors';
import { toggleLike, isLiked as checkLiked, toggleSave, isSaved as checkSaved, getLikedStoryIds } from '@/lib/supabase';
import { loadTTSPrefs, saveTTSPrefs, saveTTSPrefsToDB, loadTTSPrefsFromDB, TTS_VOICES, DEFAULT_VOICE, type TTSGender } from '@/lib/tts-prefs';
import { preprocessTextForTTS } from '@/lib/tts-text-preprocessor';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { Play, Pause, SkipForward, SkipBack, Square, Heart, Bookmark, Search, Music, X, Moon, ChevronRight, ChevronLeft, TrendingUp, Calendar, Flame, Star, LayoutGrid, List as ListIcon, Settings2, Loader2 } from 'lucide-react';

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
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

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
  const [slide, setSlide] = useState(0);
  const [sliderStories, setSliderStories] = useState<AudioStory[]>([]);
  const [gender, setGender] = useState<TTSGender>('wanita');
  const [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState(DEFAULT_VOICE);
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
  const voiceRef = useRef(DEFAULT_VOICE);
  const resolveRef = useRef<(() => void) | null>(null);
  const newScrollRef = useRef<HTMLDivElement>(null);

  // Web Audio graph for the real-time equalizer. Created ONCE on first play
  // (a user gesture) and shared by every AudioVisualizer instance.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Lazily wire up AudioContext -> source -> analyser -> destination.
  // createMediaElementSource can only be called once per <audio> element, so
  // we guard with sourceRef and reuse the same analyser for all visualizers.
  const setupAnalyser = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const actx = audioCtxRef.current;
      if (actx.state === 'suspended') actx.resume();
      if (!sourceRef.current) {
        const src = actx.createMediaElementSource(a);
        const an = actx.createAnalyser();
        an.fftSize = 256;
        an.smoothingTimeConstant = 0.75;
        src.connect(an);
        an.connect(actx.destination);
        sourceRef.current = src;
        setAnalyser(an);
      }
    } catch {
      // Ignore — falls back to animated bars when no analyser is available.
    }
  }, []);

  const scrollNew = (dir: number) => {
    const el = newScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };

  // Pick random stories for the hero slider (client-only to avoid hydration mismatch)
  useEffect(() => {
    if (stories.length === 0) return;
    const shuffled = [...stories].sort(() => Math.random() - 0.5).slice(0, Math.min(6, stories.length));
    setSliderStories(shuffled);
    setSlide(0);
  }, [stories]);

  // Auto-advance the slider
  useEffect(() => {
    if (sliderStories.length <= 1) return;
    const t = setInterval(() => setSlide(s => (s + 1) % sliderStories.length), 6000);
    return () => clearInterval(t);
  }, [sliderStories.length]);

  const nextSlide = () => setSlide(s => (sliderStories.length ? (s + 1) % sliderStories.length : 0));
  const prevSlide = () => setSlide(s => (sliderStories.length ? (s - 1 + sliderStories.length) % sliderStories.length : 0));

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
      try {
        const ids = await getLikedStoryIds(user.id);
        setLikedIds(new Set<string>(ids));
      } catch {}
    })();
  }, [user?.id]);

  // Load saved TTS prefs from DB (synced across devices)
  useEffect(() => {
    if (user?.id) {
      loadTTSPrefsFromDB(user.id).then(p => {
        setGender(p.gender);
        setSpeed(p.speed);
        setVoice(p.voice);
        genderRef.current = p.gender;
        speedRef.current = p.speed;
        voiceRef.current = p.voice;
      });
    } else {
      const p = loadTTSPrefs();
      setGender(p.gender);
      setSpeed(p.speed);
      setVoice(p.voice);
      genderRef.current = p.gender;
      speedRef.current = p.speed;
      voiceRef.current = p.voice;
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
    const sp = voiceRef.current;
    const key = `${sp}_${sentence}`;
    if (cacheRef.current.has(key)) return cacheRef.current.get(key)!;
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence, speaker: sp }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      cacheRef.current.set(key, url);
      return url;
    } catch {
      return null;
    }
  }, []);

  // Play one sentence using the self-hosted neural TTS (Supertonic) via <audio>.
  const playWithServerTTS = useCallback((sentence: string): Promise<void> => {
    return new Promise(async (resolve) => {
      const a = audioRef.current;
      const url = await fetchAudio(sentence);
      if (!url || !a || abortRef.current) { setLoading(false); resolve(); return; }
      const onPlaying = () => { setLoading(false); a.removeEventListener('playing', onPlaying); };
      const done = () => {
        a.removeEventListener('ended', done);
        a.removeEventListener('error', done);
        a.removeEventListener('playing', onPlaying);
        setLoading(false);
        if (resolveRef.current === done) resolveRef.current = null;
        resolve();
      };
      resolveRef.current = done;
      a.addEventListener('playing', onPlaying);
      a.addEventListener('ended', done);
      a.addEventListener('error', done);
      a.src = url;
      a.playbackRate = speedRef.current || 1;
      a.play().catch(() => done());
    });
  }, [fetchAudio]);

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
      // Prefetch next sentence to reduce gaps.
      const next = sentencesRef.current[i + 1];
      if (next) fetchAudio(next);
      await playWithServerTTS(sentence);
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
    if (!abortRef.current && currentIdRef.current) {
      try { localStorage.removeItem(`audio_pos_${currentIdRef.current}`); } catch {}
    }
    setPlaying(false);
    setSentenceIdx(0);
    setCurrentSentence('');
    setCurrentWord('');
  }, [playWithServerTTS, fetchAudio]);

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
    resolveRef.current?.();
    audioRef.current?.pause();
    cacheRef.current.clear();

    // Set up the shared Web Audio analyser on this user gesture.
    setupAnalyser();

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
      // Prefetch the first two sentences in parallel to cut the initial gap.
      // playSequence keeps `loading` true until the first audio actually plays.
      const s0 = sentencesRef.current[startAt];
      const s1 = sentencesRef.current[startAt + 1];
      if (s0) fetchAudio(s0);
      if (s1) fetchAudio(s1);
      playSequence(startAt);
    } else {
      setLoading(false);
    }
  }, [user, loadStoryContent, playSequence, setupAnalyser, fetchAudio]);

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
    setupAnalyser();
    if (playing && !paused) {
      pausedRef.current = true;
      setPaused(true);
      audioRef.current?.pause();
    } else if (playing && paused) {
      pausedRef.current = false;
      setPaused(false);
      audioRef.current?.play().catch(() => {});
    } else if (current) {
      setPaused(false);
      pausedRef.current = false;
      setLoading(true);
      playSequence(sentenceIdx);
    }
  };

  const stopPlayback = () => {
    abortRef.current = true;
    pausedRef.current = false;
    resolveRef.current?.();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.removeAttribute('src'); }
    setPlaying(false);
    setPaused(false);
    setCurrent(null);
    setSentenceIdx(0);
    setCurrentSentence('');
    setCurrentWord('');
  };

  const skipSentence = (dir: number) => {
    if (!current) return;
    abortRef.current = true;
    resolveRef.current?.();
    audioRef.current?.pause();
    const next = Math.max(0, Math.min(sentenceIdx + dir, sentencesRef.current.length - 1));
    setSentenceIdx(next);
    // Let the old loop break first, then start fresh from the new index.
    setTimeout(() => playSequence(next), 0);
  };

  const handleLike = async () => {
    if (!user?.id || !current) return;
    const result = await toggleLike(user.id, current.id);
    setLiked(result);
    setLikedIds(prev => { const n = new Set(prev); if (result) n.add(current.id); else n.delete(current.id); return n; });
  };

  const handleSave = async () => {
    if (!user?.id || !current) return;
    const result = await toggleSave(user.id, current.id);
    setSaved(result);
    setSavedIds(prev => { const n = new Set(prev); if (result) n.add(current.id); else n.delete(current.id); return n; });
  };

  useEffect(() => {
    // Warm up the TTS server early (wakes a sleeping Railway container) so the
    // first "Play" doesn't pay the cold-start cost.
    fetch('/api/tts', { method: 'GET', cache: 'no-store' }).catch(() => {});
    return () => {
      abortRef.current = true;
      resolveRef.current?.();
      audioRef.current?.pause();
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      sourceRef.current = null;
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
          resolveRef.current?.();
          audioRef.current?.pause();
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

  // Hero slider current slide
  const heroStory = sliderStories[slide] || null;
  const heroActive = !!heroStory && current?.id === heroStory.id && playing && !paused;
  const heroGrad = heroStory ? getGenreGradient(heroStory.category || '') : '';

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
            <p className="text-sm text-tx-muted">{lang === 'en' ? 'Listen to stories with available voices' : 'Dengarkan cerita dengan suara yang tersedia'}</p>
          </div>
        </div>
      </div>

      {/* Hero slider — random audio, Spotify "This Is..." style */}
      {heroStory && (
        <div className="relative mb-6 rounded-2xl overflow-hidden" style={{ background: heroGrad }}>
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

          {/* Prev / Next buttons — edge-centered */}
          <button onClick={prevSlide} className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur" title="Previous">
            <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
          <button onClick={nextSlide} className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur" title="Next">
            <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>

          <div className="relative flex items-center gap-2.5 md:gap-6 pl-9 pr-11 md:px-12 pt-3 pb-6 md:py-6">
            {/* Cover */}
            <div className="relative w-12 h-12 md:w-32 md:h-32 shrink-0 rounded-lg md:rounded-xl overflow-hidden shadow-2xl">
              <StoryCover coverUrl={heroStory.cover_url} category={heroStory.category} title={heroStory.title} />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1 text-white">
              <p className="text-[8px] md:text-xs font-medium text-white/80 mb-0.5">{lang === 'en' ? 'Random Pick' : 'Pilihan Acak'}</p>
              {/* Title row — mobile shows icon-only play at right */}
              <div className="flex items-center gap-4">
                <h2 className="flex-1 min-w-0 text-sm md:text-4xl font-extrabold font-serif leading-tight line-clamp-2 mb-1 md:mb-2">{heroStory.title}</h2>
                <button onClick={() => selectAndPlay(heroStory)} className="md:hidden shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform" title={heroActive ? 'Pause' : 'Play'}>
                  {heroActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="hidden md:block text-xs md:text-sm text-white/70 line-clamp-2 mb-2">{heroStory.description || (lang === 'en' ? 'Listen to this story now.' : 'Dengarkan cerita ini sekarang.')}</p>
              <div className="flex items-center gap-2 md:gap-3">
                {/* Desktop play button with label */}
                <button onClick={() => selectAndPlay(heroStory)} className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:scale-105 transition-transform shrink-0" title={heroActive ? 'Pause' : 'Play'}>
                  {heroActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {heroActive ? (lang === 'en' ? 'Pause' : 'Jeda') : (lang === 'en' ? 'Play' : 'Putar')}
                </button>
                <span className="text-[8px] md:text-xs text-white/70 truncate">{heroStory.profiles?.full_name || heroStory.profiles?.username || 'Anonim'}{heroStory.category ? ` · ${heroStory.category}` : ''}</span>
              </div>
            </div>
          </div>

          {/* Dots indicator — centered */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {sliderStories.map((_, di) => (
              <button key={di} onClick={() => setSlide(di)} className={`h-1.5 rounded-full transition-all ${di === slide ? 'w-4 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'}`} title={`Slide ${di + 1}`} />
            ))}
          </div>
        </div>
      )}

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
            <span className="text-xs font-bold uppercase tracking-wider text-accent">{lang === 'en' ? 'Voice Settings' : 'Pengaturan Suara'}</span>
            <button onClick={() => setShowVoiceSettings(false)} className="p-1 rounded-full hover:bg-bg-soft">
              <X className="h-3.5 w-3.5 text-tx-muted" />
            </button>
          </div>

          {/* Voice picker (10 suara natural) */}
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-tx-soft">{lang === 'en' ? 'Narrator voice' : 'Suara Narator'}</span>
            {(['wanita', 'pria'] as const).map(g => (
              <div key={g}>
                <p className="text-[10px] uppercase tracking-wide text-tx-muted mb-1">{g === 'wanita' ? 'Wanita' : 'Pria'}</p>
                <div className="grid grid-cols-5 gap-2">
                  {TTS_VOICES.filter(v => v.gender === g).map(v => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setVoice(v.id);
                        voiceRef.current = v.id;
                        setGender(v.gender);
                        genderRef.current = v.gender;
                        const prefs = { gender: v.gender, speed: speedRef.current, voice: v.id };
                        if (user?.id) saveTTSPrefsToDB(user.id, prefs); else saveTTSPrefs(prefs);
                      }}
                      className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${voice === v.id ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft hover:bg-bg-soft'}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Playback speed */}
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-tx-soft">{lang === 'en' ? 'Playback speed' : 'Kecepatan Baca'}</span>
            <div className="grid grid-cols-4 gap-2">
              {[{ v: 0.75, l: '0.75x' }, { v: 1, l: '1x' }, { v: 1.25, l: '1.25x' }, { v: 1.5, l: '1.5x' }].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => {
                    setSpeed(opt.v);
                    speedRef.current = opt.v;
                    if (audioRef.current) audioRef.current.playbackRate = opt.v;
                    const g = TTS_VOICES.find(x => x.id === voiceRef.current)?.gender || 'wanita';
                    const prefs = { gender: g, speed: opt.v, voice: voiceRef.current };
                    if (user?.id) saveTTSPrefsToDB(user.id, prefs); else saveTTSPrefs(prefs);
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
                       analyser={analyser}
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
                          className="rounded-2xl p-3 transition-transform hover:-translate-y-0.5 text-white shrink-0 w-[calc(50%-0.3125rem)] sm:w-[calc(33.333%-0.5rem)] lg:w-auto"
                          style={{ backgroundColor: color }}
                        >
                          {/* Tag (Introducing) */}
                          <p className="text-[8px] lg:text-[9px] font-semibold mb-0.5 lg:mb-1 truncate text-white/70">{story.category || (lang === 'en' ? 'Story' : 'Cerita')}</p>
                          {/* Number (New Recorder) */}
                          <p className="text-xl lg:text-2xl font-extrabold leading-none tracking-tight mb-1 lg:mb-1.5 text-white">#{i + 1}</p>
                          {/* Title (description) */}
                          <p className="text-[10px] lg:text-[11px] font-medium leading-snug line-clamp-2 min-h-[1.7rem] lg:min-h-[1.9rem] text-white">{story.title}</p>
                          {/* Author */}
                          <p className="text-[8px] lg:text-[9px] mt-0.5 mb-2 lg:mb-2.5 truncate text-white/60">{story.profiles?.full_name || story.profiles?.username || 'Anonim'}</p>

                          {/* Waveform box — equalizer on desktop, simple line loader on mobile */}
                          <div className="relative bg-black/25 rounded-lg h-6 lg:h-8 px-1.5 lg:px-2 flex items-center mb-2 lg:mb-2.5 overflow-hidden">
                            {/* Desktop: equalizer */}
                            <div className="hidden lg:block absolute inset-0 px-2 py-1.5">
                              <AudioVisualizer audioElement={null} analyser={analyser} barCount={20} barColor={isActive ? '#ffffff' : '#d1d5db'} barGap={1} active={isActive} />
                            </div>
                            {/* Mobile: line loader */}
                            <div className="lg:hidden relative w-full h-0.5 rounded-full bg-white/25">
                              <div className="absolute inset-y-0 left-0 rounded-full bg-white transition-all duration-300" style={{ width: `${cardProgress}%` }} />
                            </div>
                            {/* Playhead (desktop equalizer) */}
                            <div className="hidden lg:block absolute top-1.5 bottom-1.5 w-0.5 bg-white transition-all duration-300" style={{ left: `${Math.min(cardProgress, 88)}%` }} />
                          </div>

                          {/* Controls — Play, Pause, Stop + Like, Save */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5 lg:gap-1">
                              <button onClick={(e) => { e.stopPropagation(); if (isCurrent && paused) togglePlayPause(); else if (!isCurrent) selectAndPlay(story); }} className="w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors" title="Play">
                                <Play className="h-2.5 w-2.5 lg:h-3 lg:w-3 text-white" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); if (isActive) togglePlayPause(); }} className={`w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-full transition-colors ${isActive ? 'bg-white' : 'bg-white/15 hover:bg-white/25'}`} title="Pause">
                                <Pause className="h-2.5 w-2.5 lg:h-3 lg:w-3" style={{ color: isActive ? color : '#fff' }} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); stopPlayback(); }} className="w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors" title="Stop">
                                <Square className="h-2 w-2 lg:h-2.5 lg:w-2.5 text-white" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 lg:gap-1.5">
                              {user?.id && (
                                <>
                                  <button onClick={async (e) => { e.stopPropagation(); if (!user?.id) return; const r = await toggleLike(user.id, story.id); setLikedIds(prev => { const n = new Set(prev); if (r) n.add(story.id); else n.delete(story.id); return n; }); if (isCurrent) setLiked(r); }} className="text-white/80 hover:text-white transition-colors" title="Like">
                                    <Heart className={`h-3 w-3 lg:h-3.5 lg:w-3.5 ${likedIds.has(story.id) ? 'fill-current' : ''}`} />
                                  </button>
                                  <button onClick={async (e) => { e.stopPropagation(); if (!user?.id) return; const r = await toggleSave(user.id, story.id); setSavedIds(prev => { const n = new Set(prev); if (r) n.add(story.id); else n.delete(story.id); return n; }); if (isCurrent) setSaved(r); }} className="text-white/80 hover:text-white transition-colors" title="Save">
                                    <Bookmark className={`h-3 w-3 lg:h-3.5 lg:w-3.5 ${savedIds.has(story.id) ? 'fill-current' : ''}`} />
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
                              <AudioVisualizer audioElement={null} analyser={analyser} barCount={6} barColor="#E65A28" barGap={1} active={isActive} />
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
                                analyser={analyser}
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

      {/* Now-playing — Spotify-style bottom bar */}
      {current && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg-card/95 backdrop-blur border-t border-border">
          {/* Progress bar on top edge */}
          <div className="h-1 bg-border">
            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="max-w-6xl mx-auto px-3 md:px-4 py-2.5 flex items-center gap-3">
            {/* Left: equalizer + title/author */}
            <div className="h-10 w-10 md:w-11 shrink-0 rounded-md overflow-hidden bg-bg-input/50">
              <AudioVisualizer audioElement={null} analyser={analyser} barCount={6} barColor="#E65A28" barGap={1} active={playing && !paused} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium truncate">{current.title}</p>
              <p className="text-[10px] md:text-xs text-tx-muted truncate">
                {loading ? (lang === 'en' ? 'Preparing voice…' : 'Menyiapkan suara…') : paused ? (lang === 'en' ? 'Paused' : 'Dijeda') : `${sentenceIdx + 1}/${totalSentences}`}
              </p>
              {/* Current sentence with word highlighting */}
              {playing && !paused && currentSentence && currentWord && (
                <p className="hidden md:block text-[10px] text-tx-soft truncate mt-0.5">
                  {currentSentence.split(' ').map((word, idx) => {
                    const isCurrentWord = word.toLowerCase().replace(/[.,!?;:]/g, '') === currentWord.toLowerCase().replace(/[.,!?;:]/g, '');
                    return (
                      <span key={idx} className={isCurrentWord ? 'text-accent font-bold' : ''}>
                        {word}{' '}
                      </span>
                    );
                  })}
                </p>
              )}
            </div>
            {/* Right: controls */}
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              {user?.id && (
                <>
                  <button onClick={handleLike} className={`p-1.5 md:p-2 rounded-full transition-colors ${liked ? 'text-red-500' : 'text-tx-muted hover:text-tx'}`} title="Like">
                    <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                  </button>
                  <button onClick={handleSave} className={`p-1.5 md:p-2 rounded-full transition-colors ${saved ? 'text-accent' : 'text-tx-muted hover:text-tx'}`} title="Save">
                    <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
                  </button>
                </>
              )}
              <button onClick={() => skipSentence(-1)} className="p-1.5 md:p-2 rounded-full hover:bg-bg-soft transition-colors hidden sm:block" title="Previous">
                <SkipBack className="h-4 w-4" />
              </button>
              <button onClick={togglePlayPause} disabled={loading} className="p-2.5 rounded-full bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-70" title={loading ? 'Menyiapkan...' : playing && !paused ? 'Pause' : 'Play'}>
                {loading ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : playing && !paused ? <Pause className="h-4 w-4 md:h-5 md:w-5" /> : <Play className="h-4 w-4 md:h-5 md:w-5" />}
              </button>
              <button onClick={() => skipSentence(1)} className="p-1.5 md:p-2 rounded-full hover:bg-bg-soft transition-colors hidden sm:block" title="Next">
                <SkipForward className="h-4 w-4" />
              </button>
              <div className="relative">
                <button onClick={() => setShowSleep(!showSleep)} className={`p-1.5 md:p-2 rounded-full transition-colors ${sleepRemaining > 0 ? 'text-accent' : 'text-tx-muted hover:text-tx'}`} title="Sleep timer">
                  <Moon className="h-4 w-4" />
                </button>
                {sleepRemaining > 0 && (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-accent text-white rounded-full px-1 leading-tight">{formatSleep(sleepRemaining)}</span>
                )}
                {showSleep && (
                  <div className="absolute bottom-full right-0 mb-2 p-2 rounded-xl bg-bg-card border border-border shadow-xl w-32 space-y-1">
                    <p className="text-[10px] font-medium text-tx-muted px-2 py-1">{lang === 'en' ? 'Sleep timer' : 'Timer tidur'}</p>
                    {[5, 10, 15, 30, 60].map(m => (
                      <button key={m} onClick={() => { startSleepTimer(m); setShowSleep(false); }} className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-bg-soft transition-colors">
                        {m} {lang === 'en' ? 'min' : 'menit'}
                      </button>
                    ))}
                    {sleepRemaining > 0 && (
                      <button onClick={() => { setSleepRemaining(0); setSleepMin(0); setShowSleep(false); }} className="w-full text-left px-2 py-1.5 text-xs rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        {lang === 'en' ? 'Cancel' : 'Batalkan'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button onClick={stopPlayback} className="p-1.5 md:p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Stop">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
