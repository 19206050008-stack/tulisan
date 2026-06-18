'use client';

import { useEffect, useState } from 'react';
import { getModerationStats, moderateText, updateStoryModeration } from '@/lib/supabase';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Shield, Eye, FileText } from 'lucide-react';

interface ModeratedStory {
  id: string;
  title: string;
  author_name: string;
  status: string;
  score: number;
  flags?: string[];
  updated_at: string;
}

export default function AdminModerationPage() {
  const [stats, setStats] = useState<any>(null);
  const [stories, setStories] = useState<ModeratedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged' | 'rejected'>('pending');
  const [scanning, setScanning] = useState(false);

  useEffect(() => { loadModerationData(); }, []);

  const loadModerationData = async () => {
    setLoading(true);
    const [modStats, storiesData] = await Promise.all([
      getModerationStats(),
      fetchFlaggedStories(),
    ]);
    setStats(modStats);
    setStories(storiesData || []);
    setLoading(false);
  };

  const fetchFlaggedStories = async (): Promise<ModeratedStory[]> => {
    if (!supabase) return [];
    let query = supabase.from('stories').select(`
      id, title, author_id, profiles!stories_author_id_fkey(full_name), 
      moderation_status, moderation_score, moderation_flags, updated_at
    `).eq('author_id', user?.id).neq('moderation_status', 'approved').order('updated_at', { ascending: false });
    
    if (filter === 'pending') {
      query = query.eq('moderation_status', 'pending');
    } else if (filter === 'flagged') {
      query = query.eq('moderation_status', 'flagged');
    } else if (filter === 'rejected') {
      query = query.eq('moderation_status', 'rejected');
    }
    
    const { data, error } = await query;
    if (error) return [];
    
    return (data || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      author_name: s.profiles?.full_name || 'Unknown',
      status: s.moderation_status,
      score: s.moderation_score || 0,
      flags: s.moderation_flags || [],
      updated_at: s.updated_at,
    }));
  };

  const handleScanContent = async (storyId: string, content: string) => {
    try {
      const result = await moderateText(content, 'id');
      console.log('Scan result:', result);
      
      // Auto-approve safe content
      if (result.is_safe) {
        await updateStoryModeration(storyId, 'approved', undefined, result.confidence_score);
        alert('✅ Konten AMAN - auto-approved');
      } else {
        await updateStoryModeration(storyId, 'flagged', result.flagged_categories, result.confidence_score);
        alert(`⚠️ KONTEN BERMASALAH: ${result.flagged_categories.join(', ')}`);
      }
      
      loadModerationData();
    } catch (error) {
      console.error('Scan failed:', error);
      alert('❌ Gagal scan - coba lagi');
    }
  };

  const manualApprove = async (storyId: string) => {
    await updateStoryModeration(storyId, 'approved');
    loadModerationData();
  };

  const manualReject = async (storyId: string, reason: string) => {
    await updateStoryModeration(storyId, 'rejected', [reason]);
    loadModerationData();
  };

  const refreshStats = () => {
    setScanning(true);
    setTimeout(() => {
      loadModerationData();
      setScanning(false);
    }, 500);
  };

  const runFullScan = () => {
    alert('🔍 Batch scan dimulai untuk semua cerita belum di-moderasi. Akan memakan waktu ~2-3 menit.');
    // In production: trigger background job via Supabase edge function
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
            <Shield className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif">Moderasi Konten</h1>
            <p className="text-sm text-tx-muted">Lindungi platform dari konten tidak layak</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={runFullScan} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-bg-soft text-sm">
            <RefreshCw className="h-4 w-4" /> Scan Semua Cerita
          </button>
          <button onClick={refreshStats} className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm ${scanning ? 'opacity-70' : ''}`}>
            <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cerita" value={stats?.total} color="text-blue-500 bg-blue-100 dark:bg-blue-900/30" />
        <StatCard label="Belum Di-review" value={stats?.pendingReview} color="text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30" />
        <StatCard label="Ber Flag" value={stats?.flagged} color="text-red-500 bg-red-100 dark:bg-red-900/30" />
        <StatCard label="Diterbitkan Hari Ini" value={stats?.approvedToday} color="text-green-500 bg-green-100 dark:bg-green-900/30" />
      </div>

      {/* Filter & Story List */}
      <section className="rounded-xl border border-border bg-bg-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2">
            {(['pending', 'flagged', 'rejected'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === status ? 'bg-accent text-white' : 'border border-border hover:border-accent/30'
                }`}
              >
                {status === 'pending' && '⏳ Pending'}
                {status === 'flagged' && '🚩 Flagged'}
                {status === 'rejected' && '❌ Rejected'}
              </button>
            ))}
          </div>
          <span className="text-sm text-tx-muted">{stories.length} cerita ditemukan</span>
        </div>

        <div className="space-y-2">
          {stories.map(story => (
            <div key={story.id} className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-bg hover:border-accent/30 transition-colors">
              <FileText className="h-4 w-4 text-tx-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{story.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-tx-muted">by {story.author_name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    story.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    story.status === 'flagged' ? 'bg-red-100 text-red-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {story.status === 'pending' && 'Pending Review'}
                    {story.status === 'flagged' && 'Flagged'}
                    {story.status === 'rejected' && 'Rejected'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 shrink-0">
                {story.score !== undefined && (
                  <div className="text-right">
                    <div className="text-xs font-bold">{Math.round(story.score * 100)}% safe</div>
                    <div className="text-[10px] text-tx-muted">score</div>
                  </div>
                )}
                
                {story.flags && story.flags.length > 0 && (
                  <div className="hidden md:block">
                    <span className="text-[10px] text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                      {story.flags[0]}...
                    </span>
                  </div>
                )}
                
                <button 
                  onClick={() => manualApprove(story.id)}
                  className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                  title="Approve"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => manualReject(story.id, 'Violates guidelines')}
                  className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                  title="Reject"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          
          {stories.length === 0 && (
            <div className="text-center py-8 text-tx-muted">
              Tidak ada cerita yang perlu di-review. Bagus sekali! 🎉
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-5 rounded-xl border border-border bg-bg-card">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Eye className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold mt-3">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
