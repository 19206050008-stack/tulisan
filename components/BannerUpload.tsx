'use client';

import { useState, useRef } from 'react';
import { Upload, AlertTriangle, Check, Info, Wand2 } from 'lucide-react';
import { generateBanner } from '@/lib/supabase';

const BANNER_WIDTH = 728;
const BANNER_HEIGHT = 90;

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Crop & resize canvas ────────────────────────────────────────
  const cropAndResize = (img: HTMLImageElement): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = BANNER_WIDTH;
      canvas.height = BANNER_HEIGHT;
      const ctx = canvas.getContext('2d')!;

      const imgRatio = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (imgRatio > BANNER_WIDTH / BANNER_HEIGHT) {
        sw = img.height * (BANNER_WIDTH / BANNER_HEIGHT);
        sx = (img.width - sw) / 2;
      } else if (imgRatio < BANNER_WIDTH / BANNER_HEIGHT) {
        sh = img.width / (BANNER_WIDTH / BANNER_HEIGHT);
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, BANNER_WIDTH, BANNER_HEIGHT);
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
      if (img.width < 400 || img.height < 60) {
        setError(`Gambar terlalu kecil. Minimal 400x60px untuk banner.`);
        setProcessing(false); 
        return;
      }
      const ratioDiff = Math.abs((img.width / img.height) - (BANNER_WIDTH / BANNER_HEIGHT));
      setInfo(ratioDiff < 0.1 ? 'Rasio sudah sesuai.' : `Auto-crop ke ${BANNER_WIDTH}x${BANNER_HEIGHT}px.`);
      const croppedFile = await cropAndResize(img);
      onFileReady(croppedFile);
      setProcessing(false);
    };
    img.onerror = () => { setError('Gagal memuat gambar.'); setProcessing(false); };
    img.src = URL.createObjectURL(file);
  };

  // ── Generate banner dari judul + deskripsi ─────────────────────
  const generateBannerAd = async () => {
    const usedTitle = title?.trim();
    if (!usedTitle) {
      setError('Tulis judul cerita terlebih dahulu untuk generate banner.');
      return;
    }
    
    setError(''); setInfo(''); setProcessing(true);
    setInfo('Sedang membuat banner...');

    try {
      // Use Pollinations AI to generate banner
      const imageUrl = await generateBanner(usedTitle, description, category);
      
      // Fetch the image and convert to File
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const timestampedFilename = `banner-${Date.now()}.jpg`;
      const generatedFile = new File([blob], timestampedFilename, { type: 'image/jpeg' });
      
      onFileReady(generatedFile);
      setInfo('Banner berhasil di-generate!');
    } catch (err: any) {
      console.error('Banner generation error:', err);
      setError('Gagal generate banner. Silakan upload manual atau coba lagi.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Banner Iklan</h3>
        <div className="group relative">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute right-0 top-6 w-52 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl text-xs text-gray-600 dark:text-gray-400 invisible group-hover:visible z-10 space-y-1">
            <p className="font-medium text-gray-900 dark:text-gray-100">Ukuran:</p>
            <p>{BANNER_WIDTH} x {BANNER_HEIGHT} px (rasio 8:1)</p>
            <p>Min: 400x60 px</p>
            <p>Max file: 5MB</p>
            <p>Format: JPG, PNG, WebP</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Upload banner dari Canva atau generate otomatis menggunakan judul + deskripsi. Ukuran: {BANNER_WIDTH}x{BANNER_HEIGHT}px
      </p>

      {preview ? (
        <div className="space-y-2">
          {/* Preview gambar dengan hover buttons */}
          <div className="relative">
            <img src={preview} alt="Banner" className="w-full aspect-[8/1] object-cover rounded-lg" style={{ maxWidth: '728px', margin: '0 auto', display: 'block' }} />
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
          <label className={`flex flex-col items-center justify-center aspect-[8/1] min-h-[60px] max-h-[120px] border-2 border-dashed rounded-lg cursor-pointer transition-colors ${processing ? 'border-accent bg-accent/5' : 'border-gray-300 dark:border-gray-600 hover:border-accent'}`}>
            {processing ? (
              <div className="animate-pulse text-accent text-sm">Processing...</div>
            ) : (
              <>
                <Upload className="h-7 w-7 text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">Upload Banner dari Canva</span>
                <span className="text-[10px] text-gray-400">{BANNER_WIDTH}x{BANNER_HEIGHT}px (8:1)</span>
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
            Buat banner di Canva lalu upload, atau generate otomatis menggunakan judul + deskripsi cerita Anda
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
