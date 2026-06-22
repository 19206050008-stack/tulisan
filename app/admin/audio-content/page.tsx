'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { getAllStoriesWithAudio, approveAudioRequest, rejectAudioRequest, deleteAudioContent } from '@/lib/supabase/admin';
import { FileAudio, Play, CheckCircle, XCircle, Trash2, Download, Search, Filter, ChevronDown, ChevronUp, DownloadCloud } from 'lucide-react';
import Link from 'next/link';

interface AudioStory {
  id: string;
  title: string;
  author: { username: string; full_name?: string };
  chapterId?: string;
  chapterTitle?: string;
  has_audio: boolean;
  request_id?: string;
  audio_status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  story_status: 'published' | 'draft' | 'archived';
  created_at?: string;
}

export default function AdminAudioPage() {
  const { role } = useStore();
  const [stories, setStories] = useState<AudioStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'author'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (role !== 'admin') return;
    loadAudioStories();
  }, [role]);

  const loadAudioStories = async () => {
    setLoading(true);
    try {
      const data = await getAllStoriesWithAudio();
      setStories(data || []);
    } catch (err) {
      console.error('Error loading audio stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm('Setujui permintaan audio ini?')) return;
    
    try {
      await approveAudioRequest(requestId);
      await loadAudioStories();
    } catch (err) {
      alert('Gagal menyetujui: ' + (err as Error).message);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    if (!reason.trim()) {
      alert('Masukkan alasan penolakan!');
      return;
    }
    if (!confirm(`Tolak permintaan dengan alasan: ${reason}`)) return;
    
    try {
      await rejectAudioRequest(requestId, reason);
      await loadAudioStories();
    } catch (err) {
      alert('Gagal menolak: ' + (err as Error).message);
    }
  };

  const handleDeleteAudio = async (storyId: string, chapterId?: string) => {
    if (!confirm('Hapus file audio ini?')) return;
    
    try {
      await deleteAudioContent(storyId, chapterId);
      await loadAudioStories();
    } catch (err) {
      alert('Gagal menghapus: ' + (err as Error).message);
    }
  };

  // Filter and sort stories
  const filteredStories = stories.filter(s => {
    if (filterStatus !== 'all' && s.audio_status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.title.toLowerCase().includes(q) ||
        (s.author.full_name || '').toLowerCase().includes(q) ||
        (s.author.username || '').toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest': return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case 'oldest': return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      case 'title': return a.title.localeCompare(b.title);
      case 'author': return (a.author.full_name || '').localeCompare(b.author.full_name || '');
      default: return 0;
    }
  });

  if (role !== 'admin') {
    return <div className="text-center py-16">Akses ditolak</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold font-serif mb-2 flex items-center gap-2">
          <FileAudio className="h-6 w-6 text-accent" />
          Kelola Konten Audio
        </h1>
        <p className="text-sm text-tx-muted">Review dan approve permintaan audio dari pembaca</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Cerita" value={stories.length} icon={FileAudio} />
        <StatCard label="Pending" value={stories.filter(s => s.audio_status === 'pending').length} icon={ChevronDown} />
        <StatCard label="Approved" value={stories.filter(s => s.audio_status === 'approved').length} icon={CheckCircle} />
        <StatCard label="Processing" value={stories.filter(s => s.audio_status === 'processing').length} icon={Play} />
        <StatCard label="Rejected" value={stories.filter(s => s.audio_status === 'rejected').length} icon={XCircle} />
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari cerita atau penulis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 ${showFilters ? 'bg-accent/10 border-accent text-accent' : 'border-border text-tx-muted hover:bg-bg-soft'}`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 text-sm rounded-lg bg-bg-input border border-border [&>option]:bg-bg-card [&>option]:text-tx"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-sm rounded-lg bg-bg-input border border-border [&>option]:bg-bg-card [&>option]:text-tx"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="title">Judul A-Z</option>
              <option value="author">Penulis</option>
            </select>

            <button
              onClick={loadAudioStories}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
            >
              Refresh Data
            </button>
          </div>
        )}
      </div>

      {/* Stories List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="text-center py-16 text-tx-muted">
          <FileAudio className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Tidak ada konten audio ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStories.map((story) => (
            <AudioStoryCard
              key={story.id}
              story={story}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDeleteAudio}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Reusable Stat Card Component
function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-accent/10">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-tx-muted">{label}</p>
      </div>
    </div>
  );
}

// Audio Story Card Component
function AudioStoryCard({ story, onApprove, onReject, onDelete }: {
  story: AudioStory;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onDelete: (storyId: string, chapterId?: string) => void;
}) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const getStatusBadge = () => {
    switch (story.audio_status) {
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Pending</span>;
      case 'approved':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Approved</span>;
      case 'processing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Processing</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Completed</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Rejected</span>;
    }
  };

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 transition-colors hover:border-accent/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link href={`/story/${story.id}`} className="text-sm font-medium truncate hover:text-accent transition-colors">
              {story.title}
            </Link>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-tx-muted mb-2">
            oleh {story.author.full_name || story.author.username}
          </p>
          {story.chapterTitle && (
            <p className="text-[10px] text-tx-muted">
              Bab: {story.chapterTitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {story.audio_status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(story.request_id || '')}
                className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                title="Setujui"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setShowRejectReason(true);
                  setRejectReason('');
                }}
                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                title="Tolak"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          
          {(story.audio_status === 'approved' || story.audio_status === 'completed') && (
            <button
              onClick={() => onDelete(story.id, story.chapterId)}
              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
              title="Hapus file audio"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Reject Reason Modal */}
      {showRejectReason && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Alasan penolakan (contoh: kualitas audio rendah, terlalu panjang, dll)"
            rows={2}
            maxLength={500}
            className="w-full px-2 py-1 text-xs rounded border border-red-200 dark:border-red-800 bg-white dark:bg-red-900/30 text-tx resize-none"
          />
          <p className="text-[10px] text-right text-red-600 dark:text-red-400 mt-1">{rejectReason.length}/500</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                onReject(story.request_id || '', rejectReason);
                setShowRejectReason(false);
                setRejectReason('');
              }}
              className="px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Tolak
            </button>
            <button
              onClick={() => {
                setShowRejectReason(false);
                setRejectReason('');
              }}
              className="px-2 py-1 text-xs font-medium rounded bg-gray-200 dark:bg-gray-700 text-tx-hover hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
