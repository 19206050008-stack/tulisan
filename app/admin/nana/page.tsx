'use client';

import { useEffect, useState } from 'react';
import { getNanaConfig, updateNanaConfig, getNanaChatStats, getNanaChatMessages, deleteNanaChat } from '@/lib/supabase';
import { Sparkles, Save, ChevronDown, ChevronRight, Trash2, MessageSquare, Users, Bot, Eye } from 'lucide-react';

const DEFAULT_PROMPT_ID = 'Kamu adalah Nana, asisten menulis AI di platform Di.tulis. Kamu ramah, kreatif, dan bersemangat membantu penulis. Kamu ahli dalam: menulis cerita, brainstorming ide, memperbaiki tulisan, membuat outline, developing karakter, world-building, dan memberikan feedback konstruktif. Selalu perkenalkan dirimu sebagai Nana jika ditanya. Gunakan Bahasa Indonesia kecuali user bertanya dalam bahasa lain. Gunakan format markdown untuk keterbacaan.';
const DEFAULT_PROMPT_EN = 'You are Nana, an AI writing assistant on the Di.tulis platform. You are friendly, creative, and passionate about helping writers. You excel at: story writing, brainstorming, editing, outlining, character development, world-building, and giving constructive feedback. Always introduce yourself as Nana when asked. Use markdown formatting for readability.';

