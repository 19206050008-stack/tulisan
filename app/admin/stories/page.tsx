'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Eye, EyeOff, Search } from 'lucide-react';
import { Pagination } from '@/components/Pagination';

const GRADIENT_MAP: Record<string, string> = {
  'Romance': 'linear-gradient(135deg, #ff6b9d, #c44569)',
  'Horror': 'linear-gradient(135deg, #2d1b69, #11001c)',
  'Mystery': 'linear-gradient(135deg, #4a5568, #1a202c)',
  'Sci-Fi': 'linear-gradient(135deg, #0099f7, #005999)',
  'Fantasy': 'linear-gradient(135deg, #7f53ac, #647dee)',
  'Drama': 'linear-gradient(135deg, #e96443, #904e95)',
  'Humor': 'linear-gradient(135deg, #f7971e, #ffd200)',
  'Adventure': 'linear-gradient(135deg, #11998e, #38ef7d)',
  'Thriller': 'linear-gradient(135deg, #c31432, #240b36)',
  'Slice of Life': 'linear-gradient(135deg, #76b852, #8dc26f)',
  'Historical': 'linear-gradient(135deg, #8e7c54, #5c4a1e)',
  'Inspirational': 'linear-gradient(135deg, #ffc107, #ff9800)',
};

function getGradient(category: string) {
  return GRADIENT_MAP[category] || 'linear-gradient(135deg, #667eea, #764ba2)';
}

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => { loadStories(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const loadStories = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from('stories').select('*, profiles!stories_author_id_fkey(username, full_name)').order('created_at', { ascending: false });
    setStories(data || []);
    setLoading(false);
  };

  const toggleStatus = async (id: string, current: string) => {
    if (!supabase) return;
    const newStatus = current === 'published' ? 'archived' : 'published';
    await supabase.from('stories').update({ status: newStatus }).eq('id', id);
    setStories(stories.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const deleteStory = async (id: string) => {
    if (!supabase) return;
    if (!confirm('Delete this story?')) return;
    await supabase.from('stories').delete().eq('id', id);
    setStories(stories.filter(s => s.id !== id));
  };

  const filtered = stories.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.profiles?.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif">Manage Stories</h1>
        <span className="text-sm text-gray-500">{filtered.length} stories</span>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search stories..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-brand-muted dark:bg-gray-800 rounded-lg text-sm focus:outline-none border border-subtle dark:border-gray-700 focus:border-accent" />
      </div>

      <div className="space-y-2">
        {paginated.map(s => (
          <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
            <div className="flex items-center gap-3 min-w-0">
              {s.cover_url && !s.cover_url.startsWith('gradient:') ? (
                <img src={s.cover_url} alt="" className="w-10 h-14 rounded object-cover shrink-0" />
              ) : (
                <div className="w-10 h-14 rounded shrink-0" style={{ background: getGradient(s.category) }} />
              )}
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{s.title}</p>
                <p className="text-xs text-gray-500">by {s.profiles?.full_name || s.profiles?.username} &middot; <span className={s.status === 'published' ? 'text-green-600' : s.status === 'archived' ? 'text-red-500' : 'text-yellow-600'}>{s.status}</span> &middot; {s.category || 'No category'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => toggleStatus(s.id, s.status)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title={s.status === 'published' ? 'Archive' : 'Publish'}>
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

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
