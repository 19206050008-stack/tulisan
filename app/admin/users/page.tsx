'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, getProfileFrames } from '@/lib/supabase';
import { Trash2, Shield, ShieldOff, Search, ExternalLink, Filter, Users as UsersIcon, Crown } from 'lucide-react';
import { Pagination } from '@/components/Pagination';

type RoleFilter = 'all' | 'admin' | 'user' | 'author';
type SortOption = 'newest' | 'oldest' | 'az' | 'za';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [frameMap, setFrameMap] = useState<Record<string, string>>({});
  const perPage = 10;

  const loadUsers = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search, roleFilter, sortBy]);
  useEffect(() => {
    getProfileFrames().then((frames: any[]) => {
      const map: Record<string, string> = {};
      frames.forEach((f: any) => { if (f.id && f.svg_data) map[f.id] = f.svg_data; });
      setFrameMap(map);
    });
  }, []);

  const toggleRole = async (userId: string, currentRole: string) => {
    if (!supabase) return;
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change role to ${newRole}?`)) return;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { alert(`Gagal: ${error.message}`); return; }
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const deleteUser = async (userId: string) => {
    if (!supabase) return;
    if (!confirm('Hapus user ini secara permanen? Semua data akan hilang dan tidak bisa dikembalikan.')) return;
    const { error } = await supabase.rpc('delete_user_completely', { target_user_id: userId });
    if (error) { alert(`Gagal: ${error.message}`); return; }
    setUsers(users.filter(u => u.id !== userId));
  };

  // Role counts
  const roleCounts = {
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    user: users.filter(u => u.role === 'user' || u.role === 'author').length,
    author: users.filter(u => u.role === 'author').length,
  };

  // Filter + Sort
  const filtered = users
    .filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (u.full_name || '').toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.location || '').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'az': return (a.full_name || a.username || '').localeCompare(b.full_name || b.username || '');
        case 'za': return (b.full_name || b.username || '').localeCompare(a.full_name || a.username || '');
        default: return 0;
      }
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif">Manage Users</h1>
        <span className="text-sm text-gray-500">{filtered.length} users</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Users', value: users.length, icon: <UsersIcon className="h-4 w-4" />, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Admins', value: roleCounts.admin, icon: <Crown className="h-4 w-4" />, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' },
          { label: 'Regular Users', value: roleCounts.user, icon: <UsersIcon className="h-4 w-4" />, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl border border-border bg-bg-card flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-tx-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name, username, email, or location..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-bg-input rounded-lg text-sm focus:outline-none border border-border focus:border-accent" />
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
                <option value="az">Name A-Z</option>
                <option value="za">Name Z-A</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {(['all', 'admin', 'user'] as RoleFilter[]).map(role => {
          const count = roleCounts[role];
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors capitalize whitespace-nowrap ${roleFilter === role ? 'border-accent text-accent' : 'border-transparent text-tx-soft hover:text-accent'}`}
            >
              {role === 'admin' && <Crown className="h-3 w-3" />}
              {role}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${roleFilter === role ? 'bg-accent/10' : 'bg-bg-input'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* User list */}
      <div className="space-y-2">
        {paginated.map(u => (
          <div key={u.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-border bg-bg-card group hover:border-accent/20 transition-colors flex-wrap gap-2 sm:flex-nowrap">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-10 h-10 shrink-0">
                {u.frame_id && frameMap[u.frame_id] && (
                  <div className="absolute inset-[-3px] w-[46px] h-[46px] z-10 pointer-events-none" dangerouslySetInnerHTML={{ __html: frameMap[u.frame_id].replace('<svg', '<svg width="100%" height="100%"') }} />
                )}
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-sm font-bold text-accent">
                    {(u.full_name || u.username || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{u.full_name || u.username}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="text-xs text-gray-500 truncate max-w-[120px]">@{u.username}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${u.role === 'admin' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                    {u.role}
                  </span>
                  {u.location && <span className="text-[10px] text-tx-muted truncate max-w-[80px]">{u.location}</span>}
                  <span className="text-[10px] text-tx-muted">Joined {formatDate(u.created_at)}</span>
                </div>
                {u.bio && <p className="text-[11px] text-tx-soft mt-0.5 line-clamp-1">{u.bio}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link href={`/profile/${u.username}`} className="p-2 rounded-lg hover:bg-bg-soft transition-colors text-tx-muted hover:text-tx" title="View profile" target="_blank">
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button onClick={() => toggleRole(u.id, u.role)} className="p-2 rounded-lg hover:bg-bg-soft transition-colors" title={u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}>
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

      {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
    </div>
  );
}
