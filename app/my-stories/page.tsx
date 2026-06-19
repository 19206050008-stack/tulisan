'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getMyStories, deleteStory, supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Eye, EyeOff, Search, SortAsc, BookOpen, Heart, MessageSquare, BarChart3, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StoryCover } from '@/components/StoryCover';
import { Pagination } from '@/components/Pagination';
import { translations } from '@/lib/i18n';

type StatusFilter = 'all' | 'published' | 'draft' | 'archived';
type SortOption = 'newest' | 'oldest' | 'most_reads' | 'most_likes' | 'az' | 'za';

export default function MyStoriesPage() {
  const { user, role, _hasHydrated, lang } = useStore();
  const t = translations[lang].myStories;
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [showFilters, setShowFilters] = useState(false);
  const perPage = 10;

  const labels = lang === 'en' ? {
    title: 'My Stories',
    newStory: 'New Story',
    search: 'Search your stories...',
    all: 'All',
    published: 'Published',
    draft: 'Draft',
    archived: 'Archived',
    stories: 'stories',
    noStories: "You haven't written any stories yet.",
    newest: 'Newest',
    oldest: 'Oldest',
    mostReads: 'Most Reads',
    mostLikes: 'Most Likes',
    az: 'A-Z',
    za: 'Z-A',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this story?',
    reads: 'reads',
    likes: 'likes',
    comments: 'comments',
    chapters: 'chapters',
    noCategory: 'No category',
    sort: 'Sort',
    filters: 'Filters',
    noResults: 'No stories match your search.',
  } : {
    title: 'Cerita Saya',
    newStory: 'Cerita Baru',
    search: 'Cari cerita Anda...',
    all: 'Semua',
    published: 'Diterbitkan',
    draft: 'Draf',
    archived: 'Diarsipkan',
    stories: 'cerita',
    noStories: 'Anda belum menulis cerita apa pun.',
    newest: 'Terbaru',
    oldest: 'Terlama',
    mostReads: 'Paling Banyak Dibaca',
    mostLikes: 'Paling Banyak Disukai',
    az: 'A-Z',
    za: 'Z-A',
    edit: 'Edit',
    delete: 'Hapus',
    deleteConfirm: 'Yakin ingin menghapus cerita ini?',
    reads: 'dibaca',
    likes: 'suka',
    comments: 'komentar',
    chapters: 'bab',
    noCategory: 'Tanpa kategori',
    sort: 'Urutkan',
    filters: 'Filter',
    noResults: 'Tidak ada cerita yang cocok.',
  };

  const loadStories = async () => {
    setLoading(true);
    const data = await getMyStories(user!.id);
    setStories(data);

    // Load chapter counts
    if (supabase && data.length > 0) {
      const storyIds = data.map((s: any) => s.id);
      const { data: chapters } = await supabase.from('chapters').select('story_id').in('story_id', storyIds);
      const counts: Record<string, number> = {};
      chapters?.forEach((c: any) => { counts[c.story_id] = (counts[c.story_id] || 0) + 1; });
      setChapterCounts(counts);

      // Load comment counts
      const { count: commentData } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .in('story_id', storyIds);
      // Approximate - per story would need group by
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!_hasHydrated) return;
    if (role === 'guest') { router.push('/login'); return; }
    if (user?.id) loadStories();
  }, [user, role, _hasHydrated]);

  const handleDelete = async (id: string) => {
    if (!confirm(labels.deleteConfirm)) return;
    try {
      await deleteStory(id);
      setStories(stories.filter(s => s.id !== id));
    } catch {}
  };

  // Filter + Sort
  const filtered = stories
    .filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.title.toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          (s.category || '').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'most_reads': return (b.reads_count || 0) - (a.reads_count || 0);
        case 'most_likes': return (b.likes_count || 0) - (a.likes_count || 0);
        case 'az': return (a.title || '').localeCompare(b.title || '');
        case 'za': return (b.title || '').localeCompare(a.title || '');
        default: return 0;
      }
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, sortBy]); // eslint-disable-line react-hooks/set-state-in-effect

  const formatNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  const statusCounts = {
    all: stories.length,
    published: stories.filter(s => s.status === 'published').length,
    draft: stories.filter(s => s.status === 'draft').length,
    archived: stories.filter(s => s.status === 'archived').length,
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-10 bg-bg-input rounded animate-pulse w-1/3" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-bg-input rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold font-serif">{labels.title}</h1>
        <Link href="/write" className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> {labels.newStory}
        </Link>
      </div>

      {/* Stats Bar */}
      {stories.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <MiniStat icon={<BookOpen className="h-3.5 w-3.5" />} label={labels.stories} value={stories.length} />
          <MiniStat icon={<Eye className="h-3.5 w-3.5" />} label={labels.reads} value={formatNum(stories.reduce((s, st) => s + (st.reads_count || 0), 0))} />
          <MiniStat icon={<Heart className="h-3.5 w-3.5" />} label={labels.likes} value={formatNum(stories.reduce((s, st) => s + (st.likes_count || 0), 0))} />
          <MiniStat icon={<MessageSquare className="h-3.5 w-3.5" />} label={labels.chapters} value={Object.values(chapterCounts).reduce((a, b) => a + b, 0)} />
        </div>
      )}

      {stories.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <BookOpen className="h-12 w-12 mx-auto text-tx-muted opacity-30" />
          <p className="text-gray-500 text-lg">{labels.noStories}</p>
          <Link href="/write" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> {labels.newStory}
          </Link>
        </div>
      ) : (
        <>
          {/* Search + Filter bar */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={labels.search}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-bg-input rounded-lg text-sm focus:outline-none border border-border focus:border-accent transition-colors"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${showFilters ? 'border-accent text-accent bg-accent/5' : 'border-border text-tx-soft hover:bg-bg-soft'}`}
              >
                <Filter className="h-4 w-4" /> <span className="hidden sm:inline">{labels.filters}</span>
              </button>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-border bg-bg-card">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-tx-muted">{labels.sort}</label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortOption)}
                    className="block px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx"
                  >
                    <option value="newest">{labels.newest}</option>
                    <option value="oldest">{labels.oldest}</option>
                    <option value="most_reads">{labels.mostReads}</option>
                    <option value="most_likes">{labels.mostLikes}</option>
                    <option value="az">{labels.az}</option>
                    <option value="za">{labels.za}</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 border-b border-border overflow-x-auto">
            {(['all', 'published', 'draft', 'archived'] as StatusFilter[]).map(status => {
              const count = statusCounts[status];
              if (status === 'archived' && count === 0) return null;
              const lbl = status === 'all' ? labels.all : status === 'published' ? labels.published : status === 'draft' ? labels.draft : labels.archived;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${statusFilter === status ? 'border-accent text-accent' : 'border-transparent text-tx-soft hover:text-accent'}`}
                >
                  {status === 'published' && <Eye className="h-3 w-3" />}
                  {status === 'draft' && <EyeOff className="h-3 w-3" />}
                  {lbl}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === status ? 'bg-accent/10' : 'bg-bg-input'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <p className="text-sm text-tx-muted">{filtered.length} {labels.stories}</p>

          {/* Story list */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-tx-muted">{labels.noResults}</div>
          ) : (
            <div className="space-y-3">
              {paginated.map(story => (
                <div key={story.id} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border border-border bg-bg-card hover:border-accent/20 transition-colors group">
                  {/* Cover */}
                  <Link href={`/story/${story.id}`} className="shrink-0">
                    <div className="w-12 h-16 md:w-14 md:h-20 rounded overflow-hidden relative">
                      <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} />
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/story/${story.id}`} className="font-semibold text-sm md:text-base truncate hover:text-accent transition-colors block">
                      {story.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] md:text-xs text-tx-soft">
                      <span className={`flex items-center gap-0.5 font-medium ${story.status === 'published' ? 'text-green-600 dark:text-green-400' : story.status === 'archived' ? 'text-red-500' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {story.status === 'published' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {story.status === 'published' ? labels.published : story.status === 'draft' ? labels.draft : labels.archived}
                      </span>
                      {story.category && (
                        <span className="px-1.5 py-0.5 rounded bg-bg-input">{story.category}</span>
                      )}
                      <span className="hidden sm:inline">{chapterCounts[story.id] || 0} {labels.chapters}</span>
                      {story.status === 'published' && (
                        <>
                          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatNum(story.reads_count || 0)}</span>
                          <span className="hidden sm:flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatNum(story.likes_count || 0)}</span>
                        </>
                      )}
                      {story.tags && Array.isArray(story.tags) && story.tags.find((tag: string) => ['Cerita Pendek', 'Cerita Sedang', 'Cerita Panjang', 'Pendek', 'Sedang', 'Panjang'].includes(tag)) && (
                        <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px]">
                          {story.tags.find((tag: string) => ['Cerita Pendek', 'Cerita Sedang', 'Cerita Panjang', 'Pendek', 'Sedang', 'Panjang'].includes(tag))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Link href={`/write/${story.id}`} className="p-2 rounded-lg hover:bg-bg-soft transition-colors" title={labels.edit}>
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button onClick={() => handleDelete(story.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors" title={labels.delete}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
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

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-xl border border-border bg-bg-card text-center">
      <div className="flex items-center justify-center gap-1 text-accent mb-1">{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-tx-muted uppercase tracking-wider">{label}</p>
    </div>
  );
}
