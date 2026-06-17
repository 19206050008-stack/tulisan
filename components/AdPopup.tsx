'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getActiveAds, supabase } from '@/lib/supabase';
import { X, ExternalLink } from 'lucide-react';

const AD_DISMISS_KEY = 'sv_ad_dismissed';

export function AdPopup() {
  const [ad, setAd] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user already dismissed an ad this session
    const dismissed = sessionStorage.getItem(AD_DISMISS_KEY);
    if (dismissed) return;

    getActiveAds().then(ads => {
      if (ads.length > 0) {
        // Pick a random ad
        const randomAd = ads[Math.floor(Math.random() * ads.length)];
        setAd(randomAd);
        // Small delay so page loads first
        setTimeout(() => setShow(true), 1500);
      }
    });
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem(AD_DISMISS_KEY, ad?.id || 'true');
  };

  const handleClick = async () => {
    // Track click
    if (supabase && ad) {
      await supabase.from('ad_requests').update({ clicks_count: (ad.clicks_count || 0) + 1 }).eq('id', ad.id);
    }
    dismiss();
  };

  // Track view
  useEffect(() => {
    if (show && ad && supabase) {
      supabase.from('ad_requests').update({ views_count: (ad.views_count || 0) + 1 }).eq('id', ad.id).then(() => {});
    }
  }, [show, ad]);

  if (!show || !ad) return null;

  const linkHref = ad.stories ? `/story/${ad.story_id}` : (ad.image_url ? '#' : undefined);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={dismiss}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative max-w-lg w-full bg-bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Banner image */}
        {ad.image_url ? (
          linkHref && linkHref !== '#' ? (
            <Link href={linkHref} onClick={handleClick}>
              <img src={ad.image_url} alt={ad.title} className="w-full object-contain max-h-64 bg-bg-input" />
            </Link>
          ) : (
            <img src={ad.image_url} alt={ad.title} className="w-full object-contain max-h-64 bg-bg-input" />
          )
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center p-8">
            <p className="text-2xl font-bold font-serif text-center text-accent">{ad.title}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-tx-muted font-bold mb-1">Sponsored</p>
            <h3 className="text-lg font-bold font-serif">{ad.title}</h3>
            {ad.description && <p className="text-sm text-tx-soft mt-1">{ad.description}</p>}
          </div>

          {ad.stories && (
            <Link
              href={`/story/${ad.story_id}`}
              onClick={handleClick}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity w-fit"
            >
              Read Now <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
