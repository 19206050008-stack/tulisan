'use client';

import { useStore } from '@/lib/store';
import { useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const { darkMode } = useStore();

  // Sync class `dark` ke <html> setiap kali darkMode berubah
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return <>{children}</>;
}
