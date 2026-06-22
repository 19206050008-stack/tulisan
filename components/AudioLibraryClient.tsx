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
import { Play, Pause, SkipForward, SkipBack, Square, Heart, Bookmark, Search, Music, X, Moon, ChevronRight, TrendingUp, Calendar, Flame, Star, LayoutGrid, List as ListIcon, Settings2 } from 'lucide-react';

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
                 {/* Equalizer - side by side */}
                 {isCurrent && isActive && (
                   <div className="shrink-0 rounded-md overflow-hidden" style={{ width: '48px', height: '24px' }}>
                     <AudioVisualizer
                       audioElement={null}
                       barCount={8}
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
                {view === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sec.items.map((story, i) => {
                      const isCurrent = current?.id === story.id;
                      const isActive = isCurrent && playing && !paused;
                      return (
                        <button
                          key={story.id}
                          onClick={() => selectAndPlay(story)}
                           className={`relative flex p-2.5 rounded-xl border text-left transition-colors overflow-hidden ${isCurrent ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40 hover:bg-bg-soft'}`}
                         >
                           <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${isActive ? 'bg-accent text-white' : 'bg-accent/10 text-accent'}`}>
                             {i + 1}
                           </span>
                           <div className="flex-1 min-w-0">
                             <span className="block text-sm font-medium truncate">{story.title}</span>
                             <span className="block text-[11px] text-tx-muted truncate">{story.profiles?.full_name || story.profiles?.username || 'Anonim'}</span>
                           </div>
                           {/* Equalizer - side by side with title */}
                           {isCurrent && isActive && (
                             <div className="shrink-0 rounded-md overflow-hidden" style={{ width: '48px', height: '24px' }}>
                               <AudioVisualizer
                                 audioElement={null}
                                 barCount={8}
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
                          {/* Equalizer - side by side */}
                          {isCurrent && isActive && (
                            <div className="shrink-0 rounded-md overflow-hidden" style={{ width: '48px', height: '24px' }}>
                              <AudioVisualizer
                                audioElement={null}
                                barCount={8}
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

      {/* Sticky now-playing bar */}
      {current && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg-card/95 backdrop-blur border-t border-border">
          <div className="h-1 bg-border">
            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="max-w-6xl mx-auto px-3 md:px-4 py-2.5 flex items-center gap-3">
            <div className="h-10 w-10 md:w-11 shrink-0 rounded-md overflow-hidden bg-bg-input/50">
              <AudioVisualizer
                audioElement={null}
                barCount={6}
                barColor="#E65A28"
                barGap={1}
                active={playing && !paused}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium truncate">{current.title}</p>
              <p className="text-[10px] md:text-xs text-tx-muted truncate">
                {loading ? (lang === 'en' ? 'Loading...' : 'Memuat...') : paused ? (lang === 'en' ? 'Paused' : 'Dijeda') : `${sentenceIdx + 1}/${totalSentences}`}
              </p>
              {/* Current sentence with word highlighting */}
              {playing && !paused && currentSentence && currentWord && (
                <p className="text-[10px] md:text-xs text-tx-soft truncate mt-0.5">
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
              <button onClick={togglePlayPause} className="p-2.5 rounded-full bg-accent text-white hover:opacity-90 transition-opacity">
                {playing && !paused ? <Pause className="h-4 w-4 md:h-5 md:w-5" /> : <Play className="h-4 w-4 md:h-5 md:w-5" />}
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

    </div>
  );
}
