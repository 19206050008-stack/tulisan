'use client';

import { useState, useRef } from 'react';
import { Upload, AlertTriangle, Check, Info, Wand2 } from 'lucide-react';

// Standard banner sizes based on Google Ad Manager
const BANNER_SIZES = [
  { id: 'leaderboard', name: 'Leaderboard', width: 728, height: 90, description: 'Paling populer, cocok untuk atas konten' },
  { id: 'medium-rectangle', name: 'Medium Rectangle', width: 300, height: 250, description: 'Ideal untuk dalam artikel' },
  { id: 'large-rectangle', name: 'Large Rectangle', width: 336, height: 280, description: 'Lebih besar dari medium' },
  { id: 'half-page', name: 'Half Page', width: 300, height: 600, description: 'Format vertikal, high impact' },
  { id: 'banner', name: 'Banner', width: 468, height: 60, description: 'Format klasik, compact' },
  { id: 'mobile-banner', name: 'Mobile Banner', width: 320, height: 50, description: 'Khusus mobile' },
];

interface BannerUploadProps {
  preview?: string;
  onFileReady: (file: File) => void;
  title?: string;
  description?: string;
  category?: string;
}

export function BannerUpload({ preview, onFileReady, title, description, category }: BannerUploadProps) {
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedSize, setSelectedSize] = useState(BANNER_SIZES[0]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Crop & resize canvas ────────────────────────────────────────
  const cropAndResize = (img: HTMLImageElement): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = selectedSize.width;
      canvas.height = selectedSize.height;
      const ctx = canvas.getContext('2d')!;

      const imgRatio = img.width / img.height;
      const bannerRatio = selectedSize.width / selectedSize.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (imgRatio > bannerRatio) {
        sw = img.height * bannerRatio;
        sx = (img.width - sw) / 2;
      } else if (imgRatio < bannerRatio) {
        sh = img.width / bannerRatio;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, selectedSize.width, selectedSize.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(new File([blob], 'banner.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });
  };

  // ── Upload file ─────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setInfo('');

    if (file.size > 5 * 1024 * 1024) { setError('File terlalu besar. Maksimal 5MB.'); return; }
    if (!file.type.startsWith('image/')) { setError('Upload file gambar (JPG, PNG, WebP).'); return; }

    setProcessing(true);
    const img = new Image();
    img.onload = async () => {
      const minSize = Math.min(selectedSize.width, selectedSize.height) * 0.5;
      if (img.width < minSize || img.height < minSize) {
        setError(`Gambar terlalu kecil. Minimal ${Math.round(minSize)}x${Math.round(minSize)}px untuk ukuran ini.`);
        setProcessing(false); 
        return;
      }
      const ratioDiff = Math.abs((img.width / img.height) - (selectedSize.width / selectedSize.height));
      setInfo(ratioDiff < 0.1 ? 'Rasio sudah sesuai.' : `Auto-crop ke ${selectedSize.width}x${selectedSize.height}px.`);
      const croppedFile = await cropAndResize(img);
      onFileReady(croppedFile);
      setProcessing(false);
    };
    img.onerror = () => { setError('Gagal memuat gambar.'); setProcessing(false); };
    img.src = URL.createObjectURL(file);
  };

  // ── Generate banner dari judul + deskripsi (Flat Design) ────────
  const generateBannerAd = async () => {
    const usedTitle = title?.trim();
    if (!usedTitle) {
      setError('Tulis judul cerita terlebih dahulu untuk generate banner.');
      return;
    }
    
    setError(''); setInfo(''); setProcessing(true);
    setInfo('Sedang membuat banner...');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = selectedSize.width;
      canvas.height = selectedSize.height;
      const ctx = canvas.getContext('2d')!;

      // Random layout selection
      const layouts = [
        'gradient-right',
        'gradient-left', 
        'gradient-diagonal',
        'solid-accent',
        'split-horizontal',
      ];
      const selectedLayout = layouts[Math.floor(Math.random() * layouts.length)]; // eslint-disable-line react-hooks/purity

      // Get color scheme based on category
      const colorScheme = getColorScheme(category);

      // Draw background based on layout
      drawBackground(ctx, canvas, selectedLayout, colorScheme);

      // Draw decorative elements
      drawDecorations(ctx, canvas, colorScheme);

      // Draw text with proper contrast and CENTERED alignment
      drawText(ctx, canvas, usedTitle, description || category || '', colorScheme);

      // Convert to file
      canvas.toBlob((blob) => {
        if (blob) {
          const timestampedFilename = `banner-${Date.now()}.jpg`;
          const generatedFile = new File([blob], timestampedFilename, { type: 'image/jpeg' });
          onFileReady(generatedFile);
          setInfo('Banner berhasil di-generate!');
        }
        setProcessing(false);
      }, 'image/jpeg', 0.95);
    } catch (err: any) {
      console.error('Banner generation error:', err);
      setError('Gagal generate banner. Silakan upload manual atau coba lagi.');
      setProcessing(false);
    }
  };

  // ── Color Schemes ──────────────────────────────────────────────
  const getColorScheme = (cat?: string) => {
    const schemes: Record<string, { primary: string; secondary: string; accent: string; text: string }> = {
      'Romance': { primary: '#FF6B9D', secondary: '#FF8E9E', accent: '#FFD4E0', text: '#FFFFFF' },
      'Fantasy': { primary: '#A78BFA', secondary: '#C4B5FD', accent: '#DDD6FE', text: '#FFFFFF' },
      'Sci-Fi': { primary: '#3B82F6', secondary: '#60A5FA', accent: '#93C5FD', text: '#FFFFFF' },
      'Mystery': { primary: '#64748B', secondary: '#94A3B8', accent: '#CBD5E1', text: '#FFFFFF' },
      'Horror': { primary: '#991B1B', secondary: '#DC2626', accent: '#FCA5A5', text: '#FFFFFF' },
      'Adventure': { primary: '#10B981', secondary: '#34D399', accent: '#6EE7B7', text: '#FFFFFF' },
      'Drama': { primary: '#F59E0B', secondary: '#FBBF24', accent: '#FDE047', text: '#1F2937' },
      'Humor': { primary: '#EC4899', secondary: '#F472B6', accent: '#FBCFE8', text: '#FFFFFF' },
      'Historical': { primary: '#92400E', secondary: '#B45309', accent: '#D97706', text: '#FFFFFF' },
      'Inspirational': { primary: '#059669', secondary: '#10B981', accent: '#34D399', text: '#FFFFFF' },
    };
    return schemes[cat || ''] || { primary: '#6366F1', secondary: '#818CF8', accent: '#A5B4FC', text: '#FFFFFF' };
  };

  // ── Draw Background ────────────────────────────────────────────
  const drawBackground = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, layout: string, colors: any) => {
    const w = canvas.width;
    const h = canvas.height;

    switch (layout) {
      case 'gradient-right': {
        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(1, colors.secondary);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'gradient-left': {
        const gradient = ctx.createLinearGradient(w, 0, 0, 0);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(1, colors.secondary);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'gradient-diagonal': {
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(1, colors.secondary);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'solid-accent': {
        ctx.fillStyle = colors.primary;
        ctx.fillRect(0, 0, w, h);
        // Add accent stripe
        ctx.fillStyle = colors.accent;
        ctx.fillRect(0, h - 8, w, 8);
        break;
      }
      case 'split-horizontal': {
        ctx.fillStyle = colors.primary;
        ctx.fillRect(0, 0, w * 0.6, h);
        ctx.fillStyle = colors.secondary;
        ctx.fillRect(w * 0.6, 0, w * 0.4, h);
        break;
      }
    }
  };

  // ── Draw Decorations ───────────────────────────────────────────
  const drawDecorations = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, colors: any) => {
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#FFFFFF';

    // Random decorative shapes
    const shapes = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < shapes; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 40 + 20;
      
      ctx.beginPath();
      if (Math.random() > 0.5) {
        // Circle
        ctx.arc(x, y, size, 0, Math.PI * 2);
      } else {
        // Rectangle
        ctx.rect(x - size/2, y - size/2, size, size);
      }
      ctx.fill();
    }
    
    ctx.restore();
  };

  // ── Draw Text ──────────────────────────────────────────────────
  const drawText = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, title: string, subtitle: string, colors: any) => {
    const w = canvas.width;
    const h = canvas.height;
    
    // Calculate text positioning - CENTERED
    const padding = Math.max(20, w * 0.05);
    const maxWidth = w - (padding * 2);
    
    // Title styling - adaptive based on banner size
    let titleSize = Math.max(16, Math.min(32, h * 0.4));
    if (title.length > 40) titleSize = Math.max(14, titleSize * 0.85);
    if (title.length > 50) titleSize = Math.max(12, titleSize * 0.7);
    
    ctx.font = `bold ${titleSize}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Text shadow for better contrast
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Word wrap title
    const words = title.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Limit to 3 lines max for better centering
    const displayLines = lines.slice(0, 3);
    
    // Calculate vertical position for CENTERED text
    const lineHeight = titleSize * 1.3;
    const subtitleHeight = subtitle ? 20 : 0;
    const totalHeight = displayLines.length * lineHeight + subtitleHeight;
    const startY = (h - totalHeight) / 2;
    
    // Draw title - CENTERED
    displayLines.forEach((line, i) => {
      ctx.fillText(line, w / 2, startY + (i * lineHeight) + (lineHeight / 2));
    });
    
    // Draw subtitle if provided - CENTERED
    if (subtitle && subtitle.trim()) {
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      const subtitleSize = Math.max(11, Math.min(16, h * 0.2));
      ctx.font = `500 ${subtitleSize}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.globalAlpha = 0.9;
      
      // Truncate subtitle if too long
      let displaySubtitle = subtitle;
      while (ctx.measureText(displaySubtitle + '...').width > maxWidth && displaySubtitle.length > 20) {
        displaySubtitle = displaySubtitle.slice(0, -1);
      }
      if (displaySubtitle.length < subtitle.length) {
        displaySubtitle += '...';
      }
      
      // Draw subtitle CENTERED below title
      const subtitleY = startY + (displayLines.length * lineHeight) + 10;
      ctx.fillText(displaySubtitle, w / 2, subtitleY);
      ctx.globalAlpha = 1;
    }
    
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Banner Iklan</h3>
        <div className="group relative">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute right-0 top-6 w-52 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl text-xs text-gray-600 dark:text-gray-400 invisible group-hover:visible z-10 space-y-1">
            <p className="font-medium text-gray-900 dark:text-gray-100">Ukuran Standar:</p>
            <p>Leaderboard: 728x90</p>
            <p>Medium Rectangle: 300x250</p>
            <p>Large Rectangle: 336x280</p>
            <p>Half Page: 300x600</p>
            <p>Banner: 468x60</p>
            <p>Mobile: 320x50</p>
          </div>
        </div>
      </div>

      {/* Size Selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Pilih Ukuran Banner</label>
        <select
          value={selectedSize.id}
          onChange={(e) => {
            const size = BANNER_SIZES.find(s => s.id === e.target.value);
            if (size) {
              setSelectedSize(size);
              if (preview) {
                setInfo('Ukuran berubah. Silakan generate ulang atau upload banner baru untuk ukuran ini.');
              }
            }
          }}
          className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent dark:text-gray-900 [&>option]:bg-white [&>option]:text-gray-900"
        >
          {BANNER_SIZES.map(size => (
            <option key={size.id} value={size.id} className="bg-white text-gray-900">
              {size.name} ({size.width}x{size.height})
            </option>
          ))}
        </select>
        <p className="text-[11px] text-tx-muted">{selectedSize.description}</p>
      </div>

      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Upload banner dari Canva atau generate otomatis menggunakan judul + deskripsi. Ukuran: {selectedSize.width}x{selectedSize.height}px
      </p>

      {preview ? (
        <div className="space-y-2">
          {/* Preview gambar dengan hover buttons */}
          <div className="relative">
            <img src={preview} alt="Banner" className="w-full rounded-lg" style={{ maxWidth: `${selectedSize.width}px`, aspectRatio: `${selectedSize.width}/${selectedSize.height}`, objectFit: 'cover', margin: '0 auto', display: 'block' }} />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex-wrap p-4">
              <label className="px-3 py-1.5 bg-white text-gray-900 text-xs font-medium rounded-full cursor-pointer hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700">
                Upload Baru
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
              </label>
              <button
                onClick={generateBannerAd}
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
          <label className={`flex flex-col items-center justify-center rounded-lg cursor-pointer transition-colors ${processing ? 'border-accent bg-accent/5' : 'border-gray-300 dark:border-gray-600 hover:border-accent'}`} style={{ minHeight: `${Math.min(120, selectedSize.height * 0.5)}px`, maxHeight: '200px', border: '2px dashed' }}>
            {processing ? (
              <div className="animate-pulse text-accent text-sm">Processing...</div>
            ) : (
              <>
                <Upload className="h-7 w-7 text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">Upload Banner</span>
                <span className="text-[10px] text-gray-400">{selectedSize.width}x{selectedSize.height}px</span>
              </>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
          </label>

          {/* Generate banner dari judul */}
          <button
            onClick={generateBannerAd}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-accent text-accent text-xs font-medium hover:bg-accent/10 transition-colors disabled:opacity-50"
          >
            <Wand2 className="h-3.5 w-3.5" /> Generate Banner Otomatis
          </button>

          <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
            Generate banner menggunakan Canvas dengan judul + deskripsi cerita Anda
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
