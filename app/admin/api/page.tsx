'use client';

import { useEffect, useState } from 'react';
import { supabase, setSiteConfig, getAllSiteConfig } from '@/lib/supabase';
import { Key, Copy, Plus, Trash2, Eye, EyeOff, RefreshCw, Globe } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  created_at: string;
  active: boolean;
}

export default function AdminApiPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPerms, setNewPerms] = useState<string[]>(['read:stories']);
  const [revealedKeys, setRevealedKeys] = useState<string[]>([]);
  const [baseUrl, setBaseUrl] = useState('');

  const PERMISSIONS = [
    { value: 'read:stories', label: 'Read Stories' },
    { value: 'read:chapters', label: 'Read Chapters' },
    { value: 'read:comments', label: 'Read Comments' },
    { value: 'read:profiles', label: 'Read Profiles' },
    { value: 'read:categories', label: 'Read Categories' },
    { value: 'write:stories', label: 'Write Stories' },
    { value: 'write:comments', label: 'Write Comments' },
    { value: 'admin:all', label: 'Full Admin Access' },
  ];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const config = await getAllSiteConfig();
    setApiKeys(config.api_keys || []);
    setBaseUrl(typeof window !== 'undefined' ? window.location.origin : '');
    setLoading(false);
  };

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const prefix = 'sv_';
    let key = prefix;
    for (let i = 0; i < 40; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: newName,
      key: generateKey(),
      permissions: newPerms,
      created_at: new Date().toISOString(),
      active: true,
    };
    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    await setSiteConfig('api_keys', updated);
    setNewName('');
    setNewPerms(['read:stories']);
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    const updated = apiKeys.filter(k => k.id !== id);
    setApiKeys(updated);
    await setSiteConfig('api_keys', updated);
  };

  const toggleActive = async (id: string) => {
    const updated = apiKeys.map(k => k.id === id ? { ...k, active: !k.active } : k);
    setApiKeys(updated);
    await setSiteConfig('api_keys', updated);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold font-serif flex items-center gap-2"><Globe className="h-5 w-5 sm:h-6 sm:w-6" /> Public API</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Create API Key
        </button>
      </div>

      <div className="p-4 rounded-xl border border-border bg-bg-card space-y-3">
        <h3 className="font-semibold text-sm">API Base URL</h3>
        <div className="flex gap-2">
          <code className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900 rounded-lg border border-border font-mono">{baseUrl}/api/v1</code>
          <button onClick={() => copyToClipboard(`${baseUrl}/api/v1`)} className="p-2 rounded-lg border border-border hover:bg-bg-soft transition-colors">
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <p>Available Endpoints:</p>
          <p className="font-mono">GET /api/v1/stories — List published stories</p>
          <p className="font-mono">GET /api/v1/stories/:id — Get story detail</p>
          <p className="font-mono">GET /api/v1/stories/:id/chapters — Get chapters</p>
          <p className="font-mono">GET /api/v1/categories — List categories</p>
          <p className="font-mono">GET /api/v1/comments?story_id=:id — Get comments</p>
          <p className="mt-2">Include header: <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">X-API-Key: your_key</code></p>
        </div>
      </div>

      {showCreate && (
        <div className="p-5 rounded-xl border border-border bg-bg-card space-y-4">
          <h3 className="font-semibold">Create New API Key</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Key Name</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Mobile App, External Service" className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Permissions</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERMISSIONS.map(p => (
                <label key={p.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPerms.includes(p.value)}
                    onChange={e => {
                      if (e.target.checked) setNewPerms([...newPerms, p.value]);
                      else setNewPerms(newPerms.filter(x => x !== p.value));
                    }}
                    className="rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} className="px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90">Generate Key</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-full border border-border text-sm hover:bg-bg-soft">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-sm">API Keys ({apiKeys.length})</h3>
        {apiKeys.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Key className="h-10 w-10 mx-auto text-gray-300" />
            <p className="text-gray-500">No API keys yet.</p>
            <p className="text-sm text-gray-400">Create an API key to allow external access to your platform data.</p>
          </div>
        ) : (
          apiKeys.map(apiKey => (
            <div key={apiKey.id} className={`p-4 rounded-xl border ${apiKey.active ? 'border-border bg-bg-card' : 'border-dashed border-gray-300 dark:border-gray-700 opacity-60'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-accent shrink-0" />
                    <p className="font-medium text-sm">{apiKey.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${apiKey.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                      {apiKey.active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded border border-border flex-1 truncate">
                      {revealedKeys.includes(apiKey.id) ? apiKey.key : apiKey.key.substring(0, 7) + '•'.repeat(20)}
                    </code>
                    <button onClick={() => toggleReveal(apiKey.id)} className="p-1.5 rounded hover:bg-bg-soft transition-colors">
                      {revealedKeys.includes(apiKey.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => copyToClipboard(apiKey.key)} className="p-1.5 rounded hover:bg-bg-soft transition-colors">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {apiKey.permissions.map(p => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-tx-soft">{p}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400">Created {new Date(apiKey.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(apiKey.id)} className="p-2 rounded-lg hover:bg-bg-soft transition-colors" title={apiKey.active ? 'Disable' : 'Enable'}>
                    {apiKey.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleDelete(apiKey.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
