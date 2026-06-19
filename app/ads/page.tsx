'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getAdRequests, createAdRequest, supabase } from '@/lib/supabase';
import { translations } from '@/lib/i18n';
import { Plus, Image as ImageIcon, Calendar, Clock, CheckCircle, XCircle, AlertCircle, FileText, Eye, Send, RefreshCw } from 'lucide-react';
import { BannerUpload } from '@/components/BannerUpload';

export default function AdsPage() {
  const router = useRouter();
  const { user, role, _hasHydrated, lang } = useStore();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stories, setStories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storyId, setStoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const labels = lang === 'en' ? {
    title: 'My Advertisements',
    subtitle: 'Promote your stories with banner ads displayed to all visitors.',
    newAd: 'New Ad Request',
    noAds: 'You have no ad requests yet.',
    createFirst: 'Create your first ad to promote your stories!',
    adTitle: 'Ad Title',
    adTitlePh: 'Catchy title for your ad...',
    adDesc: 'Description (optional)',
    adDescPh: 'Brief description of your ad...',
    selectStory: 'Select Story (optional)',
    noStory: 'No specific story',
    imageUrl: 'Banner Image URL',
    imageUrlPh: 'https://example.com/banner.png',
    imageHint: 'Recommended: 728x90 or 300x250 px. You can use Canva to create banners.',
    dateRange: 'Date Range',
    startDate: 'Start Date',
    endDate: 'End Date',
    submit: 'Submit Ad Request',
    cancel: 'Cancel',
    pending: 'Pending Review',
    approved: 'Approved',
    published: 'Published (Live)',
    rejected: 'Rejected',
    expired: 'Expired',
    cancelled: 'Cancelled',
    reason: 'Reason',
    views: 'Views',
    clicks: 'Clicks',
    success: 'Ad request submitted! Admin will review it shortly.',
    resubmit: 'Resubmit',
    resubmitNote: 'Please modify your ad before resubmitting.',
  } : {
    title: 'Iklan Saya',
    subtitle: 'Promosikan cerita Anda dengan iklan banner yang ditampilkan ke semua pengunjung.',
    newAd: 'Request Iklan Baru',
    noAds: 'Anda belum memiliki request iklan.',
    createFirst: 'Buat iklan pertama untuk mempromosikan cerita Anda!',
    adTitle: 'Judul Iklan',
    adTitlePh: 'Judul menarik untuk iklan Anda...',
    adDesc: 'Deskripsi (opsional)',
    adDescPh: 'Deskripsi singkat iklan Anda...',
    selectStory: 'Pilih Cerita (opsional)',
    noStory: 'Tanpa cerita spesifik',
    imageUrl: 'URL Gambar Banner',
    imageUrlPh: 'https://contoh.com/banner.png',
    imageHint: 'Rekomendasi: 728x90 atau 300x250 px. Anda bisa pakai Canva untuk membuat banner.',
    dateRange: 'Rentang Tanggal',
    startDate: 'Tanggal Mulai',
    endDate: 'Tanggal Selesai',
    submit: 'Kirim Request Iklan',
    cancel: 'Batal',
    pending: 'Menunggu Review',
    approved: 'Disetujui',
    published: 'Ditayangkan (Live)',
    rejected: 'Ditolak',
    expired: 'Kedaluwarsa',
    cancelled: 'Dibatalkan',
    reason: 'Alasan',
    views: 'Dilihat',
    clicks: 'Diklik',
    success: 'Request iklan terkirim! Admin akan segera mereview.',
    resubmit: 'Kirim Ulang',
    resubmitNote: 'Mohon ubah iklan Anda sebelum mengirim ulang.',
  };

  const statusConfig: Record<string, { color: string; icon: any }> = {
    pending: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: Clock },
    approved: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: CheckCircle },
    published: { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: Eye },
    rejected: { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: XCircle },
    expired: { color: 'bg-gray-100 dark:bg-gray-800 text-gray-500', icon: Clock },
    cancelled: { color: 'bg-gray-100 dark:bg-gray-800 text-gray-500', icon: XCircle },
  };

  const statusLabel = (s: string) => {
    return labels[s as keyof typeof labels] || s;
  };

  const loadRequests = async () => {
    setLoading(true);
    const data = await getAdRequests(user?.id);
    setRequests(data);
    setLoading(false);
  };

  const loadStories = async () => {
    if (!supabase || !user?.id) return;
    const { data } = await supabase
      .from('stories')
      .select('id, title, cover_url')
      .eq('author_id', user.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    setStories(data || []);
  };

  useEffect(() => {
    if (!_hasHydrated) return;
    if (role === 'guest') { router.push('/login'); return; }
    if (user?.id) {
      loadRequests();
      loadStories();
    }
  }, [user, role, _hasHydrated]);

  const handleSubmit = async () => {
    if (!title.trim() || !startDate || !endDate) {
      setError('Judul, tanggal mulai, dan tanggal selesai wajib diisi.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Upload banner first if file exists
      let finalImageUrl = imageUrl;
      if (bannerFile && supabase) {
        const formData = new FormData();
        formData.append('file', bannerFile);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('banners')
          .upload(`banner-${Date.now()}-${bannerFile.name}`, bannerFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('banners')
          .getPublicUrl(uploadData.path);
        
        finalImageUrl = publicUrl;
      }

      await createAdRequest({
        title,
        description: description || undefined,
        story_id: storyId || undefined,
        image_url: finalImageUrl || undefined,
        start_date: startDate,
        end_date: endDate,
      });

      setSuccess(labels.success);
      setShowForm(false);
      setTitle('');
      setDescription('');
      setStoryId('');
      setImageUrl('');
      setBannerFile(null);
      setBannerPreview('');
      setStartDate('');
      setEndDate('');
      
      // Reload requests
      const data = await getAdRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim request iklan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBannerReady = (file: File) => {
    setBannerFile(file);
    const previewUrl = URL.createObjectURL(file);
    setBannerPreview(previewUrl);
    setImageUrl(previewUrl);
  };

  const resubmitRejected = (req: any) => {
    setTitle(req.title);
    setDescription(req.description || '');
    setStoryId(req.story_id || '');
    setImageUrl(req.image_url || '');
    setStartDate('');
    setEndDate('');
    setShowForm(true);
  };

  if (!_hasHydrated || loading) {
    return <div className="max-w-3xl mx-auto space-y-6"><div className="h-10 bg-bg-input rounded animate-pulse w-1/3" /><div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-bg-input rounded-xl animate-pulse" />)}</div></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif">{labels.title}</h1>
          <p className="text-sm text-tx-soft mt-1">{labels.subtitle}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> {labels.newAd}
        </button>
      </div>

      {success && <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0" />{success}</div>}

      {/* Ad Request Form */}
      {showForm && (
        <div className="p-5 rounded-xl border border-accent/30 bg-bg-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> {labels.newAd}</h2>

          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{labels.adTitle} *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={labels.adTitlePh} className="w-full px-3 py-2.5 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{labels.adDesc}</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={labels.adDescPh} rows={2} className="w-full px-3 py-2.5 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent resize-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{labels.selectStory}</label>
              <select value={storyId} onChange={e => setStoryId(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx">
                <option value="">{labels.noStory}</option>
                {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{labels.imageUrl}</label>
              <BannerUpload
                preview={bannerPreview}
                onFileReady={handleBannerReady}
                title={title}
                description={description}
              />
              <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder={labels.imageUrlPh} className="w-full px-3 py-2.5 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent mt-2" />
              <p className="text-[11px] text-tx-muted">{labels.imageHint}</p>
              {imageUrl && !bannerPreview && (
                <div className="mt-2 p-2 rounded-lg bg-bg-input border border-border">
                  <img src={imageUrl} alt="Preview" className="max-w-full max-h-24 rounded object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{labels.startDate} *</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{labels.endDate} *</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" /> {submitting ? '...' : labels.submit}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }} className="px-4 py-2.5 rounded-lg border border-border text-sm hover:bg-bg-soft transition-colors">
              {labels.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Ad Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <ImageIcon className="h-12 w-12 mx-auto text-tx-muted opacity-30" />
          <p className="text-tx-muted">{labels.noAds}</p>
          <p className="text-sm text-tx-muted opacity-60">{labels.createFirst}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const config = statusConfig[req.status] || statusConfig.pending;
            const Icon = config.icon;
            return (
              <div key={req.id} className="p-4 rounded-xl border border-border bg-bg-card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm">{req.title}</h3>
                    {req.description && <p className="text-xs text-tx-soft mt-0.5 line-clamp-2">{req.description}</p>}
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium shrink-0 ml-2 ${config.color}`}>
                    <Icon className="h-3 w-3" />
                    {statusLabel(req.status)}
                  </span>
                </div>

                {/* Banner preview */}
                {req.image_url && (
                  <div className="p-2 rounded-lg bg-bg-input">
                    <img src={req.image_url} alt="Banner" className="max-w-full max-h-20 rounded object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-tx-muted">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {req.start_date} — {req.end_date}</span>
                  {req.stories && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {req.stories.title}</span>}
                  {req.status === 'published' && (
                    <>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {req.views_count || 0} {labels.views}</span>
                      <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {req.clicks_count || 0} {labels.clicks}</span>
                    </>
                  )}
                </div>

                {/* Rejection reason */}
                {req.status === 'rejected' && req.rejection_reason && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-sm">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">{labels.reason}:</p>
                    <p className="text-xs text-red-700 dark:text-red-300">{req.rejection_reason}</p>
                    <p className="text-[10px] text-red-500 mt-2">{labels.resubmitNote}</p>
                    <button onClick={() => resubmitRejected(req)} className="mt-2 flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                      <RefreshCw className="h-3 w-3" /> {labels.resubmit}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
