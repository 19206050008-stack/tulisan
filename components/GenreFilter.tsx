'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface GenreFilterProps {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
  visibleCount?: number;
}

export function GenreFilter({ categories, active, onChange, visibleCount = 6 }: GenreFilterProps) {
  const [showAll, setShowAll] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const visible = categories.slice(0, visibleCount);
  const hidden = categories.slice(visibleCount);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowAll(false);
      }
    };
    if (showAll) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAll]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {visible.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            active === cat
              ? 'bg-accent text-white hover:opacity-90'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          {cat}
        </button>
      ))}

      {hidden.length > 0 && (
        <div className="relative" ref={popupRef}>
          <button
            onClick={() => setShowAll(!showAll)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
              hidden.includes(active)
                ? 'bg-accent text-white hover:opacity-90'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {hidden.includes(active) ? active : 'More'}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </button>

          {showAll && (
            <div className="fixed inset-0 z-40" onClick={() => setShowAll(false)} />
          )}
          {showAll && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-bg-card rounded-xl shadow-2xl border border-border py-2 z-50 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-border">
                <span className="text-xs font-semibold text-gray-500 uppercase">All Genres</span>
                <button onClick={() => setShowAll(false)} className="p-1 rounded hover:bg-bg-soft">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {hidden.map(cat => (
                <button
                  key={cat}
                  onClick={() => { onChange(cat); setShowAll(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    active === cat
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-tx-soft hover:bg-bg-soft'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
