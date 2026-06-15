'use client';

import { useEffect, useState } from 'react';
import { getSiteConfig } from '@/lib/supabase';
import { Briefcase, MapPin, Clock, Inbox } from 'lucide-react';

export default function CareersPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSiteConfig('page_careers').then(data => { setConfig(data); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;
  if (!config) return <div className="text-center py-16 text-gray-500">Page not configured.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-serif">{config.title}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">{config.subtitle}</p>
      </div>

      {config.openings && config.openings.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-serif">Posisi Terbuka</h2>
          <div className="space-y-3">
            {config.openings.map((job: any, i: number) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800 gap-3">
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
          <Inbox className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Belum Ada Lowongan</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">{config.note}</p>
        </div>
      )}

      <section className="text-center p-8 rounded-xl bg-brand-muted dark:bg-gray-800 space-y-3">
        <Briefcase className="h-10 w-10 mx-auto text-accent" />
        <h3 className="text-lg font-bold">Tertarik Bergabung?</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Kirim CV Anda ke careers@storyverse.app dan kami akan menghubungi Anda ketika ada posisi yang sesuai.</p>
      </section>
    </div>
  );
}
