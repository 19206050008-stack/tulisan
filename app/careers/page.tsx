'use client';

import { useEffect, useState } from 'react';
import { getSiteConfigLocalized } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { Briefcase, MapPin, Clock, Inbox } from 'lucide-react';

export default function CareersPage() {
  const { lang } = useStore();
  const t = translations[lang].pages;
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSiteConfigLocalized('page_careers', lang).then(data => { if (!cancelled) { setConfig(data); setLoading(false); } });
    return () => { cancelled = true; };
  }, [lang]);

  if (loading) return <div className="text-center py-16 text-gray-500">{t.loading}</div>;
  if (!config) return <div className="text-center py-16 text-gray-500">{t.pageNotConfigured}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-serif">{config.title}</h1>
        <p className="text-lg text-tx-soft">{config.subtitle}</p>
      </div>

      {config.openings && config.openings.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-serif">{t.openPositions}</h2>
          <div className="space-y-3">
            {config.openings.map((job: any, i: number) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl border border-border bg-bg-card gap-3">
                <div>
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <p className="text-sm text-gray-500">{job.team}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.location}</span>
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {job.type}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="text-center py-12 space-y-4">
          <Inbox className="h-12 w-12 mx-auto text-tx-muted" />
          <h3 className="text-lg font-semibold text-tx-soft">{t.noOpenings}</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">{config.note}</p>
        </div>
      )}

      <section className="text-center p-8 rounded-xl bg-bg-input space-y-3">
        <Briefcase className="h-10 w-10 mx-auto text-accent" />
        <h3 className="text-lg font-bold">{t.interestedJoin}</h3>
        <p className="text-sm text-tx-soft">{t.sendCv}</p>
      </section>
    </div>
  );
}
