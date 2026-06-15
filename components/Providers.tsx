'use client';

import { useStore } from '@/lib/store';
import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const { darkMode } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small timeout to let mount cycle finish
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode, mounted]);

  if (!mounted) return <>{children}</>;

  return <>{children}</>;
}
