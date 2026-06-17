'use client';

import { useEffect, useState } from 'react';
import { getSiteConfigLocalized } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { BookOpen, Users, Globe, Heart } from 'lucide-react';

export default function AboutPage() {
  const { lang } = useStore();
  const t = translations[lang].pages;
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSiteConfigLocalized('page_about', lang).then(data => { setConfig(data); setLoading(false); });
  }, [lang]);

  if (loading) return <div className="text-center py-16 text-gray-500">{t.loading}</div>;
  if (!config) return <div className="text-center py-16 text-gray-500">{t.pageNotConfigured}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-serif">{config.title}</h1>
        <p className="text-lg text-tx-soft">{config.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {config.mission && <InfoCard icon={<BookOpen className="h-6 w-6" />} title={t.ourMission} description={config.mission} />}
        {config.community && <InfoCard icon={<Users className="h-6 w-6" />} title={t.ourCommunity} description={config.community} />}
        {config.reach && <InfoCard icon={<Globe className="h-6 w-6" />} title={t.globalReach} description={config.reach} />}
        {config.values && <InfoCard icon={<Heart className="h-6 w-6" />} title={t.ourValues} description={config.values} />}
      </div>

      {config.story && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold font-serif">{t.ourStory}</h2>
          <div className="text-tx-soft space-y-4">
            {config.story.split('\n').filter((p: string) => p.trim()).map((p: string, i: number) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-border bg-bg-card space-y-3">
      <div className="p-3 rounded-full bg-bg-input text-accent w-fit">{icon}</div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm text-tx-soft">{description}</p>
    </div>
  );
}
