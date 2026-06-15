'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, LogIn } from 'lucide-react';

interface LoginPopupProps {
  show: boolean;
  onClose: () => void;
  message?: string;
}

export function LoginPopup({ show, onClose, message }: LoginPopupProps) {
  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm p-6 bg-brand-bg dark:bg-gray-800 rounded-2xl shadow-2xl border border-subtle dark:border-gray-700">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <X className="h-4 w-4" />
        </button>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
            <LogIn className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-lg font-bold font-serif">Login Required</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {message || 'You need to be logged in to perform this action.'}
          </p>
          <div className="flex gap-3 pt-2">
            <Link href="/login" className="flex-1 py-2.5 rounded-full bg-accent text-white text-sm font-medium text-center hover:opacity-90 transition-opacity">
              Log In
            </Link>
            <Link href="/register" className="flex-1 py-2.5 rounded-full border border-subtle dark:border-gray-700 text-sm font-medium text-center hover:bg-brand-muted dark:hover:bg-gray-800 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
