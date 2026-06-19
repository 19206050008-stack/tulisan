'use client';

import { useEffect, useState } from 'react';
import { getSiteConfigLocalized } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/i18n';

export default function TermsPage() {
  const { lang } = useStore();
  const t = translations[lang].pages;
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSiteConfigLocalized('page_terms', lang).then(d => { if (!cancelled) { setConfig(d); setLoading(false); } });
    return () => { cancelled = true; };
  }, [lang]);

  if (loading) return <div className="text-center py-16 text-gray-500">{t.loading}</div>;
  if (!config) return <div className="text-center py-16 text-gray-500">{t.pageNotConfigured}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold font-serif">{config.title}</h1>
      {config.updated && <p className="text-sm text-gray-500">{t.lastUpdated}: {config.updated}</p>}
      <div className="space-y-6">
        {config.sections?.map((s: any, i: number) => (
          <section key={i} className="space-y-3">
            <h2 className="text-xl font-bold text-tx">{s.heading}</h2>
            <p className="text-tx-soft">{s.content}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
