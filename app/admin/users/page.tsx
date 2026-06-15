'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Shield, ShieldOff, Search } from 'lucide-react';
import { Pagination } from '@/components/Pagination';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const loadUsers = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    if (!supabase) return;
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const deleteUser = async (userId: string) => {
    if (!supabase) return;
    if (!confirm('Delete this user and all their data?')) return;
    await supabase.from('profiles').delete().eq('id', userId);
    setUsers(users.filter(u => u.id !== userId));
  };

  const filtered = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif">Manage Users</h1>
        <span className="text-sm text-gray-500">{filtered.length} users</span>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-brand-muted dark:bg-gray-800 rounded-lg text-sm focus:outline-none border border-subtle dark:border-gray-700 focus:border-accent" />
      </div>

      <div className="space-y-2">
        {paginated.map(u => (
          <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
            <div className="flex items-center gap-3">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand-muted dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-400">{(u.full_name || u.username || 'U')[0].toUpperCase()}</div>
              )}
              <div>
                <p className="font-medium text-sm">{u.full_name || u.username}</p>
                <p className="text-xs text-gray-500">@{u.username} &middot; <span className={u.role === 'admin' ? 'text-yellow-600 font-medium' : ''}>{u.role}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleRole(u.id, u.role)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title={u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}>
                {u.role === 'admin' ? <ShieldOff className="h-4 w-4 text-yellow-600" /> : <Shield className="h-4 w-4" />}
              </button>
              <button onClick={() => deleteUser(u.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {paginated.length === 0 && <p className="text-center text-gray-500 py-8">No users found.</p>}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
