'use client';

import { useEffect, useState } from 'react';
import { getSiteConfig, setSiteConfig } from '@/lib/supabase';
import { Save, Plus, Trash2, FileText } from 'lucide-react';

export default function AdminPagesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'about' | 'community' | 'careers' | 'press' | 'terms' | 'privacy' | 'accessibility' | 'help'>('about');

  const [about, setAbout] = useState<any>({});
  const [community, setCommunity] = useState<any>({});
  const [careers, setCareers] = useState<any>({});
  const [press, setPress] = useState<any>({});
  const [terms, setTerms] = useState<any>({});
  const [privacy, setPrivacy] = useState<any>({});
  const [accessibility, setAccessibility] = useState<any>({});
  const [help, setHelp] = useState<any>({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [a, c, ca, p, t, pr, ac, h] = await Promise.all([
      getSiteConfig('page_about'),
      getSiteConfig('page_community'),
      getSiteConfig('page_careers'),
      getSiteConfig('page_press'),
      getSiteConfig('page_terms'),
      getSiteConfig('page_privacy'),
      getSiteConfig('page_accessibility'),
      getSiteConfig('page_help')
    ]);
    setAbout(a || {});
    setCommunity(c || {});
    setCareers(ca || {});
    setPress(p || {});
    setTerms(t || {});
    setPrivacy(pr || {});
    setAccessibility(ac || {});
    setHelp(h || {});
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    try {
      await Promise.all([
        setSiteConfig('page_about', about),
        setSiteConfig('page_community', community),
        setSiteConfig('page_careers', careers),
        setSiteConfig('page_press', press),
        setSiteConfig('page_terms', terms),
        setSiteConfig('page_privacy', privacy),
        setSiteConfig('page_accessibility', accessibility),
        setSiteConfig('page_help', help)
      ]);
      setSuccess('All pages saved!');
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2"><FileText className="h-6 w-6" /> Page Content</h1>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {success && <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">{success}</div>}

      <div className="flex gap-2 border-b border-subtle dark:border-gray-700 overflow-x-auto">
        {(['about', 'community', 'careers', 'press', 'terms', 'privacy', 'accessibility', 'help'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors capitalize whitespace-nowrap ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'about' && (
        <div className="space-y-4">
          <Field label="Title" value={about.title || ''} onChange={v => setAbout({ ...about, title: v })} />
          <Field label="Subtitle" value={about.subtitle || ''} onChange={v => setAbout({ ...about, subtitle: v })} />
          <TextareaField label="Story" value={about.story || ''} onChange={v => setAbout({ ...about, story: v })} rows={5} />
          <Field label="Mission" value={about.mission || ''} onChange={v => setAbout({ ...about, mission: v })} />
          <Field label="Community" value={about.community || ''} onChange={v => setAbout({ ...about, community: v })} />
          <Field label="Reach" value={about.reach || ''} onChange={v => setAbout({ ...about, reach: v })} />
          <Field label="Values" value={about.values || ''} onChange={v => setAbout({ ...about, values: v })} />
        </div>
      )}

      {activeTab === 'community' && (
        <div className="space-y-4">
          <Field label="Title" value={community.title || ''} onChange={v => setCommunity({ ...community, title: v })} />
          <Field label="Subtitle" value={community.subtitle || ''} onChange={v => setCommunity({ ...community, subtitle: v })} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Guidelines</label>
            {(community.guidelines || []).map((g: string, i: number) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={g} onChange={e => { const arr = [...community.guidelines]; arr[i] = e.target.value; setCommunity({ ...community, guidelines: arr }); }} className="flex-1 px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <button onClick={() => setCommunity({ ...community, guidelines: community.guidelines.filter((_: any, j: number) => j !== i) })} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setCommunity({ ...community, guidelines: [...(community.guidelines || []), ''] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add guideline</button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Featured Topics</label>
            {(community.featured_topics || []).map((t: any, i: number) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={t.title} onChange={e => { const arr = [...community.featured_topics]; arr[i] = { ...arr[i], title: e.target.value }; setCommunity({ ...community, featured_topics: arr }); }} placeholder="Title" className="flex-1 px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <input type="text" value={t.category} onChange={e => { const arr = [...community.featured_topics]; arr[i] = { ...arr[i], category: e.target.value }; setCommunity({ ...community, featured_topics: arr }); }} placeholder="Category" className="w-32 px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <button onClick={() => setCommunity({ ...community, featured_topics: community.featured_topics.filter((_: any, j: number) => j !== i) })} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setCommunity({ ...community, featured_topics: [...(community.featured_topics || []), { title: '', category: '' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add topic</button>
          </div>
        </div>
      )}

      {activeTab === 'careers' && (
        <div className="space-y-4">
          <Field label="Title" value={careers.title || ''} onChange={v => setCareers({ ...careers, title: v })} />
          <Field label="Subtitle" value={careers.subtitle || ''} onChange={v => setCareers({ ...careers, subtitle: v })} />
          <TextareaField label="Note (shown when no openings)" value={careers.note || ''} onChange={v => setCareers({ ...careers, note: v })} rows={3} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Job Openings</label>
            {(careers.openings || []).map((job: any, i: number) => (
              <div key={i} className="flex gap-2 flex-wrap">
                <input type="text" value={job.title} onChange={e => { const arr = [...careers.openings]; arr[i] = { ...arr[i], title: e.target.value }; setCareers({ ...careers, openings: arr }); }} placeholder="Job title" className="flex-1 min-w-[150px] px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <input type="text" value={job.team} onChange={e => { const arr = [...careers.openings]; arr[i] = { ...arr[i], team: e.target.value }; setCareers({ ...careers, openings: arr }); }} placeholder="Team" className="w-28 px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <input type="text" value={job.location} onChange={e => { const arr = [...careers.openings]; arr[i] = { ...arr[i], location: e.target.value }; setCareers({ ...careers, openings: arr }); }} placeholder="Location" className="w-28 px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <input type="text" value={job.type} onChange={e => { const arr = [...careers.openings]; arr[i] = { ...arr[i], type: e.target.value }; setCareers({ ...careers, openings: arr }); }} placeholder="Type" className="w-24 px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <button onClick={() => setCareers({ ...careers, openings: careers.openings.filter((_: any, j: number) => j !== i) })} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setCareers({ ...careers, openings: [...(careers.openings || []), { title: '', team: '', location: 'Remote', type: 'Full-time' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add opening</button>
          </div>
        </div>
      )}

      {activeTab === 'press' && (
        <div className="space-y-4">
          <Field label="Title" value={press.title || ''} onChange={v => setPress({ ...press, title: v })} />
          <Field label="Subtitle" value={press.subtitle || ''} onChange={v => setPress({ ...press, subtitle: v })} />
          <Field label="Media Email" value={press.media_email || ''} onChange={v => setPress({ ...press, media_email: v })} />
          <Field label="Media Kit Note" value={press.media_kit_note || ''} onChange={v => setPress({ ...press, media_kit_note: v })} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Press Releases</label>
            {(press.releases || []).map((pr: any, i: number) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={pr.date} onChange={e => { const arr = [...press.releases]; arr[i] = { ...arr[i], date: e.target.value }; setPress({ ...press, releases: arr }); }} placeholder="Date" className="w-32 px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <input type="text" value={pr.title} onChange={e => { const arr = [...press.releases]; arr[i] = { ...arr[i], title: e.target.value }; setPress({ ...press, releases: arr }); }} placeholder="Title" className="flex-1 px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <button onClick={() => setPress({ ...press, releases: press.releases.filter((_: any, j: number) => j !== i) })} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setPress({ ...press, releases: [...(press.releases || []), { date: '', title: '' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add release</button>
          </div>
        </div>
      )}

      {activeTab === 'terms' && (
        <div className="space-y-4">
          <Field label="Title" value={terms.title || ''} onChange={v => setTerms({ ...terms, title: v })} />
          <Field label="Last Updated" value={terms.updated || ''} onChange={v => setTerms({ ...terms, updated: v })} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Sections</label>
            {(terms.sections || []).map((s: any, i: number) => (
              <div key={i} className="space-y-1 p-3 rounded-lg bg-brand-muted dark:bg-gray-900">
                <input type="text" value={s.heading} onChange={e => { const arr = [...terms.sections]; arr[i] = { ...arr[i], heading: e.target.value }; setTerms({ ...terms, sections: arr }); }} placeholder="Heading" className="w-full px-3 py-2 text-sm rounded-lg bg-brand-bg dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <textarea value={s.content} onChange={e => { const arr = [...terms.sections]; arr[i] = { ...arr[i], content: e.target.value }; setTerms({ ...terms, sections: arr }); }} rows={2} placeholder="Content" className="w-full px-3 py-2 text-sm rounded-lg bg-brand-bg dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent resize-none" />
                <button onClick={() => setTerms({ ...terms, sections: terms.sections.filter((_: any, j: number) => j !== i) })} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ))}
            <button onClick={() => setTerms({ ...terms, sections: [...(terms.sections || []), { heading: '', content: '' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add section</button>
          </div>
        </div>
      )}

      {activeTab === 'privacy' && (
        <div className="space-y-4">
          <Field label="Title" value={privacy.title || ''} onChange={v => setPrivacy({ ...privacy, title: v })} />
          <Field label="Last Updated" value={privacy.updated || ''} onChange={v => setPrivacy({ ...privacy, updated: v })} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Sections</label>
            {(privacy.sections || []).map((s: any, i: number) => (
              <div key={i} className="space-y-1 p-3 rounded-lg bg-brand-muted dark:bg-gray-900">
                <input type="text" value={s.heading} onChange={e => { const arr = [...privacy.sections]; arr[i] = { ...arr[i], heading: e.target.value }; setPrivacy({ ...privacy, sections: arr }); }} placeholder="Heading" className="w-full px-3 py-2 text-sm rounded-lg bg-brand-bg dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <textarea value={s.content} onChange={e => { const arr = [...privacy.sections]; arr[i] = { ...arr[i], content: e.target.value }; setPrivacy({ ...privacy, sections: arr }); }} rows={2} placeholder="Content" className="w-full px-3 py-2 text-sm rounded-lg bg-brand-bg dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent resize-none" />
                <button onClick={() => setPrivacy({ ...privacy, sections: privacy.sections.filter((_: any, j: number) => j !== i) })} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ))}
            <button onClick={() => setPrivacy({ ...privacy, sections: [...(privacy.sections || []), { heading: '', content: '' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add section</button>
          </div>
        </div>
      )}

      {activeTab === 'accessibility' && (
        <div className="space-y-4">
          <Field label="Title" value={accessibility.title || ''} onChange={v => setAccessibility({ ...accessibility, title: v })} />
          <Field label="Last Updated" value={accessibility.updated || ''} onChange={v => setAccessibility({ ...accessibility, updated: v })} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Sections</label>
            {(accessibility.sections || []).map((s: any, i: number) => (
              <div key={i} className="space-y-1 p-3 rounded-lg bg-brand-muted dark:bg-gray-900">
                <input type="text" value={s.heading} onChange={e => { const arr = [...accessibility.sections]; arr[i] = { ...arr[i], heading: e.target.value }; setAccessibility({ ...accessibility, sections: arr }); }} placeholder="Heading" className="w-full px-3 py-2 text-sm rounded-lg bg-brand-bg dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <textarea value={s.content} onChange={e => { const arr = [...accessibility.sections]; arr[i] = { ...arr[i], content: e.target.value }; setAccessibility({ ...accessibility, sections: arr }); }} rows={2} placeholder="Content" className="w-full px-3 py-2 text-sm rounded-lg bg-brand-bg dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent resize-none" />
                <button onClick={() => setAccessibility({ ...accessibility, sections: accessibility.sections.filter((_: any, j: number) => j !== i) })} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ))}
            <button onClick={() => setAccessibility({ ...accessibility, sections: [...(accessibility.sections || []), { heading: '', content: '' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add section</button>
          </div>
        </div>
      )}

      {activeTab === 'help' && (
        <div className="space-y-4">
          <Field label="Title" value={help.title || ''} onChange={v => setHelp({ ...help, title: v })} />
          <Field label="Subtitle" value={help.subtitle || ''} onChange={v => setHelp({ ...help, subtitle: v })} />
          <Field label="Support Email" value={help.support_email || ''} onChange={v => setHelp({ ...help, support_email: v })} />
          <div className="space-y-2">
            <label className="text-sm font-medium">FAQ</label>
            {(help.faq || []).map((item: any, i: number) => (
              <div key={i} className="space-y-1 p-3 rounded-lg bg-brand-muted dark:bg-gray-900">
                <input type="text" value={item.q} onChange={e => { const arr = [...help.faq]; arr[i] = { ...arr[i], q: e.target.value }; setHelp({ ...help, faq: arr }); }} placeholder="Question" className="w-full px-3 py-2 text-sm rounded-lg bg-brand-bg dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
                <textarea value={item.a} onChange={e => { const arr = [...help.faq]; arr[i] = { ...arr[i], a: e.target.value }; setHelp({ ...help, faq: arr }); }} rows={2} placeholder="Answer" className="w-full px-3 py-2 text-sm rounded-lg bg-brand-bg dark:bg-gray-800 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent resize-none" />
                <button onClick={() => setHelp({ ...help, faq: help.faq.filter((_: any, j: number) => j !== i) })} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ))}
            <button onClick={() => setHelp({ ...help, faq: [...(help.faq || []), { q: '', a: '' }] })} className="flex items-center gap-1 text-xs text-accent hover:underline"><Plus className="h-3 w-3" /> Add FAQ</button>
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
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent" />
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className="w-full px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent resize-none" />
    </div>
  );
}
