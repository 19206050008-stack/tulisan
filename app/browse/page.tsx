'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Eye, Heart, ChevronLeft } from 'lucide-react';
import { getStories, getCategories } from '@/lib/supabase';
import { StoryCover } from '@/components/StoryCover';
import { Pagination } from '@/components/Pagination';

export default function BrowsePageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-500">Loading...</div>}>
      <BrowsePage />
    </Suspense>
  );
}

function BrowsePage() {
  const searchParams = useSearchParams();
  const genreParam = searchParams.get('genre') || '';
  const [activeCategory, setActiveCategory] = useState(genreParam || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [stories, setStories] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'most_liked'>('newest');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (genreParam) setActiveCategory(genreParam); }, [genreParam]);
  useEffect(() => { setCurrentPage(1); }, [activeCategory, searchQuery, sortBy, perPage]);

  const loadData = async () => {
    setLoading(true);
    const [storiesData, catsData] = await Promise.all([
      getStories('published'),
      getCategories()
    ]);
    setStories(storiesData);
    setCategories(catsData.map((c: any) => c.name));
    setLoading(false);
  };

  const filtered = stories.filter(s => {
    const matchCategory = activeCategory === 'All' || s.category === activeCategory;
    const matchSearch = !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || (s.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'popular') return (b.reads_count || 0) - (a.reads_count || 0);
    if (sortBy === 'most_liked') return (b.likes_count || 0) - (a.likes_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

  const formatCount = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {activeCategory !== 'All' ? (
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveCategory('All')} className="p-1.5 rounded-full hover:bg-brand-muted dark:hover:bg-gray-800 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Genre</p>
              <h1 className="text-2xl md:text-3xl font-bold font-serif">{activeCategory}</h1>
            </div>
          </div>
        ) : (
          <h1 className="text-2xl md:text-3xl font-bold font-serif">Browse Stories</h1>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search stories or authors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-brand-muted dark:bg-gray-800 rounded-full text-sm focus:outline-none border border-transparent focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 text-xs rounded-lg bg-brand-muted dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent">
              <option value="newest">Newest</option>
              <option value="popular">Most Read</option>
              <option value="most_liked">Most Liked</option>
            </select>
            <select value={perPage} onChange={e => setPerPage(Number(e.target.value))} className="px-3 py-2 text-xs rounded-lg bg-brand-muted dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent">
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={30}>30 per page</option>
            </select>
          </div>
        </div>

        {activeCategory === 'All' && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveCategory('All')} className="px-4 py-2 rounded-full text-sm font-medium bg-brand-text text-brand-bg dark:bg-white dark:text-gray-900">All</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className="px-4 py-2 rounded-full text-sm font-medium bg-brand-muted text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="aspect-[2/3] bg-brand-muted dark:bg-gray-800 rounded-lg" />
              <div className="h-3 bg-brand-muted dark:bg-gray-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{sorted.length} stories found</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {paginated.map(story => (
              <Link href={`/story/${story.id}`} key={story.id} className="group flex flex-col gap-2">
                <div className="relative overflow-hidden rounded-lg bg-brand-muted dark:bg-gray-800 aspect-[2/3] w-full">
                  <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} className="transition-transform group-hover:scale-105" />
                </div>
                <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">{story.title}</h3>
                <p className="text-xs text-gray-500 truncate">{story.profiles?.full_name || story.profiles?.username || 'Anonymous'}</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                  <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatCount(story.reads_count || 0)}</span>
                  <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatCount(story.likes_count || 0)}</span>
                </div>
              </Link>
            ))}
          </div>

          {paginated.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No stories found.</p>
            </div>
          )}

          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </>
      )}
    </div>
  );
}
