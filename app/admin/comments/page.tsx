'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Search } from 'lucide-react';
import { Pagination } from '@/components/Pagination';

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => { loadComments(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const loadComments = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from('comments').select('*, profiles!comments_user_id_fkey(username, full_name), stories!comments_story_id_fkey(title)').order('created_at', { ascending: false });
    setComments(data || []);
    setLoading(false);
  };

  const deleteComment = async (id: string) => {
    if (!supabase) return;
    await supabase.from('comments').delete().eq('id', id);
    setComments(comments.filter(c => c.id !== id));
  };

  const filtered = comments.filter(c =>
    c.content.toLowerCase().includes(search.toLowerCase()) ||
    (c.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.stories?.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif">Manage Comments</h1>
        <span className="text-sm text-gray-500">{filtered.length} comments</span>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search comments..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-brand-muted dark:bg-gray-800 rounded-lg text-sm focus:outline-none border border-subtle dark:border-gray-700 focus:border-accent" />
      </div>

      <div className="space-y-2">
        {paginated.map(c => (
          <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{c.content}</p>
              <p className="text-xs text-gray-500 mt-1">by {c.profiles?.full_name || c.profiles?.username} on &ldquo;{c.stories?.title}&rdquo; &middot; {new Date(c.created_at).toLocaleDateString()}</p>
            </div>
            <button onClick={() => deleteComment(c.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {paginated.length === 0 && <p className="text-center text-gray-500 py-8">No comments found.</p>}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
