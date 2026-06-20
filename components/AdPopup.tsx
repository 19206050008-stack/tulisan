'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { X, Eye, Heart, BookOpen } from 'lucide-react';
import { getPublishedAds } from '@/lib/supabase';

export function AdPopup() {
  const [ad, setAd] = useState<any>(null);
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;

    const seenAds = JSON.parse(localStorage.getItem('seenAds') || '[]');

    getPublishedAds().then(ads => {
      if (!ads || ads.length === 0) return;
      const unseen = ads.filter((a: any) => !seenAds.includes(a.id));
      if (unseen.length === 0) return;
      const randomAd = unseen[Math.floor(Math.random() * unseen.length)];
      setAd(randomAd);
      setShow(true);
    });
  }, [pathname]);

  const handleClose = () => {
    if (ad) {
      const seenAds = JSON.parse(localStorage.getItem('seenAds') || '[]');
      if (!seenAds.includes(ad.id)) {
        seenAds.push(ad.id);
        localStorage.setItem('seenAds', JSON.stringify(seenAds));
      }
    }
    setShow(false);
  };

  if (!show || !ad) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-4">
      <div className="relative bg-bg-card rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg overflow-hidden">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 md:top-3 md:right-3 z-10 p-1.5 md:p-2 rounded-full bg-bg-card/80 backdrop-blur-sm hover:bg-bg-soft transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 md:h-5 md:w-5" />
        </button>

        {ad.image_url && (
          <div className="w-full bg-bg-input flex items-center justify-center max-h-[200px] sm:max-h-[280px] md:max-h-[350px] overflow-hidden">
            <img
              src={ad.image_url}
              alt={ad.title}
              className="w-full h-auto object-contain"
            />
          </div>
        )}

        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div className="space-y-1.5">
            <h3 className="text-base md:text-xl font-bold font-serif line-clamp-2">{ad.title}</h3>
            {ad.description && (
              <p className="text-xs md:text-sm text-tx-soft line-clamp-2 md:line-clamp-3">{ad.description}</p>
            )}
          </div>

          {ad.stories && (
            <div className="p-3 rounded-xl bg-bg-soft/50 border border-border space-y-2">
              <div className="flex items-center gap-2 text-xs text-tx-muted">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-tx truncate">{ad.stories.title}</span>
              </div>
              {ad.stories.description && (
                <p className="text-[11px] md:text-xs text-tx-soft line-clamp-2">{ad.stories.description}</p>
              )}
              <div className="flex items-center gap-3 text-[10px] md:text-xs text-tx-muted">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {ad.stories.reads_count || 0}</span>
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {ad.stories.likes_count || 0}</span>
              </div>
              <Link
                href={`/story/${ad.story_id || ad.stories?.id}`}
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <BookOpen className="h-3 w-3" /> Baca Cerita
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[10px] md:text-[11px] text-tx-muted">Iklan dipromosikan</span>
            <button
              onClick={handleClose}
              className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-border text-xs md:text-sm font-medium hover:bg-bg-soft transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
