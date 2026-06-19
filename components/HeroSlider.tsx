'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFeaturedSlides } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

const GENRE_GRADIENTS: Record<string, string> = {
  'Romance': 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
  'Horror': 'linear-gradient(135deg, #2d1b69 0%, #11001c 100%)',
  'Mystery': 'linear-gradient(135deg, #4a5568 0%, #1a202c 100%)',
  'Sci-Fi': 'linear-gradient(135deg, #0099f7 0%, #005999 100%)',
  'Fantasy': 'linear-gradient(135deg, #7f53ac 0%, #647dee 100%)',
  'Drama': 'linear-gradient(135deg, #e96443 0%, #904e95 100%)',
  'Humor': 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  'Adventure': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'Thriller': 'linear-gradient(135deg, #c31432 0%, #240b36 100%)',
  'Slice of Life': 'linear-gradient(135deg, #76b852 0%, #8dc26f 100%)',
  'Historical': 'linear-gradient(135deg, #8e7c54 0%, #5c4a1e 100%)',
  'Inspirational': 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
};

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
];

function getSlideGradient(slide: any, index: number) {
  const genre = slide.category || slide.image_url?.replace('gradient:', '') || '';
  return GENRE_GRADIENTS[genre] || FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
}

export function HeroSlider() {
  const [slides, setSlides] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadSlides = async () => {
    const data = await getFeaturedSlides();
    setSlides(data);
    setLoading(false);
  };

  useEffect(() => { loadSlides(); }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const prev = () => setCurrent(c => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent(c => (c + 1) % slides.length);

  if (loading) {
    return <div className="rounded-2xl bg-gray-200 dark:bg-gray-800 h-44 md:h-56 animate-pulse" />;
  }

  if (slides.length === 0) return null;

  const slide = slides[current];
  const authorName = slide.stories?.profiles?.full_name || slide.stories?.profiles?.username || '';

  return (
    <section className="relative rounded-2xl overflow-hidden text-white h-44 md:h-56">
      <div className="absolute inset-0">
        <div className="w-full h-full" style={{ background: getSlideGradient(slide, current) }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      </div>

      <div className="relative z-10 h-full flex flex-col justify-center pl-6 pr-16 md:pl-10 md:pr-24 max-w-xl">
        <div className="flex items-center gap-2 mb-1.5">
          {slide.badge && (
            <span className="px-2 py-0.5 bg-bg-card/20 backdrop-blur-sm rounded text-[10px] font-semibold uppercase tracking-wider">
              {slide.badge}
            </span>
          )}
          {authorName && (
            <span className="text-[10px] text-white/60">by {authorName}</span>
          )}
        </div>
        <h2 className="text-base md:text-xl lg:text-2xl font-bold font-serif leading-snug">
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p className="text-white/80 text-[11px] md:text-sm mt-1.5 leading-relaxed">{slide.subtitle}</p>
        )}
        <div className="mt-3">
          <Link
            href={slide.story_id ? `/story/${slide.story_id}` : '/browse'}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 md:px-5 md:py-2 bg-bg-card text-tx text-xs md:text-sm font-semibold rounded-full hover:bg-bg-soft transition"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Baca
          </Link>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition">
            <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition">
            <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex gap-1">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`rounded-full transition-all ${i === current ? 'bg-bg-card w-4 h-1.5' : 'bg-bg-card/40 w-1.5 h-1.5 hover:bg-bg-card/70'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
