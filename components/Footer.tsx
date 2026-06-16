'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/i18n';

export function Footer() {
  const { lang } = useStore();
  const t = translations[lang].footer;
  const nav = translations[lang].nav;
  
  return (
    <footer className="w-full border-t border-subtle dark:border-gray-800 bg-brand-bg dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 flex flex-col items-center gap-6">
        <div className="flex items-center gap-4" aria-label="Social media links">
          <SocialLink href="https://instagram.com" label="Instagram">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
          </SocialLink>
          <SocialLink href="https://tiktok.com" label="TikTok">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
          </SocialLink>
          <SocialLink href="https://twitter.com" label="Twitter">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
          </SocialLink>
          <SocialLink href="https://youtube.com" label="YouTube">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
          </SocialLink>
          <SocialLink href="https://facebook.com" label="Facebook">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </SocialLink>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" aria-label="Di.tulis links">
          <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-accent transition-colors">{nav.home}</Link>
          <Link href="/browse" className="text-gray-600 dark:text-gray-400 hover:text-accent transition-colors">{nav.browse}</Link>
          <Link href="/community" className="text-gray-600 dark:text-gray-400 hover:text-accent transition-colors">{nav.community}</Link>
          <Link href="/write" className="text-gray-600 dark:text-gray-400 hover:text-accent transition-colors">{nav.write}</Link>
          <span className="hidden sm:inline text-gray-300 dark:text-gray-700" aria-hidden="true">|</span>
          <Link href="/about" className="text-gray-600 dark:text-gray-400 hover:text-accent transition-colors">{t.about}</Link>
          <Link href="/careers" className="text-gray-600 dark:text-gray-400 hover:text-accent transition-colors">{t.careers}</Link>
          <Link href="/press" className="text-gray-600 dark:text-gray-400 hover:text-accent transition-colors">{t.press}</Link>
        </nav>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" aria-label="Legal links">
          <Link href="/terms" className="text-gray-500 dark:text-gray-500 hover:text-accent transition-colors">{t.terms}</Link>
          <Link href="/privacy" className="text-gray-500 dark:text-gray-500 hover:text-accent transition-colors">{t.privacy}</Link>
          <Link href="/accessibility" className="text-gray-500 dark:text-gray-500 hover:text-accent transition-colors">Accessibility</Link>
          <Link href="/help" className="text-gray-500 dark:text-gray-500 hover:text-accent transition-colors">{t.help}</Link>
        </nav>

        <p className="text-xs text-gray-400 dark:text-gray-600">
          &copy; {new Date().getFullYear()} <span className="text-accent">Di.</span><span>tulis</span>
        </p>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow noreferrer"
      aria-label={label}
      className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-accent hover:bg-brand-muted dark:hover:bg-gray-800 transition-colors"
    >
      {children}
    </a>
  );
}
