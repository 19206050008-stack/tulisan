'use client';

import { useState } from 'react';
import { Heart, X, ExternalLink } from 'lucide-react';

const PLATFORM_ICONS: Record<string, { label: string; color: string }> = {
  saweria: { label: 'Saweria', color: '#f59e0b' },
  trakteer: { label: 'Trakteer', color: '#ef4444' },
  sociabuzz: { label: 'Sociabuzz', color: '#8b5cf6' },
  karyakarsa: { label: 'KaryaKarsa', color: '#3b82f6' },
  custom: { label: 'Donasi', color: '#10b981' },
};

interface DonationLink {
  platform: string;
  url: string;
}

interface DonatePopupProps {
  show: boolean;
  onClose: () => void;
  authorName: string;
  links: DonationLink[];
}

export function DonatePopup({ show, onClose, authorName, links }: DonatePopupProps) {
  if (!show || links.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm p-6 bg-brand-bg dark:bg-gray-800 rounded-2xl shadow-2xl border border-subtle dark:border-gray-700">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <X className="h-4 w-4" />
        </button>

        <div className="text-center space-y-3 mb-5">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <Heart className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-bold font-serif">Dukung {authorName}</h3>
          <p className="text-sm text-gray-500">Pilih platform untuk memberikan dukungan</p>
        </div>

        <div className="space-y-2">
          {links.map((link, i) => {
            const platform = PLATFORM_ICONS[link.platform] || PLATFORM_ICONS.custom;
            return (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full p-3 rounded-xl border border-subtle dark:border-gray-700 hover:bg-brand-muted dark:hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: platform.color }}>
                    {platform.label[0]}
                  </div>
                  <span className="font-medium text-sm">{platform.label}</span>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-accent transition-colors" />
              </a>
            );
          })}
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-4">Anda akan diarahkan ke platform donasi external</p>
      </div>
    </>
  );
}

export function DonateButton({ authorName, links }: { authorName: string; links: DonationLink[] }) {
  const [show, setShow] = useState(false);

  if (!links || links.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="flex flex-col items-center gap-2 p-4 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
      >
        <Heart className="h-8 w-8" />
        <span className="text-xs font-semibold">Dukung</span>
      </button>
      <DonatePopup show={show} onClose={() => setShow(false)} authorName={authorName} links={links} />
    </>
  );
}
