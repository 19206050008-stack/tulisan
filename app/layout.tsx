import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import dynamic from 'next/dynamic';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Providers } from '@/components/Providers';
import { AuthProvider } from '@/components/AuthProvider';

// Lazy load AdPopup - code splitting via dynamic import
const AdPopup = dynamic(
  () => import('@/components/AdPopup').then(m => ({ default: m.AdPopup })),
  { loading: () => null }
);

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Di.tulis - Read & Write Stories',
  description: 'User-generated stories platform with reading interface and author tools.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning wajib karena next-themes update class di <html> client-side
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans min-h-screen transition-colors duration-150">
        <Providers>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1 container mx-auto px-4 py-8">
                {children}
              </main>
              <Footer />
            </div>
            <AdPopup />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
