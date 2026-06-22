'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Bot, Send, Square, Sparkles, Trash2, Plus, MessageSquare, Menu, X } from 'lucide-react';
import { syncNanaChat } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface NanaChat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

type Status = 'ready' | 'generating';

const API_URL = 'https://text.pollinations.ai/openai/chat/completions';
const MAX_CONTEXT = 20;
const MAX_CHATS = 50;

// ─── System Prompts ──────────────────────────────────────────────
const SYSTEM_ID = 'Kamu adalah Nana, asisten menulis AI di platform Di.tulis. Kamu ramah, kreatif, dan bersemangat membantu penulis. Kamu ahli dalam: menulis cerita, brainstorming ide, memperbaiki tulisan, membuat outline, developing karakter, world-building, dan memberikan feedback konstruktif. Selalu perkenalkan dirimu sebagai Nana jika ditanya. Gunakan Bahasa Indonesia kecuali user bertanya dalam bahasa lain. Gunakan format markdown untuk keterbacaan.';
const SYSTEM_EN = 'You are Nana, an AI writing assistant on the Di.tulis platform. You are friendly, creative, and passionate about helping writers. You excel at: story writing, brainstorming, editing, outlining, character development, world-building, and giving constructive feedback. Always introduce yourself as Nana when asked. Use markdown formatting for readability.';

// ─── Storage helpers ─────────────────────────────────────────────
function getStorageKey(userId: string) { return 'nana_chats_' + userId; }

