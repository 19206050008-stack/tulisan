'use client';

import { ThemeProvider } from 'next-themes';

/**
 * next-themes handles semua dark mode:
 * - Menyimpan preference ke localStorage (key: 'theme')
 * - Apply class 'dark' ke <html>
 * - No flash berkat script inline di <head>
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange={false}
      storageKey="sv-theme"
    >
      {children}
    </ThemeProvider>
  );
}
