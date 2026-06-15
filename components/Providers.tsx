'use client';

import { useStore } from '@/lib/store';
import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const { darkMode, setDarkMode } = useStore();
  const [mounted, setMounted] = useState(false);

  // Baca preferensi dari localStorage saat pertama mount
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      setDarkMode(saved === 'true');
    } else {
      // Ikuti preferensi sistem
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
    setMounted(true);
  }, []);

  // Sync class `dark` ke <html> dan simpan ke localStorage setiap kali berubah
  useEffect(() => {
    if (!mounted) return;
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode, mounted]);

  return <>{children}</>;
}