function loadChats(userId: string): NanaChat[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveChats(userId: string, chats: NanaChat[]) {
  const trimmed = chats.slice(0, MAX_CHATS);
  localStorage.setItem(getStorageKey(userId), JSON.stringify(trimmed));
}

// ─── Markdown Renderer ───────────────────────────────────────────
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInline(text: string): string {
  let s = text;
  s = s.replace(/&/g, '&amp;');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/?(?:em|i)>/gi, '*');
  s = s.replace(/<\/?(?:strong|b)>/gi, '**');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code class="bg-bg-input px-1 py-0.5 rounded text-xs font-mono">$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-accent underline">$1</a>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let tableRows: string[] = [];

  const closeList = () => {
    if (listType) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); listType = null; }
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    
    // Filter OUT header separator lines completely
    const rows = tableRows.filter(r => {
      const trimmed = r.trim();
      // Very strict pattern - only match pure separators
      return !/^\s*\|\s*[-:=\.]+\s*\|/.test(trimmed);
    });
    
    if (rows.length < 2) { 
      tableRows = []; 
      return; 
    }
    
    // Instead of <table>, use div-based layout to avoid ALL borders
    let htmlOut = '<div class="nana-tiny-table my-2"><div class="nana-tt-head">';
    const headerCells = rows[0].split('|').filter(c => c.trim() !== '');
    headerCells.forEach(c => { 
      htmlOut += `<span class="nana-tt-cell">${renderInline(c.trim())}</span>`; 
    });
    htmlOut += '</div>';
    
    // Data rows
    for (let r = 1; r < rows.length; r++) {
      htmlOut += '<div class="nana-tt-row">';
      const cells = rows[r].split('|').filter(c => c.trim() !== '');
      cells.forEach(c => { 
        htmlOut += `<span class="nana-tt-cell">${renderInline(c.trim())}</span>`; 
      });
      htmlOut += '</div>';
    }
    
    htmlOut += '</div>';
    html.push(htmlOut);
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('```')) {
      if (inCode) {
        html.push('<pre class="bg-bg-input rounded-lg p-3 my-2 overflow-x-auto"><code class="text-xs font-mono">' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
        codeLines = []; inCode = false;
      } else { closeList(); inCode = true; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    const t = line.trim();
    if (!t) { closeList(); continue; }

    const h3 = t.match(/^###\s+(.+)/);
    if (h3) { closeList(); html.push('<h3 class="font-bold text-base mt-3 mb-1">' + renderInline(h3[1]) + '</h3>'); continue; }
    const h2 = t.match(/^##\s+(.+)/);
    if (h2) { closeList(); html.push('<h2 class="font-bold text-lg mt-3 mb-1">' + renderInline(h2[1]) + '</h2>'); continue; }
    const h1 = t.match(/^#\s+(.+)/);
    if (h1) { closeList(); html.push('<h1 class="font-bold text-xl mt-3 mb-1">' + renderInline(h1[1]) + '</h1>'); continue; }
    if (t.startsWith('> ')) { closeList(); html.push('<blockquote class="border-l-3 border-accent pl-3 my-2 text-tx-soft italic">' + renderInline(t.slice(2)) + '</blockquote>'); continue; }
    // SKIP horizontal rules when collecting table rows
    if (!/^\|[\s:-]+\|$/.test(t) && /^[-*_]{3,}$/.test(t)) { closeList(); html.push('<hr class="border-border my-3" />'); continue; }

    const ul = t.match(/^[-*+]\s+(.+)/);
    if (ul) {
      if (listType !== 'ul') { closeList(); html.push('<ul class="list-disc pl-5 my-1 space-y-1">'); listType = 'ul'; }
      html.push('<li>' + renderInline(ul[1]) + '</li>'); continue;
    }
    const ol = t.match(/^\d+[.)]\s+(.+)/);
    if (ol) {
      if (listType !== 'ol') { closeList(); html.push('<ol class="list-decimal pl-5 my-1 space-y-1">'); listType = 'ol'; }
      html.push('<li>' + renderInline(ol[1]) + '</li>'); continue;
    }

    // Table rows
    if (t.startsWith('|') && t.endsWith('|')) {
      closeList();
      tableRows.push(t);
      continue;
    }
    flushTable();

    closeList();
    html.push('<p class="my-1.5 leading-relaxed">' + renderInline(t) + '</p>');
  }
  closeList();
  flushTable();
  if (inCode) html.push('<pre class="bg-bg-input rounded-lg p-3 my-2 overflow-x-auto"><code class="text-xs font-mono">' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
  return html.join('');
}

function MarkdownBubble({ content }: { content: string }) {
  return (
    <div className="ai-markdown leading-relaxed break-words max-w-full">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function NanaChatPage() {
  const router = useRouter();
  const { role, user, _hasHydrated, lang } = useStore();

  useEffect(() => {
    if (_hasHydrated && role === 'guest') router.push('/login');
  }, [_hasHydrated, role, router]);

  const [chats, setChats] = useState<NanaChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('ready');
  const [streamText, setStreamText] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamTextRef = useRef('');

  const activeChat = chats.find(c => c.id === activeChatId) || null;
  const messages = activeChat?.messages || [];

  const labels = lang === 'en' ? {
    newChat: 'New Chat',
    generating: 'Nana is thinking...',
    placeholder: 'Ask Nana anything about writing...',
    clearChat: 'Clear Chat',
    noChats: 'No conversations yet',
    welcomeTitle: "Hi, I'm Nana!",
    welcomeDesc: 'Your AI writing assistant on Di.tulis',
    suggestions: ['Help me write a short story', 'Brainstorm novel ideas', 'Improve this paragraph', 'Create a story outline'],
    error: 'Sorry, something went wrong. Please try again.',
    deleteConfirm: 'Delete this chat?',
  } : {
    newChat: 'Chat Baru',
    generating: 'Nana sedang berpikir...',
    placeholder: 'Tanya Nana apa saja tentang menulis...',
    clearChat: 'Hapus Chat',
    noChats: 'Belum ada percakapan',
    welcomeTitle: 'Halo, aku Nana!',
    welcomeDesc: 'Asisten menulis AI kamu di Di.tulis',
    suggestions: ['Bantu aku menulis cerita pendek', 'Brainstorm ide novel', 'Perbaiki paragraf ini', 'Buat outline cerita'],
    error: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
    deleteConfirm: 'Hapus percakapan ini?',
  };

  // Load chats on mount
  useEffect(() => {
    if (_hasHydrated && user?.id) {
      const loaded = loadChats(user.id);
      setChats(loaded);
      if (loaded.length > 0) setActiveChatId(loaded[0].id);
    }
  }, [_hasHydrated, user?.id]);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  // Persist chats
  useEffect(() => {
    if (user?.id && chats.length > 0) saveChats(user.id, chats);
  }, [chats, user?.id]);

  const createNewChat = useCallback(() => {
    const newChat: NanaChat = {
      id: 'nana-' + Date.now(),
      title: labels.newChat,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setShowSidebar(false);
    return newChat.id;
  }, [labels.newChat]);

  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
  }, [activeChatId]);

  const updateChat = useCallback((chatId: string, updates: Partial<NanaChat>) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, ...updates } : c));
  }, []);

  const sendMessage = async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || status === 'generating') return;

    let chatId = activeChatId;
    if (!chatId) chatId = createNewChat();

    const userMsg: Message = {
      id: 'u-' + Date.now(),
      role: 'user',
      content: msgText,
      timestamp: Date.now(),
    };

    // Get current messages for this chat
    const currentChat = chats.find(c => c.id === chatId);
    const currentMessages = currentChat?.messages || [];
    const newMessages = [...currentMessages, userMsg];

    // Auto-title from first message
    const isNewChat = currentMessages.length === 0;
    const title = isNewChat ? msgText.slice(0, 40) + (msgText.length > 40 ? '...' : '') : currentChat?.title || labels.newChat;

    updateChat(chatId, { messages: newMessages, title, updatedAt: Date.now() });
    if (!activeChatId) setActiveChatId(chatId);

    setInput('');
    setStatus('generating');
    setStreamText('');
    streamTextRef.current = '';

    const controller = new AbortController();
    abortRef.current = controller;

    // Set timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Nana AI timeout - generating fallback response');
      controller.abort();
    }, 60000); // 60 second timeout

    try {
      const contextMessages = newMessages.slice(-MAX_CONTEXT).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [
            { role: 'system', content: lang === 'en' ? SYSTEM_EN : SYSTEM_ID },
            ...contextMessages,
          ],
          stream: true,
          max_tokens: 1500,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let hasReceivedData = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          hasReceivedData = true;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'));
          
          for (const line of lines) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            if (!data) continue;
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta && typeof delta === 'string') {
                fullText += delta;
                streamTextRef.current = fullText;
                setStreamText(fullText);
              }
            } catch (e) {
              console.log('Parse error but continuing:', e);
            }
          }
        }
      } else {
        throw new Error('ReadableStream not available');
      }

      clearTimeout(timeoutId);

      // If we got some text, use it. If empty, provide fallback
      const finalText = fullText.trim() || generateFallbackResponse(msgText);

      const aiMsg: Message = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: finalText,
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, aiMsg];
      updateChat(chatId, { messages: finalMessages, updatedAt: Date.now() });
      
      // Sync to DB for admin logs
      syncNanaChat(
        chatId!,
        finalMessages[0]?.content?.slice(0, 40) || 'Chat',
        finalMessages.map(m => ({ role: m.role, content: m.content }))
      ).catch((err) => console.warn('DB sync failed:', err.message));
      
      setStatus('ready');
      setStreamText('');
      streamTextRef.current = '';
    } catch (err: any) {
      clearTimeout(timeoutId);
      
      if (err.name === 'AbortError') {
        const partial: Message = {
          id: 'ai-' + Date.now(), // eslint-disable-line react-hooks/purity
          role: 'assistant',
          content: streamTextRef.current || labels.generating,
          timestamp: Date.now(), // eslint-disable-line react-hooks/purity
        };
        updateChat(chatId, { messages: [...newMessages, partial], updatedAt: Date.now() }); // eslint-disable-line react-hooks/purity
        setStatus('ready');
        setStreamText('');
        streamTextRef.current = '';
        return;
      }
      
      console.error('Nana error:', err);
      const errorMsg = lang === 'en' 
        ? `I apologize, but I encountered an error. Please try again in a moment. Details: ${err.message || 'Unknown error'}`
        : `Maaf, saya mengalami kesalahan. Silakan coba lagi sebentar. Detail: ${err.message || 'Kesalahan tidak diketahui'}`;
        
      const errMsg: Message = {
        id: 'err-' + Date.now(), // eslint-disable-line react-hooks/purity
        role: 'assistant',
        content: errorMsg,
        timestamp: Date.now(), // eslint-disable-line react-hooks/purity
      };
      if (activeChatId) {
        setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, errMsg] } : c));
      }
      setStatus('ready');
      setStreamText('');
      streamTextRef.current = '';
      setInput(msgText);
    }

    abortRef.current = null;
  };

  // Fallback responses when AI fails
  const generateFallbackResponse = (userMessage: string): string => {
    const responsesEn = [
      "Thank you for your message! I'm currently experiencing technical difficulties with my connection to the AI service. However, I can still help with writing tips and suggestions based on my training.\n\nWhat type of story are you interested in writing? Some ideas I can help with:\n• Character development\n• Plot outlines\n• World-building\n• Dialogue improvement\n• Genre conventions",
      
      "Hello! I'm Nana, your writing assistant. I notice there might be a temporary issue with my connection to the advanced AI features right now.\n\nBut I'm still here to help! Here are some quick writing prompts to inspire you:\n1. A letter you'll never send\n2. The most unexpected gift received\n3. A conversation overheard in public\n\nLet me know what genre or theme you're exploring!",
    ];
    
    const responsesId = [
      "Halo! Terima kasih sudah bertanya. Saat ini saya mengalami sedikit kendala teknis dengan koneksi ke layanan AI canggih saya.\n\nNamun saya masih bisa membantu dengan tips dan saran penulisan berdasarkan pelatihan saya sebelumnya.\n\nGenre cerita apa yang ingin kamu tulis?\n• Pengembangan karakter\n• Outline plot\n• World-building\n• Perbaikan dialog\n• Konvensi genre",
      
      "Hai! Saya Nana, asisten menulismu. Sepertinya ada masalah sementara dengan koneksi ke fitur AI canggihku saat ini.\n\nTapi aku tetap siap membantu! Berikut beberapa prompt cepat untuk menginspirasimu:\n1. Surat yang tak pernah terkirim\n2. Hadiah paling mengejutkan\n3. Percakapan yang kedengar secara tak sengaja di tempat umum\n\nBeri tahu aku genre atau tema mana yang sedang kamu eksplorasi!",
    ];
    
    return lang === 'en' ? responsesEn[0] : responsesId[0];
  };

  const stopGeneration = () => { abortRef.current?.abort(); };

  const clearChat = () => {
    abortRef.current?.abort();
    if (activeChatId) {
      setChats(prev => prev.map(c => c.id === activeChatId ? {
        ...c,
        messages: [{
          id: 'welcome-' + Date.now(),
          role: 'assistant' as const,
          content: labels.welcomeTitle + '\n\n' + labels.welcomeDesc,
          timestamp: Date.now(),
        }],
      } : c));
    }
    setStreamText('');
    setStatus('ready');
  };

  // Format time helper
  const formatDate = (ts: string | number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { month: 'short', day: 'numeric' });
  };

  if (!_hasHydrated) {
    return <div className="h-[calc(100vh-8rem)] flex items-center justify-center"><div className="animate-pulse h-8 w-32 bg-bg-input rounded" /></div>;
  }
  if (role === 'guest') return null;

  return (
    <div className="h-[calc(100vh-4rem)] -my-8 flex bg-bg overflow-hidden" style={{ marginLeft: 'calc(-50vw + 50%)', width: '100vw' }}>
      {/* Mobile overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        ${showSidebar ? 'flex' : 'hidden'} md:flex
        flex-col w-full md:w-72 border-r border-border bg-bg-card
        fixed md:relative z-50 md:z-auto h-full md:h-auto
      `}>
        {/* Sidebar header */}
        <div className="p-3 border-b border-border flex items-center gap-2">
          <button
            onClick={createNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" /> {labels.newChat}
          </button>
          <button
            onClick={() => setShowSidebar(false)}
            className="p-2 rounded-full hover:bg-bg-soft md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.length === 0 && (
            <p className="text-xs text-tx-muted text-center py-8">{labels.noChats}</p>
          )}
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => { setActiveChatId(chat.id); setShowSidebar(false); }}
              className={`group w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors ${
                activeChatId === chat.id ? 'bg-accent/10 text-accent' : 'hover:bg-bg-soft text-tx'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{chat.title}</p>
                <p className="text-[10px] text-tx-muted">{formatDate(chat.updatedAt)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </button>
            </button>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 border-b border-border bg-bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(true)} className="p-2 rounded-full hover:bg-bg-soft md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <img src="/nana-avatar.gif" alt="Nana" className="w-9 h-9 rounded-full object-cover shrink-0" />
            <div>
              <h1 className="text-sm font-bold flex items-center gap-1.5">Nana</h1>
              <p className="text-[10px] text-tx-muted">{lang === 'en' ? 'AI Writing Assistant' : 'Asisten Menulis AI'}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto px-3 md:px-4 py-6 space-y-4">
            {/* Welcome screen */}
            {messages.length === 0 && status !== 'generating' && (
              <div className="text-center py-8 md:py-12 space-y-4 md:space-y-5">
                <img src="/nana-avatar.gif" alt="Nana" className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover mx-auto shrink-0" />
                <div className="space-y-1">
                  <h2 className="text-base md:text-xl font-bold font-serif">{labels.welcomeTitle}</h2>
                  <p className="text-xs md:text-sm text-tx-soft">{labels.welcomeDesc}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 max-w-lg mx-auto">
                  {labels.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-border bg-bg-card text-[11px] md:text-xs font-medium hover:border-accent/30 hover:bg-accent/5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <img src="/nana-avatar.gif" alt="Nana" className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover shrink-0 mr-1.5 md:mr-2 mt-0.5" />
                )}
                <div className={`max-w-[85%] sm:max-w-[80%] px-3 md:px-4 py-2 md:py-2.5 rounded-2xl text-xs md:text-sm ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-sm'
                    : 'bg-bg-card border border-border rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <MarkdownBubble content={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  )}
                  <p className={`text-[9px] md:text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-tx-muted'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Streaming */}
            {status === 'generating' && (
              <div className="flex justify-start">
                <img src="/nana-avatar.gif" alt="Nana" className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover shrink-0 mr-1.5 md:mr-2 mt-0.5" />
                    <div className="max-w-[85%] sm:max-w-[80%] px-3 md:px-4 py-2 md:py-2.5 rounded-2xl rounded-bl-sm bg-bg-card border border-border text-xs md:text-sm relative">
                      {streamText ? (
                        <>
                          <MarkdownBubble content={streamText} />
                          <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulse align-middle" />
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-tx-muted">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-tx-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-tx-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-tx-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-xs">{labels.generating}</span>
                        </div>
                      )}
                    </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border bg-bg-card p-2.5 md:p-4">
          <div className="mx-auto flex items-center gap-1.5 md:gap-2 px-3 md:px-4">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={labels.placeholder}
              disabled={status === 'generating'}
              className="flex-1 px-3 md:px-4 py-2 md:py-2.5 rounded-full bg-bg-input border border-border focus:outline-none focus:border-accent text-xs md:text-sm disabled:opacity-50"
            />
            {status === 'generating' ? (
              <button onClick={stopGeneration} className="p-2.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition">
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={() => sendMessage()} disabled={!input.trim()} className="p-2.5 rounded-full bg-accent text-white hover:opacity-90 disabled:opacity-50 transition">
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
