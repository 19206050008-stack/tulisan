'use client';

import { useEffect, useState } from 'react';
import { getAllFeaturedSlides, createFeaturedSlide, updateFeaturedSlide, deleteFeaturedSlide, supabase, setSiteConfig, getSiteConfig } from '@/lib/supabase';
import { Plus, Trash2, GripVertical, Eye, EyeOff, Image, RefreshCw } from 'lucide-react';

export default function AdminSliderPage() {
  const [slides, setSlides] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [topStories, setTopStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [sliderMode, setSliderMode] = useState<'auto' | 'custom'>('auto');
  const [form, setForm] = useState({ title: '', subtitle: '', story_id: '', image_url: '', badge: 'Featured', sort_order: 0 });

  const loadData = async () => {
    setLoading(true);
    const s = await getAllFeaturedSlides();
    setSlides(s);
    if (supabase) {
      const { data: allStories } = await supabase.from('stories').select('id, title, category, reads_count').eq('status', 'published').order('title');
      setStories(allStories || []);
      const { data: top } = await supabase.from('stories').select('id, title, description, category, cover_url, reads_count, profiles!stories_author_id_fkey(full_name, username)').eq('status', 'published').order('reads_count', { ascending: false }).limit(5);
      setTopStories(top || []);
    }
    const mode = await getSiteConfig('slider_mode');
    setSliderMode(mode === 'custom' ? 'custom' : 'auto');
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleModeChange = async (mode: 'auto' | 'custom') => {
    setSliderMode(mode);
    await setSiteConfig('slider_mode', mode);
  };

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    try {
      const slide = await createFeaturedSlide({
        title: form.title,
        subtitle: form.subtitle || undefined,
        story_id: form.story_id || undefined,
        image_url: form.image_url || undefined,
        badge: form.badge || 'Featured',
        sort_order: slides.length
      });
      setSlides([...slides, slide]);
      setForm({ title: '', subtitle: '', story_id: '', image_url: '', badge: 'Featured', sort_order: 0 });
      setShowAdd(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await updateFeaturedSlide(id, { active: !current });
    setSlides(slides.map(s => s.id === id ? { ...s, active: !current } : s));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this slide?')) return;
    await deleteFeaturedSlide(id);
    setSlides(slides.filter(s => s.id !== id));
  };

  const updateOrder = async (id: string, newOrder: number) => {
    await updateFeaturedSlide(id, { sort_order: newOrder });
    setSlides(slides.map(s => s.id === id ? { ...s, sort_order: newOrder } : s).sort((a, b) => a.sort_order - b.sort_order));
  };

  const autoGenerateSlides = async () => {
    if (!confirm('This will replace current slides with top 5 popular stories. Continue?')) return;
    for (const slide of slides) {
      await deleteFeaturedSlide(slide.id);
    }
    const newSlides = [];
    for (let i = 0; i < topStories.length; i++) {
      const s = topStories[i];
      const slide = await createFeaturedSlide({
        title: s.title,
        subtitle: s.description?.substring(0, 100) || '',
        story_id: s.id,
        badge: i === 0 ? 'Most Popular' : 'Trending',
        sort_order: i
      });
      newSlides.push(slide);
    }
    setSlides(newSlides);
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold font-serif">Hero Slider</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={autoGenerateSlides} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-bg-soft transition-colors">
            <RefreshCw className="h-4 w-4" /> Auto Generate
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Add Slide
          </button>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-bg-card space-y-3">
        <h3 className="font-semibold text-sm">Slider Mode</h3>
        <div className="flex gap-3">
          <button onClick={() => handleModeChange('auto')} className={`flex-1 p-3 rounded-lg border text-sm text-center transition-colors ${sliderMode === 'auto' ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-border'}`}>
            Auto (Top Popular)
          </button>
          <button onClick={() => handleModeChange('custom')} className={`flex-1 p-3 rounded-lg border text-sm text-center transition-colors ${sliderMode === 'custom' ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-border'}`}>
            Custom Slides
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {sliderMode === 'auto' ? 'Slider otomatis menampilkan 5 cerita terpopuler. Klik "Auto Generate" untuk refresh.' : 'Atur slide secara manual. Tambahkan, hapus, atau edit slide di bawah.'}
        </p>
      </div>

      {sliderMode === 'auto' && (
        <div className="p-4 rounded-xl border border-border bg-bg-card space-y-3">
          <h3 className="font-semibold text-sm">Current Top 5 Stories (Auto)</h3>
          <div className="space-y-2">
            {topStories.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-bg-input/50 text-sm">
                <span className="w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <span className="flex-1 truncate">{s.title}</span>
                <span className="text-xs text-gray-500">{s.reads_count || 0} reads</span>
                <span className="text-xs text-gray-400">{s.category}</span>
              </div>
            ))}
            {topStories.length === 0 && <p className="text-sm text-gray-500">No published stories yet.</p>}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="p-5 rounded-xl border border-border bg-bg-card space-y-4">
          <h3 className="font-semibold">Add New Slide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Slide title" className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subtitle</label>
              <input type="text" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Short description" className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Link to Story</label>
              <select value={form.story_id} onChange={e => setForm({ ...form, story_id: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input text-tx border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx">
                <option value="">None (custom slide)</option>
                {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Badge Text</label>
              <input type="text" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="e.g. Editor's Pick" className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Background Image URL</label>
              <input type="text" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} className="px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-full border border-border text-sm hover:bg-bg-soft">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold text-sm">{sliderMode === 'custom' ? 'Custom Slides' : 'Generated Slides'} ({slides.length})</h3>
        {slides.map((slide, i) => (
          <div key={slide.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${slide.active ? 'border-border bg-bg-card' : 'border-dashed border-gray-300 dark:border-gray-700 bg-bg-soft/50 opacity-60'}`}>
            <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
            <div className="w-16 h-10 rounded bg-bg-input shrink-0 overflow-hidden">
              {slide.image_url && !slide.image_url.startsWith('gradient:') && <img src={slide.image_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{slide.title}</p>
              <p className="text-xs text-gray-500 truncate">{slide.subtitle || 'No subtitle'} | {slide.badge}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input type="number" value={slide.sort_order} onChange={e => updateOrder(slide.id, parseInt(e.target.value) || 0)} className="w-12 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-900 border border-border text-center" />
              <button onClick={() => toggleActive(slide.id, slide.active)} className="p-2 rounded-lg hover:bg-bg-soft transition-colors" title={slide.active ? 'Hide' : 'Show'}>
                {slide.active ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button onClick={() => handleDelete(slide.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {slides.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <Image className="h-10 w-10 mx-auto text-gray-300" aria-hidden="true" />
            <p className="text-gray-500">No slides configured.</p>
            <p className="text-sm text-gray-400">Click &quot;Auto Generate&quot; to create from popular stories, or add custom slides.</p>
          </div>
        )}
      </div>
    </div>
  );
}
