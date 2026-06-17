'use client';

import { useEffect, useState } from 'react';
import { getSiteConfig, setSiteConfig } from '@/lib/supabase';
import { Save, Plus, Trash2, FileText, Globe } from 'lucide-react';

type Lang = 'id' | 'en';
type TabKey = 'about' | 'community' | 'careers' | 'press' | 'terms' | 'privacy' | 'accessibility' | 'help';

export default function AdminPagesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('about');
  const [editLang, setEditLang] = useState<Lang>('id');

  const [data, setData] = useState<Record<string, any>>({});
  const [dataEn, setDataEn] = useState<Record<string, any>>({});

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'about', label: 'About' },
    { key: 'community', label: 'Community' },
    { key: 'careers', label: 'Careers' },
    { key: 'press', label: 'Press' },
    { key: 'terms', label: 'Terms' },
    { key: 'privacy', label: 'Privacy' },
    { key: 'accessibility', label: 'Accessibility' },
    { key: 'help', label: 'Help' },
  ];

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const keys = tabs.map(t => t.key);
    const idPromises = keys.map(k => getSiteConfig(`page_${k}`));
    const enPromises = keys.map(k => getSiteConfig(`page_${k}_en`));
    const [idResults, enResults] = await Promise.all([
      Promise.all(idPromises),
      Promise.all(enPromises)
    ]);
    const idObj: Record<string, any> = {};
    const enObj: Record<string, any> = {};
    keys.forEach((k, i) => { idObj[k] = idResults[i] || {}; enObj[k] = enResults[i] || {}; });
    setData(idObj);
    setDataEn(enObj);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    try {
      const promises: Promise<any>[] = [];
      tabs.forEach(t => {
        promises.push(setSiteConfig(`page_${t.key}`, data[t.key]));
        if (dataEn[t.key] && Object.keys(dataEn[t.key]).length > 0) {
          promises.push(setSiteConfig(`page_${t.key}_en`, dataEn[t.key]));
        }
      });
      await Promise.all(promises);
      setSuccess('All pages saved!');
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const activeData = editLang === 'id' ? data : dataEn;
  const setActiveData = (newData: any) => {
    if (editLang === 'id') setData({ ...data, [activeTab]: newData });
    else setDataEn({ ...dataEn, [activeTab]: newData });
  };
  const current = activeData[activeTab] || {};

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2"><FileText className="h-6 w-6" /> Page Content</h1>
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-input">
            <button
              onClick={() => setEditLang('id')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${editLang === 'id' ? 'bg-accent text-white' : 'text-tx-soft hover:text-tx'}`}
            >
              ID
            </button>
            <button
              onClick={() => setEditLang('en')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${editLang === 'en' ? 'bg-accent text-white' : 'text-tx-soft hover:text-tx'}`}
            >
              <Globe className="h-3 w-3" /> EN
            </button>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {success && <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">{success}</div>}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors capitalize whitespace-nowrap ${activeTab === tab.key ? 'border-accent text-accent' : 'border-transparent text-tx-soft hover:text-accent'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editing language indicator */}
      <div className="flex items-center gap-2 text-xs text-tx-muted">
        <Globe className="h-3.5 w-3.5" />
        Editing: <span className="font-bold uppercase text-accent">{editLang}</span>
        {editLang === 'en' && !dataEn[activeTab]?.title && (
          <button
            onClick={() => {
              // Copy ID to EN as starting point
              setDataEn({ ...dataEn, [activeTab]: JSON.parse(JSON.stringify(data[activeTab] || {})) });
            }}
            className="ml-2 px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            Copy from ID as starting point
          </button>
        )}
      </div>

      {/* Content editors */}
      {activeTab === 'about' && (
        <div className="space-y-4">
          <Field label="Title" value={current.title || ''} onChange={v => setActiveData({ ...current, title: v })} />
          <Field label="Subtitle" value={current.subtitle || ''} onChange={v => setActiveData({ ...current, subtitle: v })} />
          <TextareaField label="Story" value={current.story || ''} onChange={v => setActiveData({ ...current, story: v })} rows={5} />
          <Field label="Mission" value={current.mission || ''} onChange={v => setActiveData({ ...current, mission: v })} />
          <Field label="Community" value={current.community || ''} onChange={v => setActiveData({ ...current, community: v })} />
          <Field label="Reach" value={current.reach || ''} onChange={v => setActiveData({ ...current, reach: v })} />
          <Field label="Values" value={current.values || ''} onChange={v => setActiveData({ ...current, values: v })} />
        </div>
      )}

      {activeTab === 'community' && (
        <div className="space-y-4">
          <Field label="Title" value={current.title || ''} onChange={v => setActiveData({ ...current, title: v })} />
          <Field label="Subtitle" value={current.subtitle || ''} onChange={v => setActiveData({ ...current, subtitle: v })} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Guidelines</label>
            {(current.guidelines || []).map((g: string, i: number) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={g} onChange={e => { const arr = [...current.guidelines]; arr[i] = e.target.value; setActiveData({ ...current, guidelines: arr }); }} className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
                <button onClick={() => setActiveData({ ...current, guidelines: current.guidelines.filter((_: any, j: number) => j !== i) })} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setActiveData({ ...current, guidelines: [...(current.guidelines || []), ''] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add guideline</button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Featured Topics</label>
            {(current.featured_topics || []).map((t: any, i: number) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={t.title} onChange={e => { const arr = [...current.featured_topics]; arr[i] = { ...arr[i], title: e.target.value }; setActiveData({ ...current, featured_topics: arr }); }} placeholder="Title" className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
                <input type="text" value={t.category} onChange={e => { const arr = [...current.featured_topics]; arr[i] = { ...arr[i], category: e.target.value }; setActiveData({ ...current, featured_topics: arr }); }} placeholder="Category" className="w-32 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
                <button onClick={() => setActiveData({ ...current, featured_topics: current.featured_topics.filter((_: any, j: number) => j !== i) })} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setActiveData({ ...current, featured_topics: [...(current.featured_topics || []), { title: '', category: '' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add topic</button>
          </div>
        </div>
      )}

      {activeTab === 'careers' && (
        <div className="space-y-4">
          <Field label="Title" value={current.title || ''} onChange={v => setActiveData({ ...current, title: v })} />
          <Field label="Subtitle" value={current.subtitle || ''} onChange={v => setActiveData({ ...current, subtitle: v })} />
          <TextareaField label="Note (shown when no openings)" value={current.note || ''} onChange={v => setActiveData({ ...current, note: v })} rows={3} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Job Openings</label>
            {(current.openings || []).map((job: any, i: number) => (
              <div key={i} className="flex gap-2 flex-wrap">
                <input type="text" value={job.title} onChange={e => { const arr = [...current.openings]; arr[i] = { ...arr[i], title: e.target.value }; setActiveData({ ...current, openings: arr }); }} placeholder="Job title" className="flex-1 min-w-[150px] px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
                <input type="text" value={job.team} onChange={e => { const arr = [...current.openings]; arr[i] = { ...arr[i], team: e.target.value }; setActiveData({ ...current, openings: arr }); }} placeholder="Team" className="w-28 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
                <input type="text" value={job.location} onChange={e => { const arr = [...current.openings]; arr[i] = { ...arr[i], location: e.target.value }; setActiveData({ ...current, openings: arr }); }} placeholder="Location" className="w-28 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
                <input type="text" value={job.type} onChange={e => { const arr = [...current.openings]; arr[i] = { ...arr[i], type: e.target.value }; setActiveData({ ...current, openings: arr }); }} placeholder="Type" className="w-24 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
                <button onClick={() => setActiveData({ ...current, openings: current.openings.filter((_: any, j: number) => j !== i) })} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setActiveData({ ...current, openings: [...(current.openings || []), { title: '', team: '', location: 'Remote', type: 'Full-time' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add opening</button>
          </div>
        </div>
      )}

      {activeTab === 'press' && (
        <div className="space-y-4">
          <Field label="Title" value={current.title || ''} onChange={v => setActiveData({ ...current, title: v })} />
          <Field label="Subtitle" value={current.subtitle || ''} onChange={v => setActiveData({ ...current, subtitle: v })} />
          <Field label="Media Email" value={current.media_email || ''} onChange={v => setActiveData({ ...current, media_email: v })} />
          <Field label="Media Kit Note" value={current.media_kit_note || ''} onChange={v => setActiveData({ ...current, media_kit_note: v })} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Press Releases</label>
            {(current.releases || []).map((pr: any, i: number) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={pr.date} onChange={e => { const arr = [...current.releases]; arr[i] = { ...arr[i], date: e.target.value }; setActiveData({ ...current, releases: arr }); }} placeholder="Date" className="w-32 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
                <input type="text" value={pr.title} onChange={e => { const arr = [...current.releases]; arr[i] = { ...arr[i], title: e.target.value }; setActiveData({ ...current, releases: arr }); }} placeholder="Title" className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
                <button onClick={() => setActiveData({ ...current, releases: current.releases.filter((_: any, j: number) => j !== i) })} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setActiveData({ ...current, releases: [...(current.releases || []), { date: '', title: '' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add release</button>
          </div>
        </div>
      )}

      {['terms', 'privacy', 'accessibility'].includes(activeTab) && (
        <div className="space-y-4">
          <Field label="Title" value={current.title || ''} onChange={v => setActiveData({ ...current, title: v })} />
          <Field label="Last Updated" value={current.updated || ''} onChange={v => setActiveData({ ...current, updated: v })} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Sections</label>
            {(current.sections || []).map((s: any, i: number) => (
              <div key={i} className="space-y-1 p-3 rounded-lg bg-gray-100 dark:bg-gray-900">
                <input type="text" value={s.heading} onChange={e => { const arr = [...current.sections]; arr[i] = { ...arr[i], heading: e.target.value }; setActiveData({ ...current, sections: arr }); }} placeholder="Heading" className="w-full px-3 py-2 text-sm rounded-lg bg-bg-card border border-border focus:outline-none focus:border-accent" />
                <textarea value={s.content} onChange={e => { const arr = [...current.sections]; arr[i] = { ...arr[i], content: e.target.value }; setActiveData({ ...current, sections: arr }); }} rows={2} placeholder="Content" className="w-full px-3 py-2 text-sm rounded-lg bg-bg-card border border-border focus:outline-none focus:border-accent resize-none" />
                <button onClick={() => setActiveData({ ...current, sections: current.sections.filter((_: any, j: number) => j !== i) })} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ))}
            <button onClick={() => setActiveData({ ...current, sections: [...(current.sections || []), { heading: '', content: '' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add section</button>
          </div>
        </div>
      )}

      {activeTab === 'help' && (
        <div className="space-y-4">
          <Field label="Title" value={current.title || ''} onChange={v => setActiveData({ ...current, title: v })} />
          <Field label="Subtitle" value={current.subtitle || ''} onChange={v => setActiveData({ ...current, subtitle: v })} />
          <Field label="Support Email" value={current.support_email || ''} onChange={v => setActiveData({ ...current, support_email: v })} />
          <div className="space-y-2">
            <label className="text-sm font-medium">FAQ</label>
            {(current.faq || []).map((item: any, i: number) => (
              <div key={i} className="space-y-1 p-3 rounded-lg bg-gray-100 dark:bg-gray-900">
                <input type="text" value={item.q} onChange={e => { const arr = [...current.faq]; arr[i] = { ...arr[i], q: e.target.value }; setActiveData({ ...current, faq: arr }); }} placeholder="Question" className="w-full px-3 py-2 text-sm rounded-lg bg-bg-card border border-border focus:outline-none focus:border-accent" />
                <textarea value={item.a} onChange={e => { const arr = [...current.faq]; arr[i] = { ...arr[i], a: e.target.value }; setActiveData({ ...current, faq: arr }); }} rows={2} placeholder="Answer" className="w-full px-3 py-2 text-sm rounded-lg bg-bg-card border border-border focus:outline-none focus:border-accent resize-none" />
                <button onClick={() => setActiveData({ ...current, faq: current.faq.filter((_: any, j: number) => j !== i) })} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ))}
            <button onClick={() => setActiveData({ ...current, faq: [...(current.faq || []), { q: '', a: '' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add FAQ</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent resize-none" />
    </div>
  );
}
