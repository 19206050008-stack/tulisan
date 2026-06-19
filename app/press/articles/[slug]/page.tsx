'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getPressArticle } from '@/lib/supabase';
import { ArrowLeft, Calendar, Eye, Clock, Tag, Share2, Newspaper } from 'lucide-react';

export default function PressArticleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { lang } = useStore();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadArticle = async () => {
    setLoading(true);
    const data = await getPressArticle(slug);
    setArticle(data);
    setLoading(false);
  };

  useEffect(() => {
    if (slug) loadArticle();
  }, [slug]);

  const labels = lang === 'en' ? {
    backToPress: 'Back to Press',
    minRead: 'min read',
    views: 'views',
    published: 'Published',
    share: 'Share',
    notFound: 'Article not found.',
    relatedArticles: 'Related Articles',
  } : {
    backToPress: 'Kembali ke Pers',
    minRead: 'mnt baca',
    views: 'dilihat',
    published: 'Diterbitkan',
    share: 'Bagikan',
    notFound: 'Artikel tidak ditemukan.',
    relatedArticles: 'Artikel Terkait',
  };

  const categoryLabels: Record<string, string> = lang === 'en' ? {
    news: '📰 News', announcement: '📢 Announcement', tutorial: '📖 Tutorial',
    interview: '🎙️ Interview', review: '⭐ Review', feature: '✨ Feature',
  } : {
    news: '📰 Berita', announcement: '📢 Pengumuman', tutorial: '📖 Tutorial',
    interview: '🎙️ Wawancara', review: '⭐ Review', feature: '✨ Fitur',
  };

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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: article.title, url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      alert(lang === 'en' ? 'Link copied to clipboard!' : 'Link disalin ke clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-6 bg-bg-input rounded animate-pulse w-1/4" />
        <div className="h-10 bg-bg-input rounded animate-pulse w-3/4" />
        <div className="h-64 bg-bg-input rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-bg-input rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <Newspaper className="h-12 w-12 mx-auto text-tx-muted opacity-30 mb-4" />
        <p className="text-tx-muted text-lg">{labels.notFound}</p>
        <Link href="/press/articles" className="inline-block mt-4 text-accent hover:underline">
          {labels.backToPress}
        </Link>
      </div>
    );
  }

  const title = lang === 'en' ? (article.title_en || article.title) : article.title;
  const excerpt = lang === 'en' ? (article.excerpt_en || article.excerpt) : article.excerpt;
  const content = lang === 'en' ? (article.content_en || article.content) : article.content;
  const readTime = estimateReadTime(content);

  const renderContent = (blocks: any[]) => {
    if (!blocks || !Array.isArray(blocks)) return null;
    return blocks.map((block: any, i: number) => {
      switch (block.type) {
        case 'heading':
          return <h2 key={i} className="text-2xl font-bold font-serif mt-8 mb-4">{block.text}</h2>;
        case 'subheading':
          return <h3 key={i} className="text-xl font-semibold mt-6 mb-3">{block.text}</h3>;
        case 'paragraph':
          return <p key={i} className="text-tx-soft leading-relaxed mb-4">{block.text}</p>;
        case 'quote':
          return <blockquote key={i} className="border-l-4 border-accent pl-4 my-6 italic text-tx-soft">{block.text}</blockquote>;
        case 'image':
          return <img key={i} src={block.url} alt={block.alt || ''} className="w-full rounded-xl my-6" />;
        case 'list':
          return (
            <ul key={i} className="list-disc list-inside space-y-2 mb-4 text-tx-soft">
              {block.items?.map((item: string, j: number) => <li key={j}>{item}</li>)}
            </ul>
          );
        default:
          return <p key={i} className="text-tx-soft leading-relaxed mb-4">{block.text || JSON.stringify(block)}</p>;
      }
    });
  };

  return (
    <article className="max-w-3xl mx-auto space-y-8">
      {/* Back link */}
      <Link href="/press/articles" className="inline-flex items-center gap-1.5 text-sm text-tx-soft hover:text-accent transition-colors">
        <ArrowLeft className="h-4 w-4" /> {labels.backToPress}
      </Link>

      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-tx-muted">
          <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent font-medium">
            {categoryLabels[article.category] || article.category}
          </span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(article.published_at)}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {readTime} {labels.minRead}</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {article.views_count || 0} {labels.views}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold font-serif leading-tight">{title}</h1>

        {excerpt && <p className="text-lg text-tx-soft">{excerpt}</p>}

        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-tx-soft">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
              {(article.author_name || 'D')[0].toUpperCase()}
            </div>
            <span>{article.author_name || 'Di.tulis Editorial'}</span>
          </div>
          <button onClick={handleShare} className="flex items-center gap-1.5 text-xs text-tx-soft hover:text-accent transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-accent/30">
            <Share2 className="h-3.5 w-3.5" /> {labels.share}
          </button>
        </div>
      </header>

      {/* Cover image */}
      {article.cover_url && (
        <div className="rounded-xl overflow-hidden">
          <img src={article.cover_url} alt={title} className="w-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="prose-custom space-y-0">
        {renderContent(content)}
      </div>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-6 border-t border-border">
          {article.tags.map((tag: string) => (
            <span key={tag} className="text-xs px-3 py-1 rounded-full bg-bg-input text-tx-soft flex items-center gap-1">
              <Tag className="h-3 w-3" /> {tag}
            </span>
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="pt-4">
        <Link href="/press/articles" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> {labels.backToPress}
        </Link>
      </div>
    </article>
  );
}
