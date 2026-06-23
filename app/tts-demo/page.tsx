'use client';

import { useState, useRef } from 'react';
import { Play, Pause, Loader2, Volume2, Download } from 'lucide-react';

// MiniMax system voices (work with language_boost "Indonesian")
const VOICES: { id: string; label: string; gender: string }[] = [
  { id: 'Wise_Woman', label: 'Wise Woman', gender: 'Wanita' },
  { id: 'Calm_Woman', label: 'Calm Woman', gender: 'Wanita' },
  { id: 'Lively_Girl', label: 'Lively Girl', gender: 'Wanita' },
  { id: 'Lovely_Girl', label: 'Lovely Girl', gender: 'Wanita' },
  { id: 'Sweet_Girl_2', label: 'Sweet Girl', gender: 'Wanita' },
  { id: 'Inspirational_girl', label: 'Inspirational Girl', gender: 'Wanita' },
  { id: 'Exuberant_Girl', label: 'Exuberant Girl', gender: 'Wanita' },
  { id: 'Friendly_Person', label: 'Friendly Person', gender: 'Netral' },
  { id: 'Deep_Voice_Man', label: 'Deep Voice Man', gender: 'Pria' },
  { id: 'Casual_Guy', label: 'Casual Guy', gender: 'Pria' },
  { id: 'Patient_Man', label: 'Patient Man', gender: 'Pria' },
  { id: 'Determined_Man', label: 'Determined Man', gender: 'Pria' },
  { id: 'Decent_Boy', label: 'Decent Boy', gender: 'Pria' },
  { id: 'Elegant_Man', label: 'Elegant Man', gender: 'Pria' },
  { id: 'Imposing_Manner', label: 'Imposing Manner', gender: 'Pria' },
  { id: 'Young_Knight', label: 'Young Knight', gender: 'Pria' },
];

const EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];

export default function TTSDemoPage() {
  const [text, setText] = useState('Halo, selamat datang di Di.tulis. Ini adalah contoh pembacaan teks dengan suara AI dari MiniMax.');
  const [voiceId, setVoiceId] = useState('Wise_Woman');
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [emotion, setEmotion] = useState('neutral');
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
      const res = await fetch('/api/minimax-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId, speed, pitch, emotion, languageBoost: 'Indonesian' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Gagal (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      // Revoke previous url
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      // Auto-play
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
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-accent/10">
          <Volume2 className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif">Text to Speech</h1>
          <p className="text-sm text-tx-muted">Baca teks dengan suara AI MiniMax (speech-2.8-hd)</p>
        </div>
      </div>

      {/* Text input */}
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

      {/* Voice selection */}
      <label className="block text-xs font-medium text-tx-soft mb-1.5 mt-3">Pilihan Suara</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {VOICES.map(v => (
          <button
            key={v.id}
            onClick={() => setVoiceId(v.id)}
            className={`px-3 py-2 rounded-xl border text-left text-xs transition-colors ${voiceId === v.id ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card hover:border-accent/40'}`}
          >
            <span className="block font-medium truncate">{v.label}</span>
            <span className="block text-[10px] text-tx-muted">{v.gender}</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <div>
          <label className="block text-xs font-medium text-tx-soft mb-1.5">Kecepatan: {speed.toFixed(2)}x</label>
          <input type="range" min={0.5} max={2} step={0.05} value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} className="w-full accent-accent" />
        </div>
        <div>
          <label className="block text-xs font-medium text-tx-soft mb-1.5">Pitch: {pitch}</label>
          <input type="range" min={-12} max={12} step={1} value={pitch} onChange={e => setPitch(parseInt(e.target.value))} className="w-full accent-accent" />
        </div>
        <div>
          <label className="block text-xs font-medium text-tx-soft mb-1.5">Emosi</label>
          <select value={emotion} onChange={e => setEmotion(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card">
            {EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
          </select>
        </div>
      </div>

      {/* Action */}
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
