'use client';

import { useEffect, useState } from 'react';
import { getSiteConfig, supabase } from '@/lib/supabase';
import { Users, BookOpen, MessageSquare, TrendingUp, Shield } from 'lucide-react';

export default function CommunityPage() {
  const [config, setConfig] = useState<any>(null);
  const [stats, setStats] = useState({ writers: 0, stories: 0, comments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await getSiteConfig('page_community');
    setConfig(data);
    if (supabase) {
      const [usersRes, storiesRes, commentsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('comments').select('*', { count: 'exact', head: true })
      ]);
      setStats({
        writers: usersRes.count || 0,
        stories: storiesRes.count || 0,
        comments: commentsRes.count || 0
      });
    }
    setLoading(false);
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;
  if (!config) return <div className="text-center py-16 text-gray-500">Page not configured.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold font-serif">{config.title}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{config.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Penulis Aktif" value={stats.writers} />
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Cerita Diterbitkan" value={stats.stories} />
        <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Komentar" value={stats.comments} />
      </div>

      {config.guidelines && config.guidelines.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-serif flex items-center gap-2"><Shield className="h-5 w-5 text-accent" /> Pedoman Komunitas</h2>
          <div className="p-5 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
            <ul className="space-y-3">
              {config.guidelines.map((g: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {config.featured_topics && config.featured_topics.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-serif flex items-center gap-2"><TrendingUp className="h-5 w-5 text-accent" /> Topik Diskusi</h2>
          <div className="space-y-3">
            {config.featured_topics.map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
                <div>
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.category}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 p-5 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
      <div className="p-2.5 rounded-full bg-brand-muted dark:bg-gray-700 text-accent">{icon}</div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
