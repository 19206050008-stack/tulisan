'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { moderateText, updateStoryModeration } from '@/lib/supabase';
import { Trash2, Eye, EyeOff, Search, ExternalLink, Heart, BookOpen, Filter, Star, CheckCircle } from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { getGenreGradient } from '@/lib/genre-colors';

function getGradient(category: string) {
  return getGenreGradient(category);
}

type StatusFilter = 'all' | 'published' | 'draft' | 'archived';
type SortOption = 'newest' | 'oldest' | 'most_reads' | 'most_likes' | 'az';

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const perPage = 10;

  const loadStories = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from('stories')
      .select('*, profiles!stories_author_id_fkey(username, full_name)')
      .order('created_at', { ascending: false });
    setStories(data || []);
    setLoading(false);
  };

  useEffect(() => { loadStories(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, sortBy, categoryFilter]);

  const toggleStatus = async (id: string, current: string) => {
    if (!supabase) return;
    const newStatus = current === 'published' ? 'archived' : 'published';
    const { error } = await supabase.from('stories').update({ status: newStatus }).eq('id', id);
    if (error) { alert(`Gagal: ${error.message}`); return; }
    setStories(stories.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const deleteStory = async (id: string) => {
    if (!supabase) return;
    if (!confirm('Delete this story? This action cannot be undone.')) return;
    const { error } = await supabase.from('stories').delete().eq('id', id);
    if (error) { alert(`Gagal: ${error.message}`); return; }
    setStories(stories.filter(s => s.id !== id));
  };

  const scanStoryContent = async (storyId: string, title: string, description: string, status: string) => {
    // For published stories, scan full content via chapters endpoint
    if (status === 'published') {
      alert('📖 For published stories, use Moderation page to scan all chapters.\n\nThis feature is for draft/archived stories only.');
      return;
    }
    
    try {
      alert('🔍 Scanning story...');
      const result = await moderateText(`${title}\n${description}`, 'id');
      
      if (!result.is_safe) {
        alert(`⚠️ Content flagged!\n\nScore: ${Math.round(result.confidence_score * 100)}%\nFlags: ${result.flagged_categories.join(', ')}`);
      } else {
        alert(`✅ Content SAFE! Score: ${Math.round(result.confidence_score * 100)}%`);
      }
    } catch (error) {
      console.error('Scan failed:', error);
      alert('❌ Scan failed - check console logs');
    }
  };

  const toggleEditorialPick = async (id: string, current: boolean) => {
    if (!supabase) return;
    const { error } = await supabase.from('stories').update({ is_editorial_pick: !current }).eq('id', id);
    if (error) { alert(`Gagal: ${error.message}`); return; }
    setStories(stories.map(s => s.id === id ? { ...s, is_editorial_pick: !current } : s));
  };

  const toggleCompleted = async (id: string, current: boolean) => {
    if (!supabase) return;
    const { error } = await supabase.from('stories').update({ is_completed: !current }).eq('id', id);
    if (error) { alert(`Gagal: ${error.message}`); return; }
    setStories(stories.map(s => s.id === id ? { ...s, is_completed: !current } : s));
  };

  // Get unique categories
  const categories = [...new Set(stories.map(s => s.category).filter(Boolean))].sort();

  // Status counts
  const statusCounts = {
    all: stories.length,
    published: stories.filter(s => s.status === 'published').length,
    draft: stories.filter(s => s.status === 'draft').length,
    archived: stories.filter(s => s.status === 'archived').length,
  };

  // Filter + Sort
  const filtered = stories
    .filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.title.toLowerCase().includes(q) ||
          (s.profiles?.full_name || '').toLowerCase().includes(q) ||
          (s.profiles?.username || '').toLowerCase().includes(q) ||
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
        default: return 0;
      }
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const formatNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold font-serif">Manage Stories</h1>
        <span className="text-sm text-gray-500">{filtered.length} stories</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stories.length, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Published', value: statusCounts.published, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
          { label: 'Drafts', value: statusCounts.draft, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' },
          { label: 'Archived', value: statusCounts.archived, color: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl border border-border bg-bg-card">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mb-2 ${s.color}`}>{s.value}</div>
            <p className="text-xs text-tx-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by title, author, or category..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-bg-input rounded-lg text-sm focus:outline-none border border-border focus:border-accent" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${showFilters ? 'border-accent text-accent bg-accent/5' : 'border-border text-tx-soft hover:bg-bg-soft'}`}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-border bg-bg-card">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-tx-muted">Sort by</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="block px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most_reads">Most Reads</option>
                <option value="most_likes">Most Likes</option>
                <option value="az">Title A-Z</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-tx-muted">Category</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="block px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx"
              >
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors capitalize whitespace-nowrap ${statusFilter === status ? 'border-accent text-accent' : 'border-transparent text-tx-soft hover:text-accent'}`}
            >
              {status === 'published' && <Eye className="h-3 w-3" />}
              {status === 'draft' && <EyeOff className="h-3 w-3" />}
              {status}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === status ? 'bg-accent/10' : 'bg-bg-input'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Story list */}
      <div className="space-y-2">
        {paginated.map(s => (
          <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-border bg-bg-card group hover:border-accent/20 transition-colors gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {s.cover_url && !s.cover_url.startsWith('gradient:') ? (
                <img src={s.cover_url} alt="" className="w-10 h-14 rounded object-cover shrink-0" />
              ) : (
                <div className="w-10 h-14 rounded shrink-0" style={{ background: getGradient(s.category) }} />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{s.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="text-xs text-gray-500">by {s.profiles?.full_name || s.profiles?.username || 'Unknown'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.status === 'published' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : s.status === 'archived' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'}`}>
                    {s.status}
                  </span>
                  {s.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-tx-soft">{s.category}</span>}
                  {s.is_editorial_pick && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium flex items-center gap-0.5"><Star className="h-2.5 w-2.5" /> Editorial</span>}
                  {s.is_completed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium flex items-center gap-0.5"><CheckCircle className="h-2.5 w-2.5" /> Tamat</span>}
                  {s.status === 'published' && (
                    <>
                      <span className="text-[10px] text-tx-muted flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatNum(s.reads_count || 0)}</span>
                      <span className="text-[10px] text-tx-muted flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatNum(s.likes_count || 0)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 flex-wrap sm:flex-nowrap">
              <button onClick={() => scanStoryContent(s.id, s.title, s.description || '', s.status)} className={`p-2 rounded-lg transition-colors text-blue-600 hover:bg-bg-soft`} title="Scan Content">
                <Eye className="h-4 w-4" />
              </button>
              <button onClick={() => toggleEditorialPick(s.id, !!s.is_editorial_pick)} className={`p-2 rounded-lg transition-colors ${s.is_editorial_pick ? 'bg-accent/10 text-accent' : 'hover:bg-bg-soft text-tx-muted hover:text-tx'}`} title={s.is_editorial_pick ? 'Remove from Editorial Picks' : 'Add to Editorial Picks'}>
                <Star className="h-4 w-4" />
              </button>
              <button onClick={() => toggleCompleted(s.id, !!s.is_completed)} className={`p-2 rounded-lg transition-colors ${s.is_completed ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'hover:bg-bg-soft text-tx-muted hover:text-tx'}`} title={s.is_completed ? 'Mark as Ongoing' : 'Mark as Completed'}>
                <CheckCircle className="h-4 w-4" />
              </button>
              <Link href={`/story/${s.id}`} className="p-2 rounded-lg hover:bg-bg-soft transition-colors text-tx-muted hover:text-tx" title="View story" target="_blank">
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button onClick={() => toggleStatus(s.id, s.status)} className="p-2 rounded-lg hover:bg-bg-soft transition-colors" title={s.status === 'published' ? 'Archive' : 'Publish'}>
                {s.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button onClick={() => deleteStory(s.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {paginated.length === 0 && <p className="text-center text-gray-500 py-8">No stories found.</p>}
      </div>

      {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
    </div>
  );
}