export default function AdminNanaPage() {
  const [config, setConfig] = useState({
    nana_enabled: 'true',
    nana_system_prompt_id: DEFAULT_PROMPT_ID,
    nana_system_prompt_en: DEFAULT_PROMPT_EN,
    nana_model: 'openai',
    nana_temperature: '0.7',
    nana_max_tokens: '1024',
  });
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedChat, setExpandedChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [cfg, s] = await Promise.all([getNanaConfig(), getNanaChatStats()]);
    if (cfg && Object.keys(cfg).length > 0) {
      setConfig(prev => ({ ...prev, ...cfg }));
    }
    setStats(s);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateNanaConfig(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const loadChatMessages = async (chatId: string) => {
    if (chatMessages[chatId]) {
      setExpandedChat(expandedChat === chatId ? null : chatId);
      return;
    }
    setLoadingMessages(chatId);
    const msgs = await getNanaChatMessages(chatId);
    setChatMessages(prev => ({ ...prev, [chatId]: msgs }));
    setExpandedChat(chatId);
    setLoadingMessages(null);
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!confirm('Delete this chat? This cannot be undone.')) return;
    await deleteNanaChat(chatId);
    loadData();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-serif">Nana AI</h1>
          <p className="text-sm text-tx-muted">Konfigurasi asisten AI dan pantau penggunaan user</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <div className="flex items-center gap-2 text-tx-muted text-xs font-medium mb-1"><Users className="h-3.5 w-3.5" /> Total Users</div>
            <p className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <div className="flex items-center gap-2 text-tx-muted text-xs font-medium mb-1"><MessageSquare className="h-3.5 w-3.5" /> Total Chats</div>
            <p className="text-xl sm:text-2xl font-bold">{stats.totalChats}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <div className="flex items-center gap-2 text-tx-muted text-xs font-medium mb-1"><Bot className="h-3.5 w-3.5" /> Total Messages</div>
            <p className="text-xl sm:text-2xl font-bold">{stats.totalMessages}</p>
          </div>
        </div>
      )}

      {/* Configuration */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold font-serif">Konfigurasi</h2>
        <div className="space-y-4 p-5 rounded-xl border border-border bg-bg-card">
          {/* Enabled toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Nana AI Enabled</p>
              <p className="text-xs text-tx-muted">Aktifkan/nonaktifkan fitur AI Chat untuk user</p>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, nana_enabled: c.nana_enabled === 'true' ? 'false' : 'true' }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${config.nana_enabled === 'true' ? 'bg-accent' : 'bg-bg-input'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${config.nana_enabled === 'true' ? 'left-5.5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Model */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tx-muted">Model</label>
            <select
              value={config.nana_model}
              onChange={e => setConfig(c => ({ ...c, nana_model: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx"
            >
              <option value="openai">OpenAI (GPT)</option>
              <option value="mistral">Mistral</option>
              <option value="llama">Llama</option>
              <option value="gemini">Gemini</option>
              <option value="deepseek">DeepSeek</option>
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tx-muted">Temperature ({config.nana_temperature})</label>
            <input
              type="range" min="0" max="1" step="0.1"
              value={config.nana_temperature}
              onChange={e => setConfig(c => ({ ...c, nana_temperature: e.target.value }))}
              className="mt-1 w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-tx-muted"><span>Precise (0)</span><span>Creative (1)</span></div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tx-muted">Max Tokens</label>
            <input
              type="number" min="256" max="4096" step="256"
              value={config.nana_max_tokens}
              onChange={e => setConfig(c => ({ ...c, nana_max_tokens: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent"
            />
          </div>

          {/* System Prompt ID */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tx-muted">System Prompt (Bahasa Indonesia)</label>
            <textarea
              rows={4}
              value={config.nana_system_prompt_id}
              onChange={e => setConfig(c => ({ ...c, nana_system_prompt_id: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {/* System Prompt EN */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tx-muted">System Prompt (English)</label>
            <textarea
              rows={4}
              value={config.nana_system_prompt_en}
              onChange={e => setConfig(c => ({ ...c, nana_system_prompt_en: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            <Save className="h-4 w-4" /> {saved ? 'Tersimpan!' : saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </button>
        </div>
      </section>

      {/* User AI Logs */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold font-serif">Log Penggunaan User</h2>
        {!stats || stats.users.length === 0 ? (
          <div className="p-8 rounded-xl border border-border bg-bg-card text-center text-tx-muted text-sm">
            Belum ada user yang menggunakan Nana AI.
          </div>
        ) : (
          <div className="space-y-2">
            {stats.users.map((u: any) => (
              <div key={u.user_id} className="rounded-xl border border-border bg-bg-card overflow-hidden">
                {/* User header */}
                <button
                  onClick={() => setExpandedUser(expandedUser === u.user_id ? null : u.user_id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-bg-soft transition-colors text-left"
                >
                  {expandedUser === u.user_id ? <ChevronDown className="h-4 w-4 text-tx-muted" /> : <ChevronRight className="h-4 w-4 text-tx-muted" />}
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                      {(u.full_name || u.username || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name || u.username}</p>
                    <p className="text-[10px] text-tx-muted truncate">@{u.username}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{u.chat_count} <span className="text-tx-muted font-normal text-xs">chat</span></p>
                    <p className="text-[10px] text-tx-muted">Terakhir: {formatTime(u.last_active)}</p>
                  </div>
                </button>

                {/* Chat list */}
                {expandedUser === u.user_id && (
                  <div className="border-t border-border divide-y divide-border/50">
                    {u.chats.map((chat: any) => (
                      <div key={chat.id}>
                        <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-bg-soft/50">
                          <button
                            onClick={() => loadChatMessages(chat.id)}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          >
                            {expandedChat === chat.id ? <ChevronDown className="h-3 w-3 text-tx-muted shrink-0" /> : <ChevronRight className="h-3 w-3 text-tx-muted shrink-0" />}
                            <MessageSquare className="h-3.5 w-3.5 text-tx-muted shrink-0" />
                            <span className="text-xs font-medium truncate">{chat.title}</span>
                            <span className="text-[10px] text-tx-muted shrink-0">{formatTime(chat.created_at)}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteChat(chat.id)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 shrink-0"
                            title="Delete chat"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Messages */}
                        {expandedChat === chat.id && (
                          <div className="px-6 py-3 bg-bg-soft/30 space-y-2 max-h-80 overflow-y-auto">
                            {loadingMessages === chat.id ? (
                              <p className="text-xs text-tx-muted animate-pulse">Loading messages...</p>
                            ) : chatMessages[chat.id] ? (
                              chatMessages[chat.id].map((msg: any) => (
                                <div key={msg.id} className={`text-xs ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                  <span className={`inline-block px-3 py-1.5 rounded-xl max-w-[85%] text-left ${
                                    msg.role === 'user' ? 'bg-accent/10 text-accent' : 'bg-bg-card border border-border'
                                  }`}>
                                    <span className="font-bold text-[10px] block mb-0.5 opacity-70">{msg.role === 'user' ? 'User' : 'Nana'}</span>
                                    {msg.content.slice(0, 500)}{msg.content.length > 500 ? '...' : ''}
                                  </span>
                                </div>
                              ))
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
