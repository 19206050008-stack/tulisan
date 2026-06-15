'use client';

import { useEffect, useState } from 'react';
import { getSiteConfig } from '@/lib/supabase';
import { Newspaper, Mail } from 'lucide-react';

export default function PressPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSiteConfig('page_press').then(data => { setConfig(data); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;
  if (!config) return <div className="text-center py-16 text-gray-500">Page not configured.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-serif">{config.title}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">{config.subtitle}</p>
      </div>

      {config.releases && config.releases.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-serif">Berita Terbaru</h2>
          <div className="space-y-3">
            {config.releases.map((pr: any, i: number) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
                <Newspaper className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{pr.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{pr.date}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {config.media_kit_note && (
          <div className="p-6 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800 space-y-3">
            <Newspaper className="h-6 w-6 text-accent" />
            <h3 className="font-bold">Media Kit</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{config.media_kit_note}</p>
          </div>
        )}
        {config.media_email && (
          <div className="p-6 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800 space-y-3">
            <Mail className="h-6 w-6 text-accent" />
            <h3 className="font-bold">Media Inquiries</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{config.media_email}</p>
          </div>
        )}
      </section>
    </div>
  );
}
