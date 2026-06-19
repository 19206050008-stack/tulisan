'use client';

import { useState, useEffect } from 'react';
import { getPressArticles, createPressArticle, updatePressArticle, deletePressArticle } from '@/lib/supabase';
import { Plus, Trash2, Edit, Eye, EyeOff, Search, Newspaper, Save, X, ExternalLink, RefreshCw } from 'lucide-react';
import { Pagination } from '@/components/Pagination';

type ArticleStatus = 'all' | 'published' | 'draft';

export default function AdminPressPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ArticleStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  // Editor state
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', title_en: '', slug: '', excerpt: '', excerpt_en: '',
    cover_url: '', category: 'news', tags: '' as string,
    content: '' as string, content_en: '' as string, published: false,
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadArticles = async () => {
    setLoading(true);
    const data = await getPressArticles(false);
    setArticles(data);
    setLoading(false);
  };

  useEffect(() => { loadArticles(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const startEdit = (article: any) => {
    setEditing(article);
    setForm({
      title: article.title || '',
      title_en: article.title_en || '',
      slug: article.slug || '',
      excerpt: article.excerpt || '',
      excerpt_en: article.excerpt_en || '',
      cover_url: article.cover_url || '',
      category: article.category || 'news',
      tags: (article.tags || []).join(', '),
      content: JSON.stringify(article.content || [], null, 2),
      content_en: JSON.stringify(article.content_en || [], null, 2),
      published: article.published || false,
    });
    setShowForm(true);
  };

  const startNew = () => {
    setEditing(null);
    setForm({
      title: '', title_en: '', slug: '', excerpt: '', excerpt_en: '',
      cover_url: '', category: 'news', tags: '',
      content: '[{"type":"paragraph","text":""}]',
      content_en: '[{"type":"paragraph","text":""}]',
      published: false,
    });
    setShowForm(true);
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) { alert('Title and slug are required.'); return; }
    setSaving(true);
    try {
      let contentArr: any[];
      let contentEnArr: any[];
      try { contentArr = JSON.parse(form.content); } catch { contentArr = [{ type: 'paragraph', text: form.content }]; }
      try { contentEnArr = JSON.parse(form.content_en); } catch { contentEnArr = [{ type: 'paragraph', text: form.content_en }]; }

      const data = {
        title: form.title,
        title_en: form.title_en || undefined,
        slug: form.slug,
        excerpt: form.excerpt || undefined,
        excerpt_en: form.excerpt_en || undefined,
        cover_url: form.cover_url || undefined,
        category: form.category,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        content: contentArr,
        content_en: contentEnArr,
        published: form.published,
        published_at: form.published ? new Date().toISOString() : undefined,
      };

      if (editing) {
        await updatePressArticle(editing.id, data);
      } else {
        await createPressArticle(data);
      }
      setShowForm(false);
      loadArticles();
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    await deletePressArticle(id);
    setArticles(articles.filter(a => a.id !== id));
  };

  const togglePublish = async (article: any) => {
    const published = !article.published;
    await updatePressArticle(article.id, { published, published_at: published ? new Date().toISOString() : undefined });
    setArticles(articles.map(a => a.id === article.id ? { ...a, published } : a));
  };

  // Generate article using Pollinations AI
  const generateArticle = async () => {
    if (!form.title.trim()) { alert('Please enter a title first.'); return; }
    setGenerating(true);
    try {
      const prompt = `Write a blog article about "${form.title}" for a storytelling platform called Di.tulis. Write in a professional but engaging tone. Output as JSON array with objects like {"type":"heading","text":"..."} and {"type":"paragraph","text":"..."}. Include 1 heading and 4-6 paragraphs.`;
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`);
      const text = await res.text();
      // Try to extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setForm(f => ({ ...f, content: JSON.stringify(parsed, null, 2) }));
      } else {
        // Use raw text as paragraphs
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        const content = paragraphs.map(p => ({ type: 'paragraph', text: p.trim() }));
        setForm(f => ({ ...f, content: JSON.stringify(content, null, 2) }));
      }
    } catch (e: any) {
      alert('Failed to generate: ' + e.message);
    }
    setGenerating(false);
  };

  const filtered = articles.filter(a => {
    if (statusFilter === 'published' && !a.published) return false;
    if (statusFilter === 'draft' && a.published) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || (a.excerpt || '').toLowerCase().includes(q) || (a.category || '').includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const categoryLabels: Record<string, string> = {
    news: '📰 News', announcement: '📢 Announcement', tutorial: '📖 Tutorial',
    interview: '🎙️ Interview', review: '⭐ Review', feature: '✨ Feature',
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2"><Newspaper className="h-6 w-6" /> Press Articles</h1>
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New Article
        </button>
      </div>

      {/* Stats + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 border-b border-border">
          {(['all', 'published', 'draft'] as ArticleStatus[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-medium border-b-2 capitalize transition-colors ${statusFilter === s ? 'border-accent text-accent' : 'border-transparent text-tx-soft hover:text-accent'}`}>
              {s} ({s === 'all' ? articles.length : s === 'published' ? articles.filter(a => a.published).length : articles.filter(a => !a.published).length})
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-bg-input rounded-lg text-sm focus:outline-none border border-border focus:border-accent" />
        </div>
      </div>

      {/* Editor Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/50" onClick={() => setShowForm(false)}>
          <div className="relative w-full max-w-2xl bg-bg-card rounded-2xl shadow-2xl p-6 space-y-4 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-serif">{editing ? 'Edit Article' : 'New Article'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-bg-soft"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Title (ID) *</label>
                  <input type="text" value={form.title} onChange={e => { setForm({ ...form, title: e.target.value, slug: form.slug || generateSlug(e.target.value) }); }} className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Title (EN)</label>
                  <input type="text" value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Slug *</label>
                  <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx">
                    {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Tags (comma separated)</label>
                <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="writing, tips, beginner" className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Cover Image URL</label>
                <input type="url" value={form.cover_url} onChange={e => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Excerpt (ID)</label>
                  <textarea value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} rows={2} className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent resize-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Excerpt (EN)</label>
                  <textarea value={form.excerpt_en} onChange={e => setForm({ ...form, excerpt_en: e.target.value })} rows={2} className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent resize-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Content (ID) — JSON array</label>
                  <button type="button" onClick={generateArticle} disabled={generating} className="flex items-center gap-1 text-[10px] font-medium text-accent hover:underline disabled:opacity-50">
                    <RefreshCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} /> {generating ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={8} className="w-full px-3 py-2 text-xs rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent resize-none font-mono" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Content (EN) — JSON array</label>
                <textarea value={form.content_en} onChange={e => setForm({ ...form, content_en: e.target.value })} rows={8} className="w-full px-3 py-2 text-xs rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent resize-none font-mono" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} className="rounded border-gray-300 text-accent focus:ring-accent" />
                <span className="text-sm font-medium">Published</span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-bg-soft">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Articles list */}
      <div className="space-y-2">
        {paginated.map(article => (
          <div key={article.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-bg-card group hover:border-accent/20 transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {article.cover_url ? (
                <img src={article.cover_url} alt="" className="w-14 h-10 rounded object-cover shrink-0" />
              ) : (
                <div className="w-14 h-10 rounded bg-bg-input flex items-center justify-center shrink-0"><Newspaper className="h-4 w-4 text-tx-muted" /></div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{article.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="text-[10px] text-tx-muted">{categoryLabels[article.category] || article.category}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${article.published ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'}`}>
                    {article.published ? 'Published' : 'Draft'}
                  </span>
                  <span className="text-[10px] text-tx-muted">{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {article.published && (
                <a href={`/press/articles/${article.slug}`} target="_blank" className="p-2 rounded-lg hover:bg-bg-soft transition-colors text-tx-muted" title="View">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <button onClick={() => togglePublish(article)} className="p-2 rounded-lg hover:bg-bg-soft transition-colors" title={article.published ? 'Unpublish' : 'Publish'}>
                {article.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button onClick={() => startEdit(article)} className="p-2 rounded-lg hover:bg-bg-soft transition-colors" title="Edit">
                <Edit className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(article.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {paginated.length === 0 && <p className="text-center text-gray-500 py-8">No articles found.</p>}
      </div>

      {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
    </div>
  );
}
