'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Bot, Send, Square, Sparkles, Trash2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

type Status = 'ready' | 'generating';

const API_URL = 'https://text.pollinations.ai/openai/chat/completions';

// ─── Markdown Renderer ───────────────────────────────────────────
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInline(text: string): string {
  let s = escapeHtml(text);
  // bold+italic
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // bold
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // italic
  s = s.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, '<em>$1</em>');
  // inline code
  s = s.replace(/`([^`]+)`/g, '<code class="bg-bg-input px-1 py-0.5 rounded text-xs font-mono">$1</code>');
  // links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-accent underline">$1</a>');
  return s;
}

function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let inList: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (inList) {
      html.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trimStart().startsWith('```')) {
      if (inCodeBlock) {
        html.push('<pre class="bg-bg-input rounded-lg p-3 my-2 overflow-x-auto"><code class="text-xs font-mono">' + escapeHtml(codeContent.join('\n')) + '</code></pre>');
        codeContent = [];
        inCodeBlock = false;
      } else {
        closeList();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      closeList();
      continue;
    }

    // Headings
    const h3 = trimmed.match(/^###\s+(.+)/);
    if (h3) { closeList(); html.push('<h3 class="font-bold text-base mt-3 mb-1">' + renderInline(h3[1]) + '</h3>'); continue; }
    const h2 = trimmed.match(/^##\s+(.+)/);
    if (h2) { closeList(); html.push('<h2 class="font-bold text-lg mt-3 mb-1">' + renderInline(h2[1]) + '</h2>'); continue; }
    const h1 = trimmed.match(/^#\s+(.+)/);
    if (h1) { closeList(); html.push('<h1 class="font-bold text-xl mt-3 mb-1">' + renderInline(h1[1]) + '</h1>'); continue; }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      closeList();
      html.push('<blockquote class="border-l-3 border-accent pl-3 my-2 text-tx-soft italic">' + renderInline(trimmed.slice(2)) + '</blockquote>');
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      closeList();
      html.push('<hr class="border-border my-3" />');
      continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)/);
    if (ulMatch) {
      if (inList !== 'ul') {
        closeList();
        html.push('<ul class="list-disc pl-5 my-1 space-y-1">');
        inList = 'ul';
      }
      html.push('<li>' + renderInline(ulMatch[1]) + '</li>');
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (olMatch) {
      if (inList !== 'ol') {
        closeList();
        html.push('<ol class="list-decimal pl-5 my-1 space-y-1">');
        inList = 'ol';
      }
      html.push('<li>' + renderInline(olMatch[1]) + '</li>');
      continue;
    }

    // Regular paragraph
    closeList();
    html.push('<p class="my-1.5 leading-relaxed">' + renderInline(trimmed) + '</p>');
  }

  closeList();
  if (inCodeBlock) {
    html.push('<pre class="bg-bg-input rounded-lg p-3 my-2 overflow-x-auto"><code class="text-xs font-mono">' + escapeHtml(codeContent.join('\n')) + '</code></pre>');
  }

  return html.join('');
}

function MarkdownBubble({ content }: { content: string }) {
  return (
    <div
      className="ai-markdown leading-relaxed"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function AIChatPage() {
  const router = useRouter();
  const { role, _hasHydrated, lang } = useStore();

  useEffect(() => {
    if (_hasHydrated && role === 'guest') router.push('/login');
  }, [_hasHydrated, role, router]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('ready');
  const [streamText, setStreamText] = useState('');

  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const labels = lang === 'en' ? {
    title: 'AI Assistant',
    subtitle: 'Ask anything — writing, ideas, coding, translations',
    generating: 'Thinking...',
    placeholder: 'Type your message...',
    clearChat: 'Clear Chat',
    welcome: "Hello! I'm your AI assistant. I can help with writing, brainstorming, coding, translations, and more. What would you like to explore?",
    error: 'Sorry, something went wrong. Please try again.',
  } : {
    title: 'Asisten AI',
    subtitle: 'Tanya apa saja — menulis, ide, coding, terjemahan',
    generating: 'Berpikir...',
    placeholder: 'Ketik pesan...',
    clearChat: 'Hapus Chat',
    welcome: "Halo! Saya asisten AI kamu. Saya bisa bantu menulis, brainstorming, coding, terjemahan, dan lainnya. Apa yang ingin kamu eksplorasi?",
    error: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  useEffect(() => {
    if (_hasHydrated && role !== 'guest' && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: labels.welcome,
        timestamp: Date.now(),
      }]);
    }
  }, [_hasHydrated, role]);

  const sendMessage = async () => {
    if (!input.trim() || status === 'generating') return;

    const userMsg: Message = {
      id: 'u-' + Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStatus('generating');
    setStreamText('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const chatMessages = [
        {
          role: 'system' as const,
          content: lang === 'en'
            ? 'You are a helpful, friendly AI assistant. Reply concisely and clearly. Use markdown formatting for better readability (headings, bold, lists, code blocks when appropriate).'
            : 'Kamu adalah asisten AI yang membantu dan ramah. Jawab dengan ringkas dan jelas. Gunakan Bahasa Indonesia kecuali user bertanya dalam bahasa lain. Gunakan format markdown untuk keterbacaan (heading, bold, list, code block jika sesuai).',
        },
        ...newMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: chatMessages,
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('API error: ' + res.status);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                setStreamText(fullText);
              }
            } catch {}
          }
        }
      }

      const aiMsg: Message = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: fullText.trim() || '...',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setStreamText('');
      setStatus('ready');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const partial: Message = {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          content: streamText || '...',
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, partial]);
        setStreamText('');
        setStatus('ready');
        return;
      }
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: labels.error,
        timestamp: Date.now(),
      }]);
      setStreamText('');
      setStatus('ready');
    }

    abortRef.current = null;
  };

  const stopGeneration = () => { abortRef.current?.abort(); };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([{
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: labels.welcome,
      timestamp: Date.now(),
    }]);
    setStreamText('');
    setStatus('ready');
  };

  if (!_hasHydrated) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="animate-pulse h-8 w-32 bg-bg-input rounded" />
      </div>
    );
  }

  if (role === 'guest') return null;

  return (
    <div className="h-[calc(100vh-8rem)] -my-8 -mx-4 flex flex-col bg-bg">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-bg-card px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold flex items-center gap-1.5">
                {labels.title}
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              </h1>
              <p className="text-[10px] text-tx-muted">{labels.subtitle}</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="p-2 rounded-full hover:bg-bg-soft text-tx-muted hover:text-tx transition-colors"
            title={labels.clearChat}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-accent" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-sm'
                    : 'bg-bg-card border border-border rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <MarkdownBubble content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                )}
                <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-tx-muted'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Streaming */}
          {status === 'generating' && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-accent" />
              </div>
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-bg-card border border-border text-sm">
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
      <div className="shrink-0 border-t border-border bg-bg-card p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={labels.placeholder}
            disabled={status === 'generating'}
            className="flex-1 px-4 py-2.5 rounded-full bg-bg-input border border-border focus:outline-none focus:border-accent text-sm disabled:opacity-50"
          />
          {status === 'generating' ? (
            <button onClick={stopGeneration} className="p-2.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition">
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={sendMessage} disabled={!input.trim()} className="p-2.5 rounded-full bg-accent text-white hover:opacity-90 disabled:opacity-50 transition">
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
