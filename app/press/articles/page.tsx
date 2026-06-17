'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getPressArticles } from '@/lib/supabase';
import { translations } from '@/lib/i18n';
import { Newspaper, Calendar, Eye, ArrowRight, Tag } from 'lucide-react';

export default function PressArticlesPage() {
  const { lang } = useStore();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const labels = lang === 'en' ? {
    title: 'Press & Articles',
    subtitle: 'News, tutorials, and stories from the Di.tulis community.',
    allCategories: 'All',
    readMore: 'Read More',
    minRead: 'min read',
    noArticles: 'No articles published yet.',
    views: 'views',
  } : {
    title: 'Pers & Artikel',
    subtitle: 'Berita, tutorial, dan cerita dari komunitas Di.tulis.',
    allCategories: 'Semua',
    readMore: 'Baca Selengkapnya',
    minRead: 'mnt baca',
    noArticles: 'Belum ada artikel yang diterbitkan.',
    views: 'dilihat',
  };

  const categoryLabels: Record<string, string> = lang === 'en' ? {
    news: '📰 News', announcement: '📢 Announcement', tutorial: '📖 Tutorial',
    interview: '🎙️ Interview', review: '⭐ Review', feature: '✨ Feature',
  } : {
    news: '📰 Berita', announcement: '📢 Pengumuman', tutorial: '📖 Tutorial',
    interview: '🎙️ Wawancara', review: '⭐ Review', feature: '✨ Fitur',
  };

  const categories = ['all', 'news', 'announcement', 'tutorial', 'interview', 'review', 'feature'];

  useEffect(() => { loadArticles(); }, []);

  const loadArticles = async () => {
    setLoading(true);
    const data = await getPressArticles(true);
    setArticles(data);
    setLoading(false);
  };

  const filtered = categoryFilter === 'all' ? articles : articles.filter(a => a.category === categoryFilter);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const estimateReadTime = (content: any[]) => {
    if (!content || !Array.isArray(content)) return 1;
    const text = content.map((c: any) => c.text || '').join(' ');
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-12 bg-bg-input rounded animate-pulse w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-bg-input rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold font-serif flex items-center justify-center gap-3">
          <Newspaper className="h-8 w-8 text-accent" /> {labels.title}
        </h1>
        <p className="text-tx-soft text-lg">{labels.subtitle}</p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categoryFilter === cat ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft hover:bg-bg-soft'
            }`}
          >
            {cat === 'all' ? labels.allCategories : (categoryLabels[cat] || cat)}
          </button>
        ))}
      </div>

      {/* Articles grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Newspaper className="h-12 w-12 mx-auto text-tx-muted opacity-30 mb-4" />
          <p className="text-tx-muted">{labels.noArticles}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((article, i) => {
            const isFeatured = i === 0 && categoryFilter === 'all';
            const readTime = estimateReadTime(lang === 'en' ? article.content_en : article.content);
            const title = lang === 'en' ? (article.title_en || article.title) : article.title;
            const excerpt = lang === 'en' ? (article.excerpt_en || article.excerpt) : article.excerpt;

            return (
              <Link
                key={article.id}
                href={`/press/articles/${article.slug}`}
                className={`group rounded-xl border border-border bg-bg-card overflow-hidden hover:border-accent/30 hover:shadow-lg transition-all ${
                  isFeatured ? 'md:col-span-2' : ''
                }`}
              >
                {article.cover_url && (
                  <div className={`overflow-hidden ${isFeatured ? 'h-48 md:h-64' : 'h-40'}`}>
                    <img
                      src={article.cover_url}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className={`p-5 space-y-3 ${isFeatured && !article.cover_url ? 'md:p-8' : ''}`}>
                  <div className="flex items-center gap-2 text-[10px] text-tx-muted">
                    <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                      {categoryLabels[article.category] || article.category}
                    </span>
                    <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" /> {formatDate(article.published_at)}</span>
                    <span>{readTime} {labels.minRead}</span>
                  </div>
                  <h2 className={`font-bold font-serif group-hover:text-accent transition-colors ${isFeatured ? 'text-xl md:text-2xl' : 'text-lg'}`}>
                    {title}
                  </h2>
                  {excerpt && (
                    <p className={`text-tx-soft line-clamp-${isFeatured ? '3' : '2'}`}>{excerpt}</p>
                  )}
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {article.tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-bg-input text-tx-muted flex items-center gap-0.5">
                          <Tag className="h-2.5 w-2.5" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3 text-[11px] text-tx-muted">
                      <span>{article.author_name || 'Di.tulis Editorial'}</span>
                      <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {article.views_count || 0}</span>
                    </div>
                    <span className="text-xs text-accent font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      {labels.readMore} <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
