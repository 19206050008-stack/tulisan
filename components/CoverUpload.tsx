'use client';

import { useState, useRef } from 'react';
import { Upload, AlertTriangle, Check, Info, Wand2, Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const COVER_WIDTH = 600;
const COVER_HEIGHT = 900;
const COVER_RATIO = 2 / 3;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 600;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const GENRE_COLORS: Record<string, string[][]> = {
  'Romance':       [['#ff6b9d','#c44569'],['#e91e63','#ad1457']],
  'Horror':        [['#2d1b69','#11001c'],['#1a1a2e','#16213e']],
  'Mystery':       [['#4a5568','#1a202c'],['#2c3e50','#34495e']],
  'Sci-Fi':        [['#0099f7','#005999'],['#00b4db','#0083b0']],
  'Fantasy':       [['#7f53ac','#647dee'],['#6a11cb','#2575fc']],
  'Drama':         [['#e96443','#904e95'],['#c0392b','#8e44ad']],
  'Humor':         [['#f7971e','#ffd200'],['#f39c12','#f1c40f']],
  'Adventure':     [['#11998e','#38ef7d'],['#00b09b','#96c93d']],
  'Thriller':      [['#c31432','#240b36'],['#870000','#190a05']],
  'Slice of Life': [['#76b852','#8dc26f'],['#56ab2f','#a8e063']],
  'Historical':    [['#8e7c54','#5c4a1e'],['#6d4c41','#3e2723']],
  'Inspirational': [['#ffc107','#ff9800'],['#f57c00','#ff6f00']],
};

// Tema visual per genre — dipakai untuk membangun prompt otomatis
const GENRE_VISUALS: Record<string, string> = {
  'Romance':       'suasana romantis, cahaya senja keemasan, dua siluet, kelopak mawar, warna pastel hangat, suasana intim',
  'Horror':        'atmosfer gelap mencekam, kabut tebal, bayangan misterius, arsitektur gothic, cahaya lilin redup, langit muram',
  'Mystery':       'suasana noir, jalan basah hujan, sosok bayangan, lorong gelap, kabut misterius, tanda tanya tersembunyi',
  'Sci-Fi':        'kota futuristik, nebula luar angkasa, teknologi neon bercahaya, pesawat antariksa, lanskap alien, cyberpunk',
  'Fantasy':       'hutan ajaib, rune bercahaya, kastil megah, siluet naga, sinar cahaya sihir, makhluk mistis',
  'Drama':         'adegan emosional close-up, pencahayaan sinematik, bayangan dalam, emosi manusia yang kuat, latar kota',
  'Humor':         'warna cerah menyenangkan, elemen kartun lucu, karakter ekspresi komedi, suasana ringan',
  'Adventure':     'lanskap luas, puncak gunung, siluet penjelajah, peta harta karun, hutan belantara, aksi dramatis',
  'Thriller':      'ketegangan tinggi, bahaya kota malam, sosok pengintai, aksen warna merah, setting malam mencurigakan',
  'Teen Fiction':  'energi muda, koridor sekolah, persahabatan, warna cerah, kehidupan remaja relatable',
  'Slice of Life': 'suasana kafe nyaman, daun musim gugur, lingkungan tenang, cahaya pagi yang lembut, kehidupan sehari-hari',
  'Historical':    'arsitektur bersejarah, warna sepia vintage, reruntuhan kuno, kostum masa lampau, suasana era klasik',
  'Inspirational': 'matahari terbit di atas gunung, sinar cahaya, warna membangkitkan semangat, sosok berdiri di puncak',
  'Fanfiction':    'siluet karakter ikonik, seni bertema fandom, komposisi dinamis, warna vibrant',
};

const STYLE_LABELS: Record<string, string> = {
  realistic:    'Realistis',
  illustration: 'Ilustrasi',
  anime:        'Anime',
  fantasy:      'Fantasi',
};

const STYLE_MODIFIERS: Record<string, string> = {
  realistic:    'photorealistic, hyperdetailed, 8k, cinematic photography, professional lighting, depth of field',
  illustration: 'detailed digital painting, concept art, vibrant palette, clean sharp lines',
  anime:        'anime key visual, cel shading, clean linework, vivid saturated colors',
  fantasy:      'epic fantasy art, oil painting, dramatic lighting, intricate details, luminous',
};

interface CoverUploadProps {
  preview: string;
  onFileReady: (file: File) => void;
  title?: string;
  category?: string;
  description?: string;
  tags?: string[];
}

export function CoverUpload({ preview, onFileReady, title, category, description, tags }: CoverUploadProps) {
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiStyle, setAiStyle] = useState<'realistic' | 'illustration' | 'anime' | 'fantasy'>('illustration');

  // Form fields (Bahasa Indonesia)
  const [fieldJudul, setFieldJudul]       = useState('');
  const [fieldSuasana, setFieldSuasana]   = useState('');
  const [fieldTokoh, setFieldTokoh]       = useState('');
  const [fieldLatar, setFieldLatar]       = useState('');
  const [fieldWarna, setFieldWarna]       = useState('');
  const [promptPreview, setPromptPreview] = useState('');
  const [promptGenerated, setPromptGenerated] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Bangun prompt dari form fields ──────────────────────────────────────
  const buildPromptFromForm = () => {
    const judulFinal   = fieldJudul.trim()   || title?.trim()    || '';
    const genre        = category || '';
    const genreVisual  = GENRE_VISUALS[genre] || 'adegan dramatis, komposisi sinematik';
    const descSnippet  = description?.trim().substring(0, 100) || '';
    const tagList      = tags?.filter(Boolean).join(', ') || '';

    const parts: string[] = [];

    // Judul & genre
    if (judulFinal) parts.push(`sampul buku untuk cerita berjudul "${judulFinal}"`);
    if (genre) parts.push(`genre ${genre}`);

    // Visual genre otomatis
    parts.push(genreVisual);

    // Suasana
    if (fieldSuasana.trim()) parts.push(`suasana: ${fieldSuasana.trim()}`);

    // Tokoh
    if (fieldTokoh.trim()) parts.push(`tokoh utama: ${fieldTokoh.trim()}`);

    // Latar
    if (fieldLatar.trim()) parts.push(`latar tempat: ${fieldLatar.trim()}`);

    // Warna
    if (fieldWarna.trim()) parts.push(`palet warna: ${fieldWarna.trim()}`);

    // Dari deskripsi cerita
    if (descSnippet) parts.push(`terinspirasi dari: ${descSnippet}`);

    // Tags
    if (tagList) parts.push(`tema: ${tagList}`);

    return parts.join(', ');
  };

  const handleGeneratePrompt = () => {
    const prompt = buildPromptFromForm();
    setPromptPreview(prompt);
    setPromptGenerated(true);
  };

  // ── Crop & resize canvas ─────────────────────────────────────────────────
  const cropAndResize = (img: HTMLImageElement): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = COVER_WIDTH;
      canvas.height = COVER_HEIGHT;
      const ctx = canvas.getContext('2d')!;

      const imgRatio = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (imgRatio > COVER_RATIO) {
        sw = img.height * COVER_RATIO;
        sx = (img.width - sw) / 2;
      } else if (imgRatio < COVER_RATIO) {
        sh = img.width / COVER_RATIO;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, COVER_WIDTH, COVER_HEIGHT);
      canvas.toBlob((blob) => {
        if (blob) resolve(new File([blob], 'cover.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });
  };

  // ── Upload file ──────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setInfo('');

    if (file.size > MAX_FILE_SIZE) { setError('File terlalu besar. Maksimal 5MB.'); return; }
    if (!file.type.startsWith('image/')) { setError('Upload file gambar (JPG, PNG, WebP).'); return; }

    setProcessing(true);
    const img = new Image();
    img.onload = async () => {
      if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
        setError(`Gambar terlalu kecil. Minimal ${MIN_WIDTH}x${MIN_HEIGHT}px. Gambar Anda ${img.width}x${img.height}px.`);
        setProcessing(false); return;
      }
      const ratioDiff = Math.abs((img.width / img.height) - COVER_RATIO);
      setInfo(ratioDiff < 0.05 ? 'Rasio sudah sesuai.' : `Auto-crop ke ${COVER_WIDTH}x${COVER_HEIGHT}px.`);
      const croppedFile = await cropAndResize(img);
      onFileReady(croppedFile);
      setProcessing(false);
    };
    img.onerror = () => { setError('Gagal memuat gambar.'); setProcessing(false); };
    img.src = URL.createObjectURL(file);
  };

  // ── Generate cover gradien dari judul ────────────────────────────────────
  const generateCover = () => {
    const usedTitle = title?.trim();
    if (!usedTitle) {
      setError('Tulis judul cerita terlebih dahulu untuk generate cover.');
      return;
    }
    setError(''); setInfo(''); setProcessing(true);

    const canvas = document.createElement('canvas');
    canvas.width = COVER_WIDTH;
    canvas.height = COVER_HEIGHT;
    const ctx = canvas.getContext('2d')!;

    const colorVariants = GENRE_COLORS[category || ''] || [['#667eea', '#764ba2']];
    const colors = colorVariants[Math.floor(Math.random() * colorVariants.length)];

    const grd = ctx.createLinearGradient(0, 0, COVER_WIDTH, COVER_HEIGHT);
    grd.addColorStop(0, colors[0]);
    grd.addColorStop(1, colors[1]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);

    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(COVER_WIDTH * 0.8, COVER_HEIGHT * 0.75, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(COVER_WIDTH * 0.6, COVER_HEIGHT);
    ctx.lineTo(COVER_WIDTH, COVER_HEIGHT * 0.6);
    ctx.lineTo(COVER_WIDTH, COVER_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#ffffff';
    const tSize = usedTitle.length > 40 ? 32 : usedTitle.length > 30 ? 36 : usedTitle.length > 20 ? 42 : 48;
    ctx.font = `bold ${tSize}px Georgia, "Times New Roman", serif`;

    const words = usedTitle.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > COVER_WIDTH - 100 && cur) { lines.push(cur); cur = w; } else { cur = t; }
    }
    if (cur) lines.push(cur);

    const totalH = lines.slice(0, 5).length * (tSize + 14);
    const startY = (COVER_HEIGHT - totalH) / 2;
    lines.slice(0, 5).forEach((line, i) => {
      ctx.fillText(line, 50, startY + i * (tSize + 14));
    });

    const lineY = startY + Math.min(lines.length, 5) * (tSize + 14) + 10;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(50, lineY, 50, 2);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillText('StoryVerse', 50, COVER_HEIGHT - 40);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, COVER_WIDTH - 48, COVER_HEIGHT - 48);

    canvas.toBlob((blob) => {
      if (blob) { onFileReady(new File([blob], 'generated-cover.png', { type: 'image/png' })); setInfo('Cover berhasil di-generate!'); }
      setProcessing(false);
    }, 'image/png');
  };

  // ── Generate cover AI ────────────────────────────────────────────────────
  const generateCoverAI = async () => {
    const hasData = title?.trim() || fieldJudul.trim() || promptPreview.trim();
    if (!hasData) {
      setError('Isi judul atau gunakan tombol "Buat Prompt Otomatis" terlebih dahulu.');
      return;
    }

    setError(''); setInfo(''); setAiGenerating(true);

    try {
      // Gunakan promptPreview jika sudah di-generate, atau build langsung
      const basePrompt = promptPreview.trim() || buildPromptFromForm();

      const styleText = STYLE_MODIFIERS[aiStyle];
      const seed = Math.floor(Math.random() * 999999);

      const finalPrompt = [
        'Ilustrasi sampul buku profesional yang memukau',
        basePrompt,
        styleText,
        'rasio portrait 2:3',
        'tanpa teks, tanpa kata, tanpa huruf, tanpa judul, tanpa nama pengarang, tanpa watermark',
        'komposisi: subjek terpusat, rule of thirds, secara visual mencolok',
      ].filter(Boolean).join(', ');

      const encodedPrompt = encodeURIComponent(finalPrompt);
      const imageUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&width=600&height=900&seed=${seed}&nologo=true`;

      const response = await fetch(imageUrl, {
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_POLLINATIONS_KEY}` },
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Gagal generate gambar (${response.status})${errText ? ': ' + errText : ''}`);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('Format gambar tidak valid dari server');

      const img = new Image();
      img.onload = async () => {
        const croppedFile = await cropAndResize(img);
        onFileReady(croppedFile);
        setInfo('Cover AI berhasil di-generate!');
        setAiGenerating(false);
      };
      img.onerror = () => { setError('Gagal memuat gambar yang di-generate.'); setAiGenerating(false); };
      img.src = URL.createObjectURL(blob);
    } catch (err: any) {
      setError(err.message || 'Gagal generate cover AI. Coba lagi.');
      setAiGenerating(false);
    }
  };

  // ── Panel AI settings (shared antara ada preview / tidak) ────────────────
  const renderAiPanel = () => (
    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 space-y-3">
      <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
        Isi detail cerita agar gambar yang di-generate lebih akurat dan sesuai.
      </p>

      {/* Judul */}
      <div>
        <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
          Judul Cerita
        </label>
        <input
          type="text"
          value={fieldJudul || title || ''}
          onChange={(e) => setFieldJudul(e.target.value)}
          placeholder={title || 'Contoh: Sang Penjaga Waktu'}
          className="w-full px-3 py-2 text-xs border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Suasana */}
      <div>
        <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
          Suasana / Mood
        </label>
        <input
          type="text"
          value={fieldSuasana}
          onChange={(e) => setFieldSuasana(e.target.value)}
          placeholder="Contoh: gelap dan mencekam, atau hangat dan romantis"
          className="w-full px-3 py-2 text-xs border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Tokoh */}
      <div>
        <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
          Tokoh Utama <span className="text-purple-400">(opsional)</span>
        </label>
        <input
          type="text"
          value={fieldTokoh}
          onChange={(e) => setFieldTokoh(e.target.value)}
          placeholder="Contoh: gadis berambut merah, pria berbaju zirah"
          className="w-full px-3 py-2 text-xs border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Latar */}
      <div>
        <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
          Latar Tempat <span className="text-purple-400">(opsional)</span>
        </label>
        <input
          type="text"
          value={fieldLatar}
          onChange={(e) => setFieldLatar(e.target.value)}
          placeholder="Contoh: kastil tua, kota Tokyo malam hari"
          className="w-full px-3 py-2 text-xs border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Warna */}
      <div>
        <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
          Palet Warna <span className="text-purple-400">(opsional)</span>
        </label>
        <input
          type="text"
          value={fieldWarna}
          onChange={(e) => setFieldWarna(e.target.value)}
          placeholder="Contoh: hitam dan ungu, merah dan emas"
          className="w-full px-3 py-2 text-xs border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Tombol buat prompt otomatis */}
      <button
        onClick={handleGeneratePrompt}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white dark:bg-gray-800 border border-purple-400 text-purple-700 dark:text-purple-300 text-xs font-medium hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Buat Prompt Otomatis dari Data di Atas
      </button>

      {/* Preview prompt */}
      {promptGenerated && promptPreview && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-purple-700 dark:text-purple-300">
            Preview Prompt (bisa diedit)
          </label>
          <textarea
            value={promptPreview}
            onChange={(e) => setPromptPreview(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-xs border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none leading-relaxed"
          />
          <p className="text-[10px] text-purple-500">Prompt ini yang akan dikirim ke AI. Kamu bisa edit sesuai kebutuhan.</p>
        </div>
      )}

      {/* Style */}
      <div>
        <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">Gaya Gambar</label>
        <div className="grid grid-cols-4 gap-1.5">
          {(['realistic', 'illustration', 'anime', 'fantasy'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setAiStyle(style)}
              className={`py-1.5 px-1 text-[10px] rounded-md transition-colors ${
                aiStyle === style
                  ? 'bg-purple-600 text-white font-medium'
                  : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60'
              }`}
            >
              {STYLE_LABELS[style]}
            </button>
          ))}
        </div>
      </div>

      {/* Tombol generate */}
      <button
        onClick={generateCoverAI}
        disabled={aiGenerating}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all"
      >
        {aiGenerating ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sedang Generate...</>
        ) : (
          <><Sparkles className="h-3.5 w-3.5" /> Generate Cover AI</>
        )}
      </button>


    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Cover Image</h3>
        <div className="group relative">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute right-0 top-6 w-52 p-3 bg-brand-bg dark:bg-gray-800 border border-subtle dark:border-gray-700 rounded-lg shadow-xl text-xs text-gray-600 dark:text-gray-400 invisible group-hover:visible z-10 space-y-1">
            <p className="font-medium text-brand-text dark:text-gray-200">Ukuran:</p>
            <p>600 x 900 px (rasio 2:3)</p>
            <p>Min: 400 x 600 px</p>
            <p>Max file: 5MB</p>
            <p>Format: JPG, PNG, WebP</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-500">600x900px (2:3). Upload atau generate otomatis.</p>

      {preview ? (
        <div className="space-y-2">
          {/* Preview gambar dengan hover buttons */}
          <div className="relative">
            <img src={preview} alt="Cover" className="w-full aspect-[2/3] object-cover rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex-wrap p-4">
              <label className="px-3 py-1.5 bg-white text-gray-900 text-xs font-medium rounded-full cursor-pointer hover:bg-gray-100">
                Upload
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
              </label>
              <button
                onClick={generateCover}
                className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-full hover:opacity-90"
              >
                Regenerate
              </button>
              <button
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium rounded-full hover:opacity-90 flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> AI Generate
              </button>
            </div>
          </div>

          {/* Toggle button AI panel saat preview ada */}
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 text-xs hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            {showAiPanel ? 'Tutup Panel AI' : 'Generate Ulang dengan AI'}
            {showAiPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showAiPanel && renderAiPanel()}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Upload area */}
          <label className={`flex flex-col items-center justify-center aspect-[2/3] border-2 border-dashed rounded-lg cursor-pointer transition-colors ${processing ? 'border-accent bg-accent/5' : 'border-gray-300 dark:border-gray-600 hover:border-accent'}`}>
            {processing ? (
              <div className="animate-pulse text-accent text-sm">Processing...</div>
            ) : (
              <>
                <Upload className="h-7 w-7 text-gray-400" />
                <span className="text-xs text-gray-500 mt-2">Upload Cover</span>
                <span className="text-[10px] text-gray-400">600x900px (2:3)</span>
              </>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
          </label>

          {/* Generate dari judul (canvas gradient) */}
          <button
            onClick={generateCover}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-accent text-accent text-xs font-medium hover:bg-accent/10 transition-colors disabled:opacity-50"
          >
            <Wand2 className="h-3.5 w-3.5" /> Generate dari Judul
          </button>

          {/* Toggle AI panel */}
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium hover:opacity-90 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate dengan AI
            {showAiPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showAiPanel && renderAiPanel()}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {info && !error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs">
          <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{info}</span>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
