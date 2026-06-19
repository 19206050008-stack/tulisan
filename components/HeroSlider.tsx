'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFeaturedSlides } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { getGenreGradient, FALLBACK_GRADIENTS } from '@/lib/genre-colors';

function getSlideGradient(slide: any, index: number) {
  const genre = slide.category || slide.image_url?.replace('gradient:', '') || '';
  return getGenreGradient(genre) || FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
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
