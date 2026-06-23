'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseSpeechToTextOptions {
  lang?: string;
  onFinalResult?: (text: string) => void;
}

/**
 * Speech-to-text hook using Web Speech API.
 * Free, client-side, no API key. Works on Chrome, Edge, Safari.
 *
 * Tech notes (from reference analysis):
 * - continuous = true: keeps listening across pauses
 * - interimResults = true: shows live (non-final) words
 * - auto-restart on onend while still in listening mode (handles long silences)
 * - lang default id-ID
 */
export function useSpeechToText({ lang = 'id-ID', onFinalResult }: UseSpeechToTextOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const onFinalRef = useRef(onFinalResult);

  useEffect(() => { onFinalRef.current = onFinalResult; }, [onFinalResult]);

  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (finalText) {
        onFinalRef.current?.(finalText.trim());
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError('Akses mikrofon ditolak. Berikan izin mikrofon di browser.');
        isListeningRef.current = false;
        setIsListening(false);
      } else if (event.error === 'network') {
        setError('Koneksi terputus. Pastikan perangkat online.');
      }
    };

    recognition.onend = () => {
      // Auto-restart while still recording (handles long silences)
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          isListeningRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
        setInterimText('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      try { recognition.stop(); } catch {}
    };
  }, [lang]);

  const start = useCallback(() => {
    setError(null);
    try {
      isListeningRef.current = true;
      recognitionRef.current?.start();
      setIsListening(true);
    } catch {
      // already started
    }
  }, []);

  const stop = useCallback(() => {
    isListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText('');
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isListening, interimText, supported, error, start, stop, toggle };
}
