'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1.5 pt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-subtle dark:border-gray-700 disabled:opacity-30 hover:bg-brand-muted dark:hover:bg-gray-800 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {getPageNumbers().map((page, i) =>
        page === '...' ? (
          <span key={`dot-${i}`} className="px-2 text-sm text-gray-400">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
              currentPage === page
                ? 'bg-accent text-white'
                : 'hover:bg-brand-muted dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-subtle dark:border-gray-700 disabled:opacity-30 hover:bg-brand-muted dark:hover:bg-gray-800 transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <span className="text-xs text-gray-400 ml-2 hidden sm:inline">
        {currentPage}/{totalPages}
      </span>
    </div>
  );
}
