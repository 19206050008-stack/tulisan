'use client';

import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { LayoutGrid, List, Eye, Heart, ChevronRight, ChevronLeft, Award, TrendingUp, CheckCircle, Star } from 'lucide-react';
import { getStoriesByCategory } from '@/lib/supabase';
import { StoryCover } from '@/components/StoryCover';
import { GenreFilter } from '@/components/GenreFilter';
import { translations } from '@/lib/i18n';
import { getTierDisplayName } from '@/lib/tier-utils';

// Lazy load below-fold components
const RecentComments = lazy(() => import('@/components/RecentComments').then(m => ({ default: m.RecentComments })));

// Lazy load HeroSlider
const HeroSlider = dynamic(
  () => import('@/components/HeroSlider').then(m => ({ default: m.HeroSlider })),
  {
    loading: () => (
      <div className="rounded-2xl bg-gray-200 dark:bg-gray-800 h-44 md:h-56 animate-pulse" />
    ),
  }
);

interface HomePageClientProps {
  stories: any[];
  categoryNames: string[];
  editorialPicks: any[];
  topMonthly: any[];
  completedStories: any[];
  randomGenres: string[];
}

const formatCount = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
};

export default function HomePageClient({ stories, categoryNames, editorialPicks, topMonthly, completedStories, randomGenres }: HomePageClientProps) {
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const lang = useStore((s) => s.lang);
  const t = translations[lang].home;

  const [activeCategory, setActiveCategory] = useState('All');

  const topStories = [...stories].sort((a, b) => (b.reads_count || 0) - (a.reads_count || 0)).slice(0, 10);
  const filteredStories = (activeCategory === 'All' || activeCategory === t.all) ? stories : stories.filter(s => s.category === activeCategory);

  return (
    <div className="space-y-8">
      <HeroSlider />

      {/* Editorial Picks */}
      {editorialPicks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-serif">{t.editorialPicks}</h2>
              <p className="text-xs text-tx-muted">{t.editorialDesc}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {editorialPicks.map(story => (
              <Link key={story.id} href={`/story/${story.id}`} className="group flex gap-4 p-4 rounded-xl border border-border bg-bg-card hover:border-accent/40 hover:shadow-md transition-all">
                <div className="w-20 h-28 md:w-24 md:h-32 rounded-lg overflow-hidden shrink-0 relative">
                  <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} className="transition-transform group-hover:scale-105" />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-accent text-white text-[8px] font-bold flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5" /> {t.editorialBadge}
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-bold text-sm md:text-base group-hover:text-accent transition-colors line-clamp-2">{story.title}</h3>
                  <p className="text-xs text-tx-soft mt-1">{story.profiles?.full_name || 'Anonymous'}</p>
                  <p className="text-xs text-tx-muted mt-1.5 line-clamp-2 hidden sm:block">{story.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-tx-muted font-medium">
                    <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatCount(story.reads_count || 0)}</span>
                    <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatCount(story.likes_count || 0)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-bg-input text-tx-soft">{story.category}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <GenreFilter categories={categoryNames} active={activeCategory} onChange={setActiveCategory} visibleCount={5} />

      {activeCategory === t.all || activeCategory === 'All' ? (
        <>
          {/* Top Monthly */}
          {topMonthly.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                <div>
                  <h2 className="text-xl md:text-2xl font-bold font-serif">{t.topMonthly}</h2>
                  <p className="text-xs text-tx-muted">{t.topMonthlyDesc}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {topMonthly.slice(0, 10).map((story, i) => (
                  <Link key={story.id} href={`/story/${story.id}`} className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-bg-card hover:border-accent/30 transition-colors">
                    <span className={`text-lg font-black w-7 text-center shrink-0 ${i < 3 ? 'text-accent' : 'text-tx-muted'}`}>{String(i + 1).padStart(2, '0')}</span>
                    <div className="w-10 h-14 rounded-md overflow-hidden shrink-0 relative">
                      <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate group-hover:text-accent transition-colors">{story.title}</h3>
                      <p className="text-[10px] text-tx-soft">{story.profiles?.full_name || 'Anonymous'}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-tx-muted">
                        <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatCount(story.reads_count || 0)}</span>
                        <span className="px-1.5 py-0.5 rounded bg-bg-input">{story.category}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="text-center pt-2">
                <Link href="/browse" className="text-sm text-accent hover:underline">{t.seeAll} →</Link>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold font-serif">{t.topStories}</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-accent/10 text-accent' : 'hover:bg-bg-soft'}`}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-accent/10 text-accent' : 'hover:bg-bg-soft'}`}>
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5" : "flex flex-col gap-3"}>
              {topStories.map(story => (
                <StoryCard key={story.id} story={story} viewMode={viewMode} />
              ))}
            </div>

            <div className="text-center pt-2">
              <Link href="/browse" className="text-sm text-accent hover:underline">{t.seeAll} →</Link>
            </div>
          </section>

          {randomGenres.map(genre => (
            <GenreCarousel key={genre} genre={genre} seeAll={t.seeAll} />
          ))}
        </>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold font-serif">{activeCategory}</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-accent/10 text-accent' : 'hover:bg-bg-soft'}`}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-accent/10 text-accent' : 'hover:bg-bg-soft'}`}>
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5" : "flex flex-col gap-3"}>
            {filteredStories.slice(0, 10).map(story => (
              <StoryCard key={story.id} story={story} viewMode={viewMode} />
            ))}
          </div>

          {filteredStories.length > 10 && (
            <div className="text-center pt-2">
              <Link href={`/browse?genre=${encodeURIComponent(activeCategory)}`} className="text-sm text-accent hover:underline">{t.seeAll} →</Link>
            </div>
          )}
        </section>
      )}

      {/* Completed Series */}
      {completedStories.length > 0 && (
        <CompletedCarousel stories={completedStories} completedBadge={t.completedBadge} completedTitle={t.completedSeries} completedDesc={t.completedDesc} seeAll={t.seeAll} />
      )}

      <Suspense fallback={<div className="animate-pulse space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-bg-input rounded-xl" />)}</div>}>
        <RecentComments />
      </Suspense>
    </div>
  );
}

function StoryCard({ story, viewMode }: { story: any; viewMode: string }) {
  if (viewMode === 'list') {
    return (
      <Link href={`/story/${story.id}`} className="group flex gap-4 p-3 rounded-xl border border-border bg-bg-card hover:border-accent/30 transition-colors">
        <div className="w-16 h-22 md:w-20 md:h-28 rounded-lg overflow-hidden shrink-0 relative">
          <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="font-semibold text-sm md:text-base group-hover:text-accent transition-colors line-clamp-1">{story.title}</h3>
          <p className="text-xs text-tx-soft mt-0.5">{story.profiles?.full_name || 'Anonymous'}</p>
          <p className="text-xs text-tx-muted mt-1 line-clamp-1 hidden sm:block">{story.description}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-tx-muted font-medium">
            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatCount(story.reads_count || 0)}</span>
            <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatCount(story.likes_count || 0)}</span>
            <span className="px-1.5 py-0.5 rounded bg-bg-input text-tx-soft">{story.category}</span>
            {story.tags && Array.isArray(story.tags) && story.tags.find((t: string) => ['Cerita Pendek', 'Cerita Sedang', 'Cerita Panjang', 'Novel', 'Pendek', 'Sedang', 'Panjang'].includes(t)) && (
              <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                {getTierDisplayName(story.tags.find((t: string) => ['Cerita Pendek', 'Cerita Sedang', 'Cerita Panjang', 'Novel', 'Pendek', 'Sedang', 'Panjang'].includes(t)))}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/story/${story.id}`} className="group flex flex-col gap-2">
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-bg-input relative">
        <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} className="transition-transform group-hover:scale-105" />
      </div>
      <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">{story.title}</h3>
      <p className="text-xs text-tx-soft truncate">{story.profiles?.full_name || 'Anonymous'}</p>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-tx-muted font-medium">
        <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatCount(story.reads_count || 0)}</span>
        <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatCount(story.likes_count || 0)}</span>
        <span className="px-1.5 py-0.5 rounded bg-bg-input text-tx-soft">{story.category}</span>
        {story.tags && Array.isArray(story.tags) && story.tags.find((t: string) => ['Cerita Pendek', 'Cerita Sedang', 'Cerita Panjang', 'Novel', 'Pendek', 'Sedang', 'Panjang'].includes(t)) && (
          <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent">
            {getTierDisplayName(story.tags.find((t: string) => ['Cerita Pendek', 'Cerita Sedang', 'Cerita Panjang', 'Novel', 'Pendek', 'Sedang', 'Panjang'].includes(t)))}
          </span>
        )}
      </div>
    </Link>
  );
}

function GenreCarousel({ genre, seeAll }: { genre: string; seeAll: string }) {
  const [stories, setStories] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getStoriesByCategory(genre, 15).then(setStories);
  }, [genre]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || stories.length < 4) return;

    autoScrollRef.current = setInterval(() => {
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 210, behavior: 'smooth' });
      }
    }, 3000);

    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [stories.length]);

  const pauseAutoScroll = () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  const resumeAutoScroll = () => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    const el = scrollRef.current;
    if (!el || stories.length < 4) return;
    autoScrollRef.current = setInterval(() => {
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 210, behavior: 'smooth' });
      }
    }, 3000);
  };

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -210 : 210, behavior: 'smooth' });
  };

  if (stories.length === 0) return null;

  return (
    <section className="pt-4 border-t border-border">
      <div className="rounded-2xl border border-border bg-bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold">{genre}</span>
            <h2 className="text-base font-bold font-serif">{genre}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => scroll('left')} onMouseEnter={pauseAutoScroll} onMouseLeave={resumeAutoScroll} className="p-1 rounded-full border border-border hover:bg-bg-soft transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => scroll('right')} onMouseEnter={pauseAutoScroll} onMouseLeave={resumeAutoScroll} className="p-1 rounded-full border border-border hover:bg-bg-soft transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <Link href={`/browse?genre=${encodeURIComponent(genre)}`} className="text-[10px] font-medium text-gray-500 hover:text-accent flex items-center ml-1">{seeAll} <ChevronRight className="h-3 w-3" /></Link>
          </div>
        </div>

        <div
          ref={scrollRef}
          onMouseEnter={pauseAutoScroll}
          onMouseLeave={resumeAutoScroll}
          className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory"
        >
          {stories.map(story => (
            <Link key={story.id} href={`/story/${story.id}`} className="group flex gap-2.5 min-w-[190px] max-w-[190px] p-2 rounded-xl border border-border/50 bg-bg hover:border-accent/30 hover:shadow-sm transition-all snap-start">
              <div className="w-12 h-16 rounded-md overflow-hidden shrink-0 relative">
                <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} className="transition-transform group-hover:scale-105" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-[11px] font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">{story.title}</h3>
                <p className="text-[9px] text-tx-soft truncate mt-0.5">{story.profiles?.full_name || 'Anonymous'}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[9px] text-tx-muted">
                  <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {formatCount(story.reads_count || 0)}</span>
                  <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" /> {formatCount(story.likes_count || 0)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompletedCarousel({ stories, completedBadge, completedTitle, completedDesc, seeAll }: { stories: any[]; completedBadge: string; completedTitle: string; completedDesc: string; seeAll: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = dir === 'left' ? -240 : 240;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="pt-4 border-t border-border">
      <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <h2 className="text-lg md:text-xl font-bold font-serif">{completedTitle}</h2>
              <p className="text-[10px] text-tx-muted">{completedDesc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => scroll('left')} className="p-1.5 rounded-full border border-border hover:bg-bg-soft transition-colors" aria-label="Scroll left">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => scroll('right')} className="p-1.5 rounded-full border border-border hover:bg-bg-soft transition-colors" aria-label="Scroll right">
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link href="/browse?completed=true" className="text-xs font-medium text-gray-500 hover:text-accent flex items-center ml-1">{seeAll} <ChevronRight className="h-3 w-3" /></Link>
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {stories.slice(0, 15).map(story => (
            <Link key={story.id} href={`/story/${story.id}`} className="group flex gap-3 min-w-[200px] max-w-[200px] p-2.5 rounded-xl border border-border/50 bg-bg hover:border-accent/30 hover:shadow-sm transition-all snap-start">
              <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0 relative">
                <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} className="transition-transform group-hover:scale-105" />
                <div className="absolute bottom-1 right-1 px-1 py-px rounded bg-green-500 text-white text-[7px] font-bold flex items-center gap-0.5">
                  <CheckCircle className="h-2 w-2" /> {completedBadge}
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-xs font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">{story.title}</h3>
                <p className="text-[10px] text-tx-soft truncate mt-0.5">{story.profiles?.full_name || 'Anonymous'}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[9px] text-tx-muted">
                  <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {formatCount(story.reads_count || 0)}</span>
                  <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" /> {formatCount(story.likes_count || 0)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
