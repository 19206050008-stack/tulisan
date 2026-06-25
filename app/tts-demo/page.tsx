'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2, Volume2, Download } from 'lucide-react';

interface Voice { id: string; label: string; group: string }

// Fallback list (used if the server's /health is unavailable).
const FALLBACK_VOICES: Voice[] = [
  { id: 'sari', label: 'Sari — Wanita', group: 'Indonesia' },
  { id: 'budi', label: 'Budi — Pria', group: 'Indonesia' },
];

// Contoh teks untuk menguji emosi lewat tanda baca + expression tags.
interface Example { id: string; label: string; text: string }
const EXAMPLES: Example[] = [
  { id: 'senang', label: '😄 Senang', text: '"Akhirnya kita sampai!" seru Maya gembira sambil melompat kecil.' },
  { id: 'sedih', label: '😢 Sedih', text: 'Ia menunduk… lalu berbisik pelan, "Aku merindukanmu, Ibu."' },
  { id: 'tegang', label: '😨 Tegang', text: 'Pintu itu berderit pelan… Sesuatu—entah apa—bergerak di kegelapan.' },
  { id: 'marah', label: '😠 Marah', text: '"Cukup! Jangan pernah ucapkan itu lagi," katanya, suaranya bergetar menahan amarah.' },
  { id: 'penasaran', label: '🤔 Penasaran', text: 'Siapa yang berani masuk hutan terlarang itu? Tidak ada seorang pun yang tahu.' },
  { id: 'tawa', label: '😂 Tawa (tag)', text: '"Kau benar-benar lucu," katanya. <laugh> "Aku sampai tak bisa berhenti."' },
  { id: 'lega', label: '😌 Lega (tag)', text: '<breath> Malam akhirnya reda. <sigh> Semuanya sudah berakhir sekarang.' },
  {
    id: 'dongeng',
    label: '📖 Dongeng (paragraf)',
    text: 'Pada zaman dahulu, di sebuah desa kecil di kaki gunung, hiduplah seorang gadis bernama Sari. Setiap pagi ia menyusuri ladang sambil bernyanyi. "Selamat pagi, dunia!" serunya riang. Namun suatu hari, langit mendadak gelap… Angin berembus kencang, dan dari balik hutan terdengar suara aneh—seperti bisikan. Sari menahan napas. "Siapa di sana?" tanyanya pelan, suaranya gemetar.',
  },
];

export default function TTSDemoPage() {
  const [text, setText] = useState('Halo, selamat datang di Di.tulis. Ini adalah contoh pembacaan teks dengan suara Bahasa Indonesia.');
  const [voices, setVoices] = useState<Voice[]>(FALLBACK_VOICES);
  const [voice, setVoice] = useState('sari');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/tts')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d?.voices) && d.voices.length) {
          setVoices(d.voices);
          if (!d.voices.some((v: Voice) => v.id === voice)) setVoice(d.voices[0].id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = Array.from(new Set(voices.map(v => v.group)));

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
          <p className="text-sm text-tx-muted">Baca teks dengan suara Bahasa Indonesia</p>
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

      {/* Contoh teks emosi */}
      <label className="block text-xs font-medium text-tx-soft mb-1.5 mt-2">Contoh teks (emosi)</label>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map(ex => (
          <button
            key={ex.id}
            onClick={() => setText(ex.text)}
            className="px-3 py-1.5 rounded-full border border-border bg-bg-card text-xs hover:border-accent/40 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-tx-muted mt-1.5">Emosi dibentuk dari tanda baca (… — ? !) + tag <code>&lt;laugh&gt;</code>/<code>&lt;sigh&gt;</code>/<code>&lt;breath&gt;</code>. Klik contoh, lalu pilih suara dan dengarkan.</p>

      {/* Voice */}
      <label className="block text-xs font-medium text-tx-soft mb-1.5 mt-3">Pilihan Suara</label>
      <div className="space-y-3">
        {groups.map(group => (
          <div key={group}>
            <p className="text-[11px] uppercase tracking-wide text-tx-muted mb-1.5">{group}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {voices.filter(v => v.group === group).map(v => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={`px-3 py-2 rounded-xl border text-center text-xs transition-colors ${voice === v.id ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card hover:border-accent/40'}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
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
