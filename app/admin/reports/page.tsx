'use client';

import { useEffect, useState } from 'react';
import { getReports, updateReportStatus } from '@/lib/supabase';
import { Flag, CheckCircle, XCircle } from 'lucide-react';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    const data = await getReports();
    setReports(data);
    setLoading(false);
  };

  const handleResolve = async (id: string) => {
    await updateReportStatus(id, 'resolved');
    setReports(reports.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
  };

  const handleDismiss = async (id: string) => {
    await updateReportStatus(id, 'dismissed');
    setReports(reports.map(r => r.id === id ? { ...r, status: 'dismissed' } : r));
  };

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif">Reports</h1>
        <span className="text-sm text-gray-500">{reports.filter(r => r.status === 'pending').length} pending</span>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'resolved', 'dismissed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${filter === f ? 'bg-accent text-white' : 'bg-brand-muted dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id} className={`p-4 rounded-xl border ${r.status === 'pending' ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10' : 'border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Flag className={`h-4 w-4 shrink-0 ${r.status === 'pending' ? 'text-yellow-600' : r.status === 'resolved' ? 'text-green-600' : 'text-gray-400'}`} />
                  <p className="font-medium text-sm">{r.reason}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Reported by {r.reporter?.full_name || r.reporter?.username || 'Unknown'}
                  {r.stories?.title && <> &middot; Story: &ldquo;{r.stories.title}&rdquo;</>}
                  {r.reported_user?.username && <> &middot; User: @{r.reported_user.username}</>}
                  &middot; {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              {r.status === 'pending' && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleResolve(r.id)} className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors" title="Resolve">
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDismiss(r.id)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors" title="Dismiss">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              )}
              {r.status !== 'pending' && (
                <span className={`text-xs font-medium px-2 py-1 rounded ${r.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                  {r.status}
                </span>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-500 py-8">No reports found.</p>}
      </div>
    </div>
  );
}
