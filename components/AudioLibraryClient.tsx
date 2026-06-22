'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { StoryCover } from '@/components/StoryCover';
import { getGenreGradient } from '@/lib/genre-colors';
import { toggleLike, isLiked as checkLiked, toggleSave, isSaved as checkSaved } from '@/lib/supabase';
import { Play, Pause, SkipForward, SkipBack, Square, Heart, Bookmark, Search, Music, Volume2, X } from 'lucide-react';

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

function splitIntoSentences(text: string): string[] {
  const cleaned = (text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  return sentences.map(s => s.trim()).filter(s => s.length > 2);
}

export default function AudioLibraryClient({ stories }: { stories: AudioStory[] }) {
  const { user, lang } = useStore();
  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');

  // Player state
  const [current, setCurrent] = useState<AudioStory | null>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [totalSentences, setTotalSentences] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sentencesRef = useRef<string[]>([]);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const abortRef = useRef(false);
  const pausedRef = useRef(false);

  const genres = ['All', ...Array.from(new Set(stories.map(s => s.category).filter(Boolean)))] as string[];

  const filtered = stories.filter(s => {
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
      u.onend = () => resolve();
      u.onerror = () => resolve();
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
      setLoading(true);
      const url = await fetchAudio(sentence);
      setLoading(false);
      if (abortRef.current) break;
      if (i + 1 < sentencesRef.current.length) fetchAudio(sentencesRef.current[i + 1]);
      if (url) {
        await new Promise<void>((resolve) => {
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      } else {
        await playWithWebSpeech(sentence);
      }
      while (pausedRef.current && !abortRef.current) {
        await new Promise(r => setTimeout(r, 150));
      }
      if (!abortRef.current && i + 1 < sentencesRef.current.length) {
        await new Promise(r => setTimeout(r, 250));
      }
    }
    setPlaying(false);
    setSentenceIdx(0);
  }, [fetchAudio, playWithWebSpeech]);

  const loadStoryContent = useCallback(async (story: AudioStory) => {
    // Fetch chapters text via API
    try {
      const { getChapters } = await import('@/lib/supabase');
      const chapters = await getChapters(story.id);
      const fullText = (chapters || []).map((c: any) => {
        const raw = typeof c.content === 'string' ? c.content : JSON.stringify(c.content);
        return raw.replace(/<[^>]+>/g, ' ');
      }).join(' ');
      const list = splitIntoSentences(fullText || story.description || story.title);
      sentencesRef.current = list;
      setTotalSentences(list.length);
      return list.length > 0;
    } catch {
      const list = splitIntoSentences(story.description || story.title);
      sentencesRef.current = list;
      setTotalSentences(list.length);
      return list.length > 0;
    }
  }, []);

  const selectAndPlay = useCallback(async (story: AudioStory) => {
    // Stop current
    abortRef.current = true;
    pausedRef.current = false;
    audioRef.current?.pause();
    speechSynthesis.cancel();
    cacheRef.current.clear();

    setCurrent(story);
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
      setTimeout(() => playSequence(0), 100);
    }
  }, [user, loadStoryContent, playSequence]);

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

  const progress = totalSentences > 0 ? Math.round((sentenceIdx / totalSentences) * 100) : 0;

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
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {genres.map(g => (
            <button
              key={g}
              onClick={() => setActiveGenre(g)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeGenre === g ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft hover:bg-bg-soft'}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Story grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-tx-muted">
          <Music className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{lang === 'en' ? 'No stories found' : 'Tidak ada cerita'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {filtered.map(story => {
            const isCurrent = current?.id === story.id;
            return (
              <div
                key={story.id}
                className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer ${isCurrent ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-accent/40'}`}
                onClick={() => selectAndPlay(story)}
              >
                <div className="aspect-[2/3] relative">
                  <StoryCover coverUrl={story.cover_url} title={story.title} category={story.category} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className={`p-3 rounded-full bg-accent text-white shadow-lg transition-all ${isCurrent && playing && !paused ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'}`}>
                      {isCurrent && playing && !paused ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{story.title}</p>
                  <p className="text-[10px] text-tx-muted truncate">{story.profiles?.full_name || story.profiles?.username || 'Anonim'}</p>
                </div>
              </div>
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
            <div className="w-10 h-14 md:w-11 md:h-16 rounded overflow-hidden shrink-0">
              <StoryCover coverUrl={current.cover_url} title={current.title} category={current.category} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium truncate">{current.title}</p>
              <p className="text-[10px] md:text-xs text-tx-muted truncate">
                {loading ? (lang === 'en' ? 'Loading...' : 'Memuat...') : paused ? (lang === 'en' ? 'Paused' : 'Dijeda') : `${sentenceIdx + 1}/${totalSentences}`}
              </p>
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
