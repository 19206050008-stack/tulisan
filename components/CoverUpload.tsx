'use client';

import { useState, useRef } from 'react';
import { Upload, AlertTriangle, Check, Info, Wand2 } from 'lucide-react';

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

// 10 Font options for cover generation
const FONTS = [
  { id: 'serif', name: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { id: 'sans-serif', name: 'Sans Serif', value: '"Arial Narrow", Arial, sans-serif' },
  { id: 'monospace', name: 'Monospace', value: '"Courier New", monospace' },
  { id: 'italic', name: 'Italic Serif', value: 'italic Georgia, "Times New Roman", serif' },
  { id: 'light', name: 'Light', value: '300 48px Georgia, "Times New Roman", serif' },
  { id: 'bold-light', name: 'Bold Light', value: 'bold italic 48px Georgia, "Times New Roman", serif' },
  { id: 'modern', name: 'Modern', value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { id: 'elegant', name: 'Elegant', value: 'italic 500 Georgia, "Times New Roman", serif' },
  { id: 'classic', name: 'Classic', value: 'normal normal 48px "Times New Roman", serif' },
  { id: 'clean', name: 'Clean', value: '500 "Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
];

interface CoverUploadProps {
  preview: string;
  onFileReady: (file: File) => void;
  title?: string;
  category?: string;
  description?: string;
  tags?: string[];
}

export function CoverUpload({ preview, onFileReady, title, category }: CoverUploadProps) {
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedFont, setSelectedFont] = useState(FONTS[0]); // Default to Serif

  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Use selected font with dynamic sizing
    const fontValue = selectedFont.value.replace(/\d+\s*/, ''); // Remove pre-set sizes from font value
    
    let fontSize = usedTitle.length > 40 ? 32 : usedTitle.length > 30 ? 36 : usedTitle.length > 20 ? 42 : 48;
    
    // Check if font has weight/italic already
    const hasWeight = /normal|bold|bolder|lighter|[0-9]+/.test(selectedFont.value);
    const hasStyle = /italic/.test(selectedFont.value);
    
    ctx.font = `${hasWeight ? '' : 'bold '}${hasStyle ? 'italic ' : ''}${fontSize}px ${fontValue}`;

    const words = usedTitle.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > COVER_WIDTH - 100 && cur) { lines.push(cur); cur = w; } else { cur = t; }
    }
    if (cur) lines.push(cur);

    const totalH = lines.slice(0, 5).length * (fontSize + 14);
    const startY = (COVER_HEIGHT - totalH) / 2;
    lines.slice(0, 5).forEach((line, i) => {
      ctx.fillText(line, 50, startY + i * (fontSize + 14));
    });

    // IMPORTANT: NO ICONS, NO MARKERS - Just title + gradient background!

    canvas.toBlob((blob) => {
      if (blob) { onFileReady(new File([blob], 'generated-cover.png', { type: 'image/png' })); setInfo('Cover berhasil di-generate!'); }
      setProcessing(false);
    }, 'image/png');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Cover Image</h3>
        <div className="group relative">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute right-0 top-6 w-52 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl text-xs text-gray-600 dark:text-gray-400 invisible group-hover:visible z-10 space-y-1">
            <p className="font-medium text-gray-900 dark:text-gray-100">Ukuran:</p>
            <p>600 x 900 px (rasio 2:3)</p>
            <p>Min: 400 x 600 px</p>
            <p>Max file: 5MB</p>
            <p>Format: JPG, PNG, WebP</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Upload cover dari Canva atau generate sederhana dari judul. Ukuran: 600x900px (2:3)
      </p>

      {preview ? (
        <div className="space-y-2">
          {/* Preview gambar dengan hover buttons */}
          <div className="relative">
            <img src={preview} alt="Cover" className="w-full aspect-[2/3] object-cover rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex-wrap p-4">
              <label className="px-3 py-1.5 bg-white text-gray-900 text-xs font-medium rounded-full cursor-pointer hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700">
                Upload Baru
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
              </label>
              <button
                onClick={generateCover}
                className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-full hover:opacity-90"
              >
                Regenerate
              </button>
            </div>
          </div>
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
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">Upload Cover dari Canva</span>
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
        <Wand2 className="h-3.5 w-3.5" /> Generate Sederhana dari Judul
      </button>

      {/* Font selector for cover generation */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Font Style</label>
        <select
          value={selectedFont.id}
          onChange={e => {
            const font = FONTS.find(f => f.id === e.target.value);
            if (font) setSelectedFont(font);
          }}
          className="w-full px-3 py-2 text-xs rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx"
        >
          {FONTS.map(font => (
            <option key={font.id} value={font.id}>{font.name}</option>
          ))}
        </select>
      </div>

      <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
        Buat cover di Canva lalu upload, atau generate sederhana menggunakan judul + gradient warna
      </p>
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
