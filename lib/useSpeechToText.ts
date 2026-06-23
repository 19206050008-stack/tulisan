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
  const permissionGrantedRef = useRef(false);

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
      // Ignore transient/benign errors that fire even when mic works fine
      if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'audio-capture') {
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        // Only treat as denial if we never got permission
        if (!permissionGrantedRef.current) {
          setError('Akses mikrofon ditolak. Berikan izin mikrofon di browser.');
          isListeningRef.current = false;
          setIsListening(false);
        }
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

  const start = useCallback(async () => {
    setError(null);
    // Try to pre-request mic permission, but only hard-fail on real permission denial.
    // Other errors (device busy, not found, etc.) shouldn't block SpeechRecognition,
    // which manages its own microphone access.
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        permissionGrantedRef.current = true;
        // Release the stream immediately; SpeechRecognition uses its own
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
        setError('Akses mikrofon ditolak. Berikan izin mikrofon di browser.');
        return;
      }
      // Non-permission error: continue and let SpeechRecognition attempt anyway
    }
    if (!recognitionRef.current) {
      setError('Browser tidak mendukung input suara. Gunakan Chrome, Edge, atau Safari.');
      return;
    }
    try {
      isListeningRef.current = true;
      recognitionRef.current.start();
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
