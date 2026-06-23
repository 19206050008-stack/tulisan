'use client';

import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';
import { getChapters } from '@/lib/supabase/chapters';
import { TTS_VOICES } from '@/lib/tts-prefs';
import { renderTextToAudio, downloadBlob, sanitizeFilename, type AudioFormat } from '@/lib/audio-export';
import { Pagination } from '@/components/Pagination';
import { getGenreGradient } from '@/lib/genre-colors';
import { Search, Filter, Download, X, Loader2, Music } from 'lucide-react';

type StatusFilter = 'all' | 'published' | 'draft' | 'archived';
type SortOption = 'newest' | 'oldest' | 'most_reads' | 'most_likes' | 'az';

interface Progress { phase: string; done: number; total: number }

function chapterText(c: any): string {
  const raw = typeof c?.content === 'string' ? c.content : JSON.stringify(c?.content ?? '');
  return raw.replace(/<[^>]+>/g, ' ');
}

export default function AdminAudioCeritaPage() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  // Download modal state
  const [dl, setDl] = useState<any | null>(null);
  const [voice, setVoice] = useState(TTS_VOICES[0].id);
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [perBab, setPerBab] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  const categories = [...new Set(stories.map(s => s.category).filter(Boolean))].sort();
  const statusCounts = {
    all: stories.length,
    published: stories.filter(s => s.status === 'published').length,
    draft: stories.filter(s => s.status === 'draft').length,
    archived: stories.filter(s => s.status === 'archived').length,
  };

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

  const openDownload = (story: any) => {
    setErr(null);
    setProgress(null);
    setPerBab(false);
    setDl(story);
  };

  const startDownload = async () => {
    if (!dl) return;
    setBusy(true);
    setErr(null);
    try {
      const chapters = (await getChapters(dl.id)) || [];
      const valid = chapters.filter((c: any) => chapterText(c).trim().length > 2);

      if (perBab && valid.length > 0) {
        const zip = new JSZip();
        for (let i = 0; i < valid.length; i++) {
          const ch = valid[i];
          const label = `Bab ${i + 1}/${valid.length}`;
          setProgress({ phase: label, done: 0, total: 0 });
          const blob = await renderTextToAudio(chapterText(ch), voice, format, (d, t) =>
            setProgress({ phase: label, done: d, total: t }));
          const fname = `${String(i + 1).padStart(2, '0')}-${sanitizeFilename(ch.title || `Bab ${i + 1}`)}.${format}`;
          zip.file(fname, blob);
        }
        setProgress({ phase: 'Mengemas ZIP…', done: 0, total: 0 });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${sanitizeFilename(dl.title)}-audio-${voice}.zip`);
      } else {
        const text = valid.length
          ? valid.map((c: any) => chapterText(c)).join('\n\n')
          : (dl.description || dl.title);
        const blob = await renderTextToAudio(text, voice, format, (d, t) =>
          setProgress({ phase: 'Membuat audio', done: d, total: t }));
        downloadBlob(blob, `${sanitizeFilename(dl.title)}-${voice}.${format}`);
      }
      setDl(null);
    } catch (e: any) {
      setErr(e?.message || 'Gagal membuat audio');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold font-serif">Audio Cerita</h1>
        <span className="text-sm text-gray-500">{filtered.length} cerita</span>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Cari judul, penulis, kategori..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-bg-input rounded-lg text-sm focus:outline-none border border-border focus:border-accent" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${showFilters ? 'border-accent text-accent bg-accent/5' : 'border-border text-tx-soft hover:bg-bg-soft'}`}>
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-border bg-bg-card">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-tx-muted">Urutkan</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className="block px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx">
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="most_reads">Paling Banyak Dibaca</option>
                <option value="most_likes">Paling Banyak Disukai</option>
                <option value="az">Judul A-Z</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-tx-muted">Kategori</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="block px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx">
                <option value="all">Semua Kategori</option>
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
            <button key={status} onClick={() => setStatusFilter(status)} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors capitalize whitespace-nowrap ${statusFilter === status ? 'border-accent text-accent' : 'border-transparent text-tx-soft hover:text-accent'}`}>
              {status}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === status ? 'bg-accent/10' : 'bg-bg-input'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {paginated.map(s => (
          <div key={s.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-border bg-bg-card hover:border-accent/20 transition-colors gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {s.cover_url && !s.cover_url.startsWith('gradient:') ? (
                <img src={s.cover_url} alt="" className="w-10 h-14 rounded object-cover shrink-0" />
              ) : (
                <div className="w-10 h-14 rounded shrink-0" style={{ background: getGenreGradient(s.category) }} />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{s.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="text-xs text-gray-500">by {s.profiles?.full_name || s.profiles?.username || 'Unknown'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.status === 'published' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : s.status === 'archived' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'}`}>{s.status}</span>
                  {s.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-tx-soft">{s.category}</span>}
                  {s.is_completed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">Tamat</span>}
                </div>
              </div>
            </div>
            <button onClick={() => openDownload(s)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm font-medium shrink-0" title="Unduh audio">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Unduh</span>
            </button>
          </div>
        ))}
        {paginated.length === 0 && <p className="text-center text-gray-500 py-8">Tidak ada cerita.</p>}
      </div>

      {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}

      {/* Download modal */}
      {dl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setDl(null)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-card border border-border shadow-xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Music className="h-5 w-5 text-accent shrink-0" />
                <h2 className="text-base font-bold truncate">Unduh Audio</h2>
              </div>
              <button onClick={() => !busy && setDl(null)} className="p-1 rounded-full hover:bg-bg-soft disabled:opacity-40" disabled={busy}>
                <X className="h-4 w-4 text-tx-muted" />
              </button>
            </div>
            <p className="text-xs text-tx-muted truncate">{dl.title}</p>

            {/* Voice */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-tx-soft">Pilih Suara</span>
              {(['wanita', 'pria'] as const).map(g => (
                <div key={g}>
                  <p className="text-[10px] uppercase tracking-wide text-tx-muted mb-1">{g}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {TTS_VOICES.filter(v => v.gender === g).map(v => (
                      <button key={v.id} disabled={busy} onClick={() => setVoice(v.id)} className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${voice === v.id ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft hover:bg-bg-soft'}`}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Format */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-tx-soft">Format</span>
              <div className="grid grid-cols-2 gap-2">
                {(['mp3', 'wav'] as AudioFormat[]).map(f => (
                  <button key={f} disabled={busy} onClick={() => setFormat(f)} className={`px-3 py-2 rounded-lg text-xs font-medium uppercase transition-colors disabled:opacity-50 ${format === f ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft hover:bg-bg-soft'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-tx-soft">Mode</span>
              <div className="grid grid-cols-2 gap-2">
                <button disabled={busy} onClick={() => setPerBab(false)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${!perBab ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft hover:bg-bg-soft'}`}>
                  Satu file
                </button>
                <button disabled={busy} onClick={() => setPerBab(true)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${perBab ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft hover:bg-bg-soft'}`}>
                  Per bab (ZIP)
                </button>
              </div>
            </div>

            {progress && (
              <div className="space-y-1">
                <p className="text-[11px] text-tx-muted">{progress.phase}{progress.total ? ` — bagian ${progress.done}/${progress.total}` : ''}</p>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : '40%' }} />
                </div>
              </div>
            )}

            {err && <p className="text-xs text-red-500">{err}</p>}

            <button onClick={startDownload} disabled={busy} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {busy ? 'Membuat audio…' : 'Buat & Unduh'}
            </button>
            <p className="text-[10px] text-tx-muted text-center">Proses di server gratis (CPU) bisa lama untuk cerita panjang. Jangan tutup halaman.</p>
          </div>
        </div>
      )}
    </div>
  );
}
