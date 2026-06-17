'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { LayoutGrid, List, Eye, Heart, ChevronRight, ChevronLeft } from 'lucide-react';
import { getStories, getCategories } from '@/lib/supabase';
import { HeroSlider } from '@/components/HeroSlider';
import { RecentComments } from '@/components/RecentComments';
import { StoryCover } from '@/components/StoryCover';
import { GenreFilter } from '@/components/GenreFilter';

import { translations } from '@/lib/i18n';

export default function Home() {
  const { viewMode, setViewMode, lang } = useStore();
  const t = translations[lang].home;
  const [stories, setStories] = useState<any[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [randomGenres, setRandomGenres] = useState<string[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [storiesData, catsData] = await Promise.all([
      getStories('published'),
      getCategories()
    ]);
    setStories(storiesData);
    const catNames = catsData.map((c: any) => c.name);
    setCategoryNames(['All', ...catNames]);
    const genresWithStories = catNames.filter((g: string) => storiesData.some((s: any) => s.category === g));
    const shuffled = [...genresWithStories].sort(() => Math.random() - 0.5);
    setRandomGenres(shuffled.slice(0, 2));
    setLoading(false);
  };

  const formatCount = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const topStories = [...stories].sort((a, b) => (b.reads_count || 0) - (a.reads_count || 0)).slice(0, 10);
  const filteredStories = activeCategory === t.all ? stories : stories.filter(s => s.category === activeCategory);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="rounded-2xl bg-gray-200 dark:bg-gray-800 h-44 md:h-56 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="aspect-[2/3] bg-bg-input rounded-lg" />
              <div className="h-3 bg-bg-input rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <HeroSlider />

      <GenreFilter categories={categoryNames} active={activeCategory} onChange={setActiveCategory} visibleCount={5} />

      {activeCategory === t.all || activeCategory === 'All' ? (
        <>
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
                <StoryCard key={story.id} story={story} viewMode={viewMode} formatCount={formatCount} />
              ))}
            </div>

            <div className="text-center pt-2">
              <Link href="/browse" className="text-sm text-accent hover:underline">{t.seeAll} →</Link>
            </div>
          </section>

          {randomGenres.map(genre => (
            <GenreSection key={genre} genre={genre} stories={stories.filter(s => s.category === genre)} formatCount={formatCount} />
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
              <StoryCard key={story.id} story={story} viewMode={viewMode} formatCount={formatCount} />
            ))}
          </div>

          {filteredStories.length > 10 && (
            <div className="text-center pt-2">
              <Link href={`/browse?genre=${encodeURIComponent(activeCategory)}`} className="text-sm text-accent hover:underline">{t.seeAll} →</Link>
            </div>
          )}
        </section>
      )}

      <RecentComments />
    </div>
  );
}

function StoryCard({ story, viewMode, formatCount }: { story: any; viewMode: string; formatCount: (n: number) => string }) {
  if (viewMode === 'list') {
    return (
      <Link href={`/story/${story.id}`} className="group flex gap-4 p-3 rounded-xl border border-border bg-bg-card hover:border-accent/30 transition-colors">
        <div className="w-16 h-22 md:w-20 md:h-28 rounded-lg overflow-hidden shrink-0">
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
            {story.tags && Array.isArray(story.tags) && story.tags.find((t: string) => ['Pendek', 'Sedang', 'Panjang'].includes(t)) && (
              <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                {story.tags.find((t: string) => ['Pendek', 'Sedang', 'Panjang'].includes(t))}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/story/${story.id}`} className="group flex flex-col gap-2">
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-bg-input">
        <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} className="transition-transform group-hover:scale-105" />
      </div>
      <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">{story.title}</h3>
      <p className="text-xs text-tx-soft truncate">{story.profiles?.full_name || 'Anonymous'}</p>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-tx-muted font-medium">
        <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatCount(story.reads_count || 0)}</span>
        <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatCount(story.likes_count || 0)}</span>
        <span className="px-1.5 py-0.5 rounded bg-bg-input text-tx-soft">{story.category}</span>
        {story.tags && Array.isArray(story.tags) && story.tags.find((t: string) => ['Pendek', 'Sedang', 'Panjang'].includes(t)) && (
          <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent">
            {story.tags.find((t: string) => ['Pendek', 'Sedang', 'Panjang'].includes(t))}
          </span>
        )}
      </div>
    </Link>
  );
}

function GenreSection({ genre, stories, formatCount }: { genre: string; stories: any[]; formatCount: (n: number) => string }) {
  const { lang } = useStore();
  const t = translations[lang].home;

  if (stories.length === 0) return null;
  return (
    <section className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold font-serif">{genre}</h2>
        <Link href={`/browse?genre=${encodeURIComponent(genre)}`} className="text-xs font-medium text-gray-500 hover:text-accent flex items-center">{t.seeAll} <ChevronRight className="h-3 w-3" /></Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {stories.slice(0, 5).map(story => (
          <StoryCard key={story.id} story={story} viewMode="grid" formatCount={formatCount} />
        ))}
      </div>
    </section>
  );
}
