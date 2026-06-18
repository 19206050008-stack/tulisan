'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Bot, Send, Square, RotateCcw, Download, Zap, AlertCircle, Sparkles, Trash2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

type Status = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

const MODELS = [
  {
    id: 'qwen3-0.6b-q4',
    name: 'Qwen3 0.6B (Q4_K_M)',
    repo: 'Qwen/Qwen3-0.6B-GGUF',
    file: 'Qwen3-0.6B-Q4_K_M.gguf',
    size: '~400 MB',
    desc: 'Lebih ringan, cepat download',
  },
  {
    id: 'qwen3-0.6b-q8',
    name: 'Qwen3 0.6B (Q8_0)',
    repo: 'Qwen/Qwen3-0.6B-GGUF',
    file: 'Qwen3-0.6B-Q8_0.gguf',
    size: '~670 MB',
    desc: 'Kualitas lebih tinggi',
  },
];

export default function AIChatPage() {
  const router = useRouter();
  const { role, _hasHydrated, lang } = useStore();

  useEffect(() => {
    if (_hasHydrated && role === 'guest') router.push('/login');
  }, [_hasHydrated, role, router]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [dlProgress, setDlProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [streamText, setStreamText] = useState('');

  const wllamaRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  const labels = lang === 'en' ? {
    title: 'AI Chat',
    subtitle: 'Powered by Qwen3 — runs locally in your browser',
    selectModel: 'Select Model',
    loadModel: 'Load Model',
    downloading: 'Downloading model...',
    generating: 'AI is thinking...',
    placeholder: 'Type your message...',
    send: 'Send',
    stop: 'Stop',
    clearChat: 'Clear Chat',
    error: 'Error loading model',
    retry: 'Retry',
    welcome: 'Hello! I am Qwen3, running locally in your browser. How can I help you today?',
    noData: '100% local — no data leaves your browser',
    firstLoad: 'First load downloads the model. Cached for future visits.',
  } : {
    title: 'AI Chat',
    subtitle: 'Didukung Qwen3 — berjalan lokal di browser kamu',
    selectModel: 'Pilih Model',
    loadModel: 'Muat Model',
    downloading: 'Mengunduh model...',
    generating: 'AI sedang berpikir...',
    placeholder: 'Ketik pesan...',
    send: 'Kirim',
    stop: 'Stop',
    clearChat: 'Hapus Chat',
    error: 'Gagal memuat model',
    retry: 'Coba Lagi',
    welcome: 'Halo! Saya Qwen3, berjalan lokal di browser kamu. Ada yang bisa saya bantu?',
    noData: '100% lokal — tidak ada data yang keluar dari browser',
    firstLoad: 'Muatan pertama mengunduh model. Di-cache untuk kunjungan berikutnya.',
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const loadModel = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    setDlProgress(0);

    try {
      const wllamaModule = await import('@wllama/wllama');
      const Wllama = wllamaModule.Wllama;
      const LoggerWithoutDebug = wllamaModule.LoggerWithoutDebug;

      // Use WASM config paths for Next.js
      const configPaths = {
        default: '/wllama/wllama.wasm',
      };

      const wllama = new Wllama(configPaths, { logger: LoggerWithoutDebug });
      const model = MODELS[selectedModel];

      await wllama.loadModelFromHF(
        { repo: model.repo, file: model.file },
        {
          progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
            setDlProgress(Math.round((loaded / total) * 100));
          },
        }
      );

      wllamaRef.current = wllama;
      setStatus('ready');

      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: labels.welcome,
        timestamp: Date.now(),
      }]);
    } catch (err: any) {
      console.error('Model load error:', err);
      setErrorMsg(err?.message || 'Unknown error');
      setStatus('error');
    }
  }, [selectedModel, labels.welcome]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || status !== 'ready' || !wllamaRef.current) return;

    const userMsg: Message = {
      id: 'u-' + Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus('generating');
    setStreamText('');
    abortRef.current = false;

    try {
      const chatHistory = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const wllama = wllamaRef.current;
      let fullText = '';

      const output = await wllama.createChatCompletion(chatHistory, {
        nPredict: 512,
        temp: 0.7,
        topK: 40,
        topP: 0.9,
        sampling: {
          onNewToken: (token: string, piece: any, currentText: string) => {
            if (abortRef.current) {
              wllama.abort();
              return;
            }
            fullText = currentText;
            setStreamText(currentText);
          },
        },
      });

      const finalText = fullText || output?.choices?.[0]?.message?.content || '';
      const aiMsg: Message = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: finalText.trim(),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setStreamText('');
      setStatus('ready');
    } catch (err: any) {
      if (abortRef.current) {
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
      console.error('Generation error:', err);
      setStatus('ready');
    }
  }, [input, status, messages, streamText]);

  const stopGeneration = () => { abortRef.current = true; };

  const clearChat = () => {
    if (status === 'generating') abortRef.current = true;
    setMessages([]);
    setStreamText('');
    setStatus(wllamaRef.current ? 'ready' : 'idle');
  };

  const pct = (loaded: number, total: number) => total > 0 ? Math.round((loaded / total) * 100) : 0;

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
                {status === 'ready' && <Sparkles className="h-3.5 w-3.5 text-accent" />}
              </h1>
              <p className="text-[10px] text-tx-muted">{labels.subtitle}</p>
            </div>
          </div>
          {(status === 'ready' || status === 'generating') && (
            <button
              onClick={clearChat}
              className="p-2 rounded-full hover:bg-bg-soft text-tx-muted hover:text-tx transition-colors"
              title={labels.clearChat}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {/* Model loader screen */}
          {status === 'idle' && (
            <div className="text-center py-12 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold font-serif">{labels.title}</h2>
                <p className="text-sm text-tx-soft max-w-md mx-auto">{labels.subtitle}</p>
                <p className="text-xs text-tx-muted flex items-center justify-center gap-1">
                  <Zap className="h-3 w-3" /> {labels.noData}
                </p>
              </div>

              {/* Model selector */}
              <div className="max-w-sm mx-auto space-y-3">
                <p className="text-xs font-semibold text-tx-muted uppercase tracking-wider">{labels.selectModel}</p>
                {MODELS.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(i)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedModel === i
                        ? 'border-accent bg-accent/5'
                        : 'border-border bg-bg-card hover:border-accent/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{m.name}</span>
                      <span className="text-[10px] text-tx-muted bg-bg-input px-2 py-0.5 rounded-full">{m.size}</span>
                    </div>
                    <p className="text-xs text-tx-muted mt-1">{m.desc}</p>
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-tx-muted max-w-sm mx-auto">{labels.firstLoad}</p>

              <button
                onClick={loadModel}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
              >
                <Download className="h-4 w-4" /> {labels.loadModel}
              </button>
            </div>
          )}

          {/* Loading progress */}
          {status === 'loading' && (
            <div className="text-center py-16 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-accent/10 flex items-center justify-center animate-pulse">
                <Download className="h-6 w-6 text-accent" />
              </div>
              <p className="text-sm font-medium">{labels.downloading}</p>
              <div className="max-w-xs mx-auto">
                <div className="h-2 bg-bg-input rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: dlProgress + '%' }}
                  />
                </div>
                <p className="text-xs text-tx-muted mt-2">{dlProgress}%</p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="text-center py-12 space-y-4">
              <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
              <p className="text-sm font-medium">{labels.error}</p>
              <p className="text-xs text-tx-muted max-w-sm mx-auto">{errorMsg}</p>
              <button
                onClick={loadModel}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition"
              >
                <RotateCcw className="h-4 w-4" /> {labels.retry}
              </button>
            </div>
          )}

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
      {(status === 'ready' || status === 'generating') && (
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
      )}
    </div>
  );
}
