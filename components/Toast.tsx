'use client';

import { useState, useEffect } from 'react';
import { CircleCheck, X } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium">
        <CircleCheck className="h-4 w-4 text-green-400 dark:text-green-600" />
        {message}
        <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
