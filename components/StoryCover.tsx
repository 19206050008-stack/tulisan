'use client';

import Image from 'next/image';
import { getGenreGradient } from '@/lib/genre-colors';

// Tiny inline SVG placeholder — 0 network requests, instant render
const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNjAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzIyMiIvPjwvc3ZnPg==';

interface StoryCoverProps {
  coverUrl?: string | null;
  category?: string;
  title: string;
  className?: string;
}

export function StoryCover({ coverUrl, category, title, className = '' }: StoryCoverProps) {
  if (coverUrl && !coverUrl.startsWith('gradient:')) {
    return (
      <Image
        src={coverUrl}
        alt={`Cover ${title}`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
        className={`object-cover ${className}`}
        loading="lazy"
        placeholder="blur"
        blurDataURL={BLUR_PLACEHOLDER}
      />
    );
  }

  const genre = coverUrl?.replace('gradient:', '') || category || '';
  const gradient = getGenreGradient(genre);

  return (
    <div className={`w-full h-full flex items-end p-3 ${className}`} style={{ background: gradient }}>
      <span className="text-white/80 text-[10px] font-medium uppercase tracking-wider">{genre}</span>
    </div>
  );
}
