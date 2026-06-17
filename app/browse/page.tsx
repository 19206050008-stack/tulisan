'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Eye, Heart, ChevronLeft, Tag, X, LayoutGrid } from 'lucide-react';
import { getStories, getCategories } from '@/lib/supabase';
import { StoryCover } from '@/components/StoryCover';
import { Pagination } from '@/components/Pagination';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/i18n';

export default function BrowsePageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-500">Loading...</div>}>
      <BrowsePage />
    </Suspense>
  );
}

function BrowsePage() {
  const searchParams = useSearchParams();
  const { lang } = useStore();
  const t = translations[lang].browse;
  const genreParam = searchParams.get('genre') || '';
  const [activeCategory, setActiveCategory] = useState(genreParam || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [stories, setStories] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'most_liked'>('newest');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (genreParam) setActiveCategory(genreParam); }, [genreParam]);
  useEffect(() => { setCurrentPage(1); }, [activeCategory, searchQuery, sortBy, perPage, selectedTags]);

  const loadData = async () => {
    setLoading(true);
    const [storiesData, catsData] = await Promise.all([
      getStories('published'),
      getCategories()
    ]);
    setStories(storiesData);
    setCategories(catsData.map((c: any) => c.name));
    
    // Extract all unique tags from stories
    const tagsSet = new Set<string>();
    storiesData.forEach((story: any) => {
      if (story.tags && Array.isArray(story.tags)) {
        story.tags.forEach((tag: string) => {
          if (tag && !['Pendek', 'Sedang', 'Panjang'].includes(tag)) {
            tagsSet.add(tag);
          }
        });
      }
    });
    setAllTags(Array.from(tagsSet).sort());
    
    setLoading(false);
  };

  const filtered = stories.filter(s => {
    const matchCategory = activeCategory === 'All' || activeCategory === translations.en.home.all || activeCategory === translations.id.home.all || s.category === activeCategory;
    const matchSearch = !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || (s.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchTags = selectedTags.length === 0 || (s.tags && Array.isArray(s.tags) && selectedTags.some(tag => s.tags.includes(tag)));
    return matchCategory && matchSearch && matchTags;
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

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearAllTags = () => {
    setSelectedTags([]);
  };

  const visibleTags = allTags.slice(0, 8);
  const hasMoreTags = allTags.length > 8;

  const visibleCategories = categories.slice(0, 6);
  const hasMoreCategories = categories.length > 6;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {activeCategory !== 'All' && activeCategory !== translations.id.home.all && activeCategory !== translations.en.home.all ? (
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveCategory(translations[lang].home.all)} className="p-1.5 rounded-full hover:bg-bg-soft transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Genre</p>
              <h1 className="text-2xl md:text-3xl font-bold font-serif">{activeCategory}</h1>
            </div>
          </div>
        ) : (
          <h1 className="text-2xl md:text-3xl font-bold font-serif">{t.title}</h1>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white text-gray-900 rounded-full text-sm focus:outline-none border border-gray-300 focus:border-accent dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 text-xs rounded-lg bg-white text-gray-700 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 [&>option]:bg-white [&>option]:text-gray-700 dark:[&>option]:bg-gray-800 dark:[&>option]:text-gray-300">
              <option value="newest">{t.sort.newest}</option>
              <option value="popular">{t.sort.popular}</option>
              <option value="most_liked">{t.sort.likes}</option>
            </select>
            <select value={perPage} onChange={e => setPerPage(Number(e.target.value))} className="px-3 py-2 text-xs rounded-lg bg-white text-gray-700 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 [&>option]:bg-white [&>option]:text-gray-700 dark:[&>option]:bg-gray-800 dark:[&>option]:text-gray-300">
              <option value={10}>10 {t.perPage.replace(':', '')}</option>
              <option value={20}>20 {t.perPage.replace(':', '')}</option>
              <option value={30}>30 {t.perPage.replace(':', '')}</option>
            </select>
          </div>
        </div>

        {(activeCategory === 'All' || activeCategory === translations.id.home.all || activeCategory === translations.en.home.all) && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveCategory(translations[lang].home.all)} className="px-4 py-2 rounded-full text-sm font-medium bg-accent text-white hover:opacity-90">
              {translations[lang].home.all}
            </button>
            {visibleCategories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className="px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-700 transition-colors">
                {cat}
              </button>
            ))}
            {hasMoreCategories && (
              <button
                onClick={() => setShowGenreModal(true)}
                className="px-4 py-2 rounded-full text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 border-2 border-accent/30 dark:bg-accent/20 dark:hover:bg-accent/30 transition-colors"
              >
                More ({categories.length - 6})
              </button>
            )}
          </div>
        )}

        {allTags.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filter by Tags</h3>
              </div>
              {selectedTags.length > 0 && (
                <button onClick={clearAllTags} className="text-xs text-accent hover:underline">
                  Clear all ({selectedTags.length})
                </button>
              )}
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-accent text-white hover:opacity-90 transition-opacity"
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {visibleTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-accent/20 text-accent border-2 border-accent'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
              {hasMoreTags && (
                <button
                  onClick={() => setShowTagModal(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors border-2 border-accent/30 dark:bg-accent/20 dark:hover:bg-accent/30"
                >
                  More ({allTags.length - 8})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-800 rounded-lg" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{sorted.length} {t.results}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {paginated.map(story => (
              <Link href={`/story/${story.id}`} key={story.id} className="group flex flex-col gap-2">
                <div className="relative overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 aspect-[2/3] w-full">
                  <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} className="transition-transform group-hover:scale-105" />
                </div>
                <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">{story.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{story.profiles?.full_name || story.profiles?.username || 'Anonymous'}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-tx-muted font-medium">
                  <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatCount(story.reads_count || 0)}</span>
                  <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatCount(story.likes_count || 0)}</span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{story.category}</span>
                  {story.tags && Array.isArray(story.tags) && story.tags.find((t: string) => ['Pendek', 'Sedang', 'Panjang'].includes(t)) && (
                    <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                      {story.tags.find((t: string) => ['Pendek', 'Sedang', 'Panjang'].includes(t))}
                    </span>
                  )}
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

      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowTagModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">All Tags</h2>
                {selectedTags.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium">
                    {selectedTags.length} selected
                  </span>
                )}
              </div>
              <button onClick={() => setShowTagModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {selectedTags.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Selected Tags</h3>
                    <button onClick={clearAllTags} className="text-xs text-accent hover:underline">
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-accent text-white hover:opacity-90 transition-opacity"
                      >
                        {tag}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      selectedTags.includes(tag)
                        ? 'bg-accent/20 text-accent border-2 border-accent'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              
              {allTags.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No tags available</p>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">{allTags.length} tags available</p>
              <button 
                onClick={() => setShowTagModal(false)}
                className="px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowGenreModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">All Genres</h2>
              </div>
              <button onClick={() => setShowGenreModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => { setActiveCategory(translations[lang].home.all); setShowGenreModal(false); }}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === 'All' || activeCategory === translations.id.home.all || activeCategory === translations.en.home.all
                      ? 'bg-accent text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-700'
                  }`}
                >
                  {translations[lang].home.all}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setShowGenreModal(false); }}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-accent text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              {categories.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No genres available</p>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">{categories.length + 1} genres available</p>
              <button 
                onClick={() => setShowGenreModal(false)}
                className="px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
