'use client';

import { useState, useEffect } from 'react';
import { getAdRequests, updateAdRequestStatus, supabase, generateBanner } from '@/lib/supabase';
import { CheckCircle, XCircle, Eye, Clock, FileText, Calendar, Filter, MessageSquare, Send, ExternalLink, Play, Wand2 } from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { BannerUpload } from '@/components/BannerUpload';

type StatusFilter = 'all' | 'pending' | 'approved' | 'published' | 'rejected';

const BANNER_WIDTH = 728;
const BANNER_HEIGHT = 90;

export default function AdminAdsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [generatingBanner, setGeneratingBanner] = useState(false);
  const perPage = 10;

  useEffect(() => { loadRequests(); }, []);
  useEffect(() => { setCurrentPage(1); }, [statusFilter]);

  const loadRequests = async () => {
    setLoading(true);
    const data = await getAdRequests();
    setRequests(data);
    setLoading(false);
  };

  const handleBannerReady = (file: File) => {
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setGeneratingBanner(false);
  };

  const generateBannerPreview = async (title?: string, description?: string, category?: string) => {
    if (!title) { alert('Judul cerita diperlukan untuk generate banner.'); return; }
    setGeneratingBanner(true);
    try {
      const imageUrl = await generateBanner(title, description, category);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const timestampedFilename = `banner-${Date.now()}.jpg`;
      const generatedFile = new File([blob], timestampedFilename, { type: 'image/jpeg' });
      handleBannerReady(generatedFile);
    } catch (err: any) {
      console.error('Banner generation error:', err);
      alert('Gagal generate banner. Silakan upload manual atau coba lagi.');
      setGeneratingBanner(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this ad request?')) return;
    await updateAdRequestStatus(id, 'approved', undefined, adminNotes || undefined);
    setRequests(requests.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    setActionId(null);
    setAdminNotes('');
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Publish this ad? It will be shown to all visitors within the date range.')) return;
    await updateAdRequestStatus(id, 'published');
    setRequests(requests.map(r => r.id === id ? { ...r, status: 'published' } : r));
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) { alert('Please provide a rejection reason.'); return; }
    await updateAdRequestStatus(id, 'rejected', rejectionReason, adminNotes || undefined);
    setRequests(requests.map(r => r.id === id ? { ...r, status: 'rejected', rejection_reason: rejectionReason } : r));
    setActionId(null);
    setRejectionReason('');
    setAdminNotes('');
  };

  const filtered = requests.filter(r => statusFilter === 'all' || r.status === statusFilter);
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    published: requests.filter(r => r.status === 'published').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const statusConfig: Record<string, { color: string; icon: any }> = {
    pending: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: Clock },
    approved: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: CheckCircle },
    published: { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: Eye },
    rejected: { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: XCircle },
    expired: { color: 'bg-gray-100 dark:bg-gray-800 text-gray-500', icon: Clock },
    cancelled: { color: 'bg-gray-100 dark:bg-gray-800 text-gray-500', icon: XCircle },
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif">Manage Advertisements</h1>
        <span className="text-sm text-gray-500">{filtered.length} requests</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: statusCounts.pending, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' },
          { label: 'Approved', value: statusCounts.approved, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Published', value: statusCounts.published, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
          { label: 'Rejected', value: statusCounts.rejected, color: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl border border-border bg-bg-card">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mb-2 ${s.color}`}>{s.value}</div>
            <p className="text-xs text-tx-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {(['pending', 'approved', 'published', 'rejected', 'all'] as StatusFilter[]).map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors capitalize whitespace-nowrap ${statusFilter === status ? 'border-accent text-accent' : 'border-transparent text-tx-soft hover:text-accent'}`}
          >
            {status}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === status ? 'bg-accent/10' : 'bg-bg-input'}`}>{statusCounts[status]}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {paginated.map(req => {
          const config = statusConfig[req.status] || statusConfig.pending;
          const Icon = config.icon;
          return (
            <div key={req.id} className="p-4 rounded-xl border border-border bg-bg-card space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{req.title}</h3>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${config.color}`}>
                      <Icon className="h-3 w-3" /> {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-tx-soft mt-0.5">
                    by {req.profiles?.full_name || req.profiles?.username || 'Unknown'} (@{req.profiles?.username})
                    {req.stories && <span> — promoting: <strong>{req.stories.title}</strong></span>}
                  </p>
                  {req.description && <p className="text-xs text-tx-muted mt-1">{req.description}</p>}
                </div>
              </div>

              {/* Banner preview */}
              {req.image_url && !bannerPreview && (
                <div className="p-2 rounded-lg bg-bg-input">
                  <img src={req.image_url} alt="Banner" className="max-w-full max-h-20 rounded object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}

              <div className="mt-4 border-t border-border pt-4">
                <h4 className="text-xs font-bold text-tx-soft mb-2">Generate Banner Iklan</h4>
                
                {bannerPreview ? (
                  <div className="space-y-2">
                    <img src={bannerPreview} alt="Banner Preview" className="w-full max-w-[728px] h-auto rounded-lg mx-auto bg-bg-input object-contain" style={{ maxHeight: '120px' }} />
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-bg-soft cursor-pointer">
                        <Upload className="h-3 w-3" /> Upload Manual
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBannerReady(file);
                        }} className="hidden" />
                      </label>
                      <button onClick={() => setBannerPreview(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-bg-soft">Hapus Banner</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => generateBannerPreview(req.title, req.description, req.profiles?.username || undefined)}
                      disabled={generatingBanner}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-accent text-accent text-xs font-medium hover:bg-accent/10 transition-colors disabled:opacity-50"
                    >
                      <Wand2 className="h-3.5 w-3.5" /> Generate Banner dari Judul
                    </button>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                      Banner akan digenerate otomatis menggunakan judul + deskripsi cerita Anda ({BANNER_WIDTH}x{BANNER_HEIGHT}px)
                    </p>
                  </div>
                )}

                {generatingBanner && <p className="text-xs text-tx-muted animate-pulse">Generating banner...</p>}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-tx-muted">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {req.start_date} — {req.end_date}</span>
                {req.status === 'published' && (
                  <>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {req.views_count || 0} views</span>
                    <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" /> {req.clicks_count || 0} clicks</span>
                  </>
                )}
              </div>

              {/* Rejection reason */}
              {req.rejection_reason && (
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/10 text-xs text-red-600 dark:text-red-400">
                  <strong>Rejection reason:</strong> {req.rejection_reason}
                </div>
              )}

              {/* Actions */}
              {req.status === 'pending' && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  {actionId === req.id ? (
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={adminNotes}
                        onChange={e => setAdminNotes(e.target.value)}
                        placeholder="Admin notes (optional)..."
                        rows={2}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(req.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600">
                          <CheckCircle className="h-3 w-3" /> Approve
                        </button>
                        <button onClick={() => { setActionId(null); setAdminNotes(''); }} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-bg-soft">Cancel</button>
                      </div>
                    </div>
                  ) : actionId === `reject-${req.id}` ? (
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Rejection reason (required)..."
                        rows={2}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-bg-input border border-border focus:outline-none focus:border-red-400 resize-none"
                        required
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleReject(req.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600">
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                        <button onClick={() => { setActionId(null); setRejectionReason(''); }} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-bg-soft">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setActionId(req.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600">
                        <CheckCircle className="h-3 w-3" /> Approve
                      </button>
                      <button onClick={() => setActionId(`reject-${req.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600">
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                    </>
                  )}
                </div>
              )}

              {req.status === 'approved' && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <button onClick={() => handlePublish(req.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90">
                    <Play className="h-3 w-3" /> Publish Now
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {paginated.length === 0 && <p className="text-center text-gray-500 py-8">No ad requests found.</p>}
      </div>

      {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
    </div>
  );
}
