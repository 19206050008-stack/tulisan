'use client';

import { useEffect, useState } from 'react';
import { getSiteConfigLocalized } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { Newspaper, Mail } from 'lucide-react';

export default function PressPage() {
  const { lang } = useStore();
  const t = translations[lang].pages;
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSiteConfigLocalized('page_press', lang).then(data => { setConfig(data); setLoading(false); });
  }, [lang]);

  if (loading) return <div className="text-center py-16 text-gray-500">{t.loading}</div>;
  if (!config) return <div className="text-center py-16 text-gray-500">{t.pageNotConfigured}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-serif">{config.title}</h1>
        <p className="text-lg text-tx-soft">{config.subtitle}</p>
      </div>

      {config.releases && config.releases.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-serif">{t.latestNews}</h2>
          <div className="space-y-3">
            {config.releases.map((pr: any, i: number) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl border border-border bg-bg-card">
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
          <div className="p-6 rounded-xl border border-border bg-bg-card space-y-3">
            <Newspaper className="h-6 w-6 text-accent" />
            <h3 className="font-bold">{t.mediaKit}</h3>
            <p className="text-sm text-tx-soft">{config.media_kit_note}</p>
          </div>
        )}
        {config.media_email && (
          <div className="p-6 rounded-xl border border-border bg-bg-card space-y-3">
            <Mail className="h-6 w-6 text-accent" />
            <h3 className="font-bold">{t.mediaInquiries}</h3>
            <p className="text-sm text-tx-soft">{config.media_email}</p>
          </div>
        )}
      </section>
    </div>
  );
}
