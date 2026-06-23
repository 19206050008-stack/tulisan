'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Copy, Trash2, AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Menambahkan deklarasi global untuk tipe Web Speech API agar typescript tidak error
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function SpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when transcibe gets long
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setTimeout(() => setError("Browser Anda tidak mendukung Web Speech API. Silakan gunakan Google Chrome, Microsoft Edge, atau Safari."), 0);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'id-ID';

    recognition.onresult = (event: any) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          currentFinal += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (currentFinal) {
        setTranscript((prev) => {
          const trimmedPrev = prev.trim();
          const trimmedNew = currentFinal.trim();
          if (!trimmedPrev) return trimmedNew + ' ';
          return trimmedPrev + ' ' + trimmedNew + ' ';
        });
      }
      setInterimTranscript(currentInterim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        setError("Akses mikrofon ditolak. Pastikan Anda telah memberikan izin mikrofon pada browser.");
        isListeningRef.current = false;
        setIsListening(false);
      } else if (event.error === 'network') {
        setError("Koneksi jaringan terputus. Pastikan perangkat online.");
      }
    };

    recognition.onend = () => {
      // Auto-restart jika masih dalam mode rekaman (berguna saat ada jeda diam/silences yang lama)
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Gagal memulai ulang mikrofon:", e);
          isListeningRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      recognition.stop();
    };
  }, []);

  const toggleListening = () => {
    setError(null);
    if (isListening) {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        isListeningRef.current = true;
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Error memulai rekaman:", err);
      }
    }
  };

  const handleCopy = () => {
    const fullText = (transcript + interimTranscript).trim();
    if (!fullText) return;
    
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (window.confirm('Yakin ingin menghapus semua teks?')) {
      setTranscript('');
      setInterimTranscript('');
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-8 flex-1 flex flex-col">
        <header className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Transkripsi
            <span className="text-indigo-400"> Suara</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Ubah ucapan Anda menjadi teks secara real-time dengan menggunakan bahasa Indonesia.
            Pastikan mikrofon Anda telah diizinkan.
          </p>
        </header>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-rose-500/10 text-rose-400 rounded-xl flex items-start gap-3 border border-rose-500/20">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 shadow-xl shadow-black/20 overflow-hidden flex flex-col flex-1 transition-all h-[500px]">
          <div 
            ref={scrollRef}
            className="p-6 sm:p-8 flex-1 overflow-y-auto relative scroll-smooth"
          >
            {!transcript && !interimTranscript && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-600 select-none">
                <span className="text-base font-medium tracking-wide">Teks akan muncul di sini...</span>
              </div>
            )}
            
            <p className="text-slate-300 font-light text-lg sm:text-xl leading-relaxed whitespace-pre-wrap font-sans">
              {transcript}
              <span className="text-indigo-400 font-medium">{interimTranscript}</span>
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border-t border-slate-800 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center justify-center gap-4 w-full sm:w-auto">
              <button
                onClick={toggleListening}
                className={`relative flex gap-3 items-center justify-center px-8 py-3.5 rounded-full text-base font-medium transition-all w-full sm:w-auto active:scale-95 ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40 ring-4 ring-red-500/20 border border-slate-900' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                }`}
              >
                {isListening && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-40 z-0"></span>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {isListening ? (
                    <>
                      <Square className="w-5 h-5 fill-current" />
                      Berhenti
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Mulai Bicara
                    </>
                  )}
                </span>
              </button>
              
              {isListening && (
                <div className="flex gap-1 items-end h-6 w-8 shrink-0">
                  <motion.div animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 bg-indigo-400 rounded-full" />
                  <motion.div animate={{ height: [12, 24, 12] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 bg-indigo-400 rounded-full" />
                  <motion.div animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 bg-indigo-400 rounded-full" />
                </div>
              )}
            </div>

            <div className="flex w-full sm:w-auto gap-2">
              <button
                onClick={handleCopy}
                disabled={!transcript && !interimTranscript}
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? <span className="text-emerald-400">Disalin</span> : 'Salin'}
              </button>
              
              <button
                onClick={handleClear}
                disabled={!transcript && !interimTranscript}
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium text-slate-400 hover:text-white hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 border border-transparent disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Hapus
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-center pt-4">
            <p className="text-xs font-mono text-slate-500">
              Ditenagai oleh teknologi Web Speech API &bull; Membutuhkan koneksi internet
            </p>
        </div>
      </div>
    </main>
  );
}
