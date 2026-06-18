'use client';

import { useEffect, useState } from 'react';
import { X, Eye, Heart } from 'lucide-react';
import { getPublishedAds } from '@/lib/supabase';

export function AdPopup() {
  const [ad, setAd] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has seen an ad in this session
    const hasSeenAd = sessionStorage.getItem('hasSeenAd');
    if (hasSeenAd) return;

    // Fetch published ads
    getPublishedAds().then(ads => {
      if (ads && ads.length > 0) {
        // Pick a random ad
        const randomAd = ads[Math.floor(Math.random() * ads.length)];
        setAd(randomAd);
        setShow(true);
        sessionStorage.setItem('hasSeenAd', 'true');
      }
    });
  }, []);

  const handleClose = () => {
    setShow(false);
  };

  if (!show || !ad) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative bg-bg-card rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-bg-card/80 backdrop-blur-sm hover:bg-bg-soft transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Banner image */}
        {ad.image_url && (
          <div className="w-full bg-bg-input flex items-center justify-center" style={{ maxHeight: '400px', overflow: 'hidden' }}>
            <img
              src={ad.image_url}
              alt={ad.title}
              className="w-full h-auto object-contain"
              style={{ maxHeight: '400px' }}
            />
          </div>
        )}

        {/* Ad content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-xl font-bold font-serif">{ad.title}</h3>
            {ad.description && (
              <p className="text-sm text-tx-soft line-clamp-3">{ad.description}</p>
            )}
          </div>

          {/* Story info if linked */}
          {ad.stories && (
            <div className="flex items-center gap-4 text-xs text-tx-muted pt-2 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                <span>{ad.stories.reads_count || 0} views</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" />
                <span>{ad.stories.likes_count || 0} likes</span>
              </div>
              <div className="text-tx-soft">
                Story: <span className="font-medium text-tx">{ad.stories.title}</span>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-tx-muted">Iklan dipromosikan</span>
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
