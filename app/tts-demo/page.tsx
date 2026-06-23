'use client';

import { useState, useRef } from 'react';
import { Play, Pause, Loader2, Volume2, Download } from 'lucide-react';

// Indonesian Edge TTS voices
const VOICES: { id: string; label: string }[] = [
  { id: 'gadis', label: 'Gadis (Wanita)' },
  { id: 'ardi', label: 'Ardi (Pria)' },
];

export default function TTSDemoPage() {
  const [text, setText] = useState('Halo, selamat datang di Di.tulis. Ini adalah contoh pembacaan teks dengan suara AI Bahasa Indonesia.');
  const [voice, setVoice] = useState('gadis');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generate = async () => {
    setError(null);
    if (!text.trim()) { setError('Teks tidak boleh kosong.'); return; }
    setLoading(true);
    setPlaying(false);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Gagal (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
        }
      }, 50);
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !audioUrl) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-accent/10">
          <Volume2 className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif">Text to Speech</h1>
          <p className="text-sm text-tx-muted">Baca teks dengan suara AI Bahasa Indonesia</p>
        </div>
      </div>

      <label className="block text-xs font-medium text-tx-soft mb-1.5">Teks</label>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        maxLength={5000}
        placeholder="Tulis teks yang ingin dibacakan..."
        className="w-full px-4 py-3 rounded-xl bg-bg-input border border-border focus:outline-none focus:border-accent text-sm resize-y"
      />
      <p className="text-[10px] text-tx-muted mt-1 text-right">{text.length}/5000</p>

      {/* Voice */}
      <label className="block text-xs font-medium text-tx-soft mb-1.5 mt-3">Pilihan Suara</label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {VOICES.map(v => (
          <button
            key={v.id}
            onClick={() => setVoice(v.id)}
            className={`px-3 py-2 rounded-xl border text-center text-xs transition-colors ${voice === v.id ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card hover:border-accent/40'}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
          {loading ? 'Membuat audio...' : 'Bacakan'}
        </button>

        {audioUrl && !loading && (
          <>
            <button onClick={togglePlay} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-bg-input border border-border text-sm font-medium hover:border-accent/40 transition-colors">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? 'Jeda' : 'Putar'}
            </button>
            <a href={audioUrl} download="tts.mp3" className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-bg-input border border-border text-sm font-medium hover:border-accent/40 transition-colors">
              <Download className="h-4 w-4" /> Unduh
            </a>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      <audio
        ref={audioRef}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        className="hidden"
      />
    </div>
  );
}
