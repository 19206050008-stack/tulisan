'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSiteConfigLocalized, getPressArticles } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { Newspaper, Mail, Calendar, ArrowRight } from 'lucide-react';

export default function PressPage() {
  const { lang } = useStore();
  const t = translations[lang].pages;
  const [config, setConfig] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getSiteConfigLocalized('page_press', lang),
      getPressArticles(true),
    ]).then(([cfg, arts]) => {
      if (!cancelled) {
        setConfig(cfg);
        setArticles(arts);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [lang]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (loading) return <div className="text-center py-16 text-gray-500">{t.loading}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-serif">{config?.title || (lang === 'en' ? 'Press' : 'Pers')}</h1>
        <p className="text-lg text-tx-soft">{config?.subtitle || ''}</p>
      </div>

      {articles.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-serif">{t.latestNews}</h2>
          <div className="space-y-3">
            {articles.map((article) => {
              const title = lang === 'en' ? (article.title_en || article.title) : article.title;
              const excerpt = lang === 'en' ? (article.excerpt_en || article.excerpt) : article.excerpt;

              return (
                <Link
                  key={article.id}
                  href={`/press/articles/${article.slug}`}
                  className="group flex items-start gap-4 p-5 rounded-xl border border-border bg-bg-card hover:border-accent/30 hover:shadow-md transition-all"
                >
                  {article.cover_url ? (
                    <img
                      src={article.cover_url}
                      alt={title}
                      className="h-16 w-20 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <Newspaper className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold group-hover:text-accent transition-colors">{title}</p>
                    {excerpt && (
                      <p className="text-sm text-tx-soft mt-1 line-clamp-2">{excerpt}</p>
                    )}
                    <p className="text-xs text-tx-muted mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(article.published_at)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-tx-muted shrink-0 mt-1 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                </Link>
              );
            })}
          </div>
          <div className="text-center pt-2">
            <Link href="/press/articles" className="text-sm text-accent hover:underline">
              {lang === 'en' ? 'View all articles →' : 'Lihat semua artikel →'}
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {config?.media_kit_note && (
          <div className="p-6 rounded-xl border border-border bg-bg-card space-y-3">
            <Newspaper className="h-6 w-6 text-accent" />
            <h3 className="font-bold">{t.mediaKit}</h3>
            <p className="text-sm text-tx-soft">{config.media_kit_note}</p>
          </div>
        )}
        {config?.media_email && (
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
