'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Bot, Send, Square, Sparkles, Trash2, Zap } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

type Status = 'ready' | 'generating';

const API_URL = 'https://text.pollinations.ai/openai/chat/completions';

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
    title: 'AI Chat',
    subtitle: 'Powered by Pollinations AI — free, no download needed',
    generating: 'AI is thinking...',
    placeholder: 'Type your message...',
    send: 'Send',
    stop: 'Stop',
    clearChat: 'Clear Chat',
    welcome: "Hello! I'm your AI assistant. Ask me anything — I can help with writing, brainstorming, coding, translations, and more.",
    free: 'Free & instant — no download, no signup',
    welcomeTitle: 'Welcome to AI Chat',
    welcomeDesc: 'Start chatting right away. The AI runs on Pollinations — free and fast.',
  } : {
    title: 'AI Chat',
    subtitle: 'Didukung Pollinations AI — gratis, tanpa download',
    generating: 'AI sedang berpikir...',
    placeholder: 'Ketik pesan...',
    send: 'Kirim',
    stop: 'Stop',
    clearChat: 'Hapus Chat',
    welcome: "Halo! Saya asisten AI kamu. Tanya apa saja — saya bisa bantu menulis, brainstorming, coding, terjemahan, dan lainnya.",
    free: 'Gratis & instan — tanpa download, tanpa daftar',
    welcomeTitle: 'Selamat Datang di AI Chat',
    welcomeDesc: 'Langsung mulai mengobrol. AI berjalan di Pollinations — gratis dan cepat.',
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  // Add welcome message on first render
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
            ? 'You are a helpful, friendly AI assistant. Reply concisely and clearly.'
            : 'Kamu adalah asisten AI yang membantu dan ramah. Jawab dengan ringkas dan jelas. Gunakan Bahasa Indonesia kecuali user bertanya dalam bahasa lain.',
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

      if (!res.ok) {
        throw new Error('API error: ' + res.status);
      }

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
        content: fullText.trim() || '(empty response)',
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
          content: streamText || '(stopped)',
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, partial]);
        setStreamText('');
        setStatus('ready');
        return;
      }

      console.error('Chat error:', err);
      const errMsg: Message = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: lang === 'en'
          ? 'Sorry, something went wrong. Please try again.'
          : 'Maaf, terjadi kesalahan. Silakan coba lagi.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
      setStreamText('');
      setStatus('ready');
    }

    abortRef.current = null;
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
  };

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

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {/* Chat messages */}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-accent" />
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-sm'
                    : 'bg-bg-card border border-border rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-tx-muted'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {status === 'generating' && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-accent" />
              </div>
              <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-bg-card border border-border text-sm">
                {streamText ? (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{streamText}<span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulse" /></p>
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

      {/* Input area */}
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
            <button
              onClick={stopGeneration}
              className="p-2.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="p-2.5 rounded-full bg-accent text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
