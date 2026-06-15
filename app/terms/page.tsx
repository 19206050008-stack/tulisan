'use client';

import { useEffect, useState } from 'react';
import { getSiteConfig } from '@/lib/supabase';

export default function TermsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getSiteConfig('page_terms').then(d => { setConfig(d); setLoading(false); }); }, []);

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;
  if (!config) return <div className="text-center py-16 text-gray-500">Page not configured.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold font-serif">{config.title}</h1>
      {config.updated && <p className="text-sm text-gray-500">Terakhir diperbarui: {config.updated}</p>}
      <div className="space-y-6">
        {config.sections?.map((s: any, i: number) => (
          <section key={i} className="space-y-3">
            <h2 className="text-xl font-bold text-brand-text dark:text-gray-100">{s.heading}</h2>
            <p className="text-gray-600 dark:text-gray-400">{s.content}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
