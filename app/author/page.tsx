'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { getMyStories, getChapters, supabase } from '@/lib/supabase';
import { PenTool, Plus, MessageSquare, Eye, Heart, BookOpen, TrendingUp, Edit, Trash2, BarChart3, Settings2 } from 'lucide-react';

export default function AuthorDashboard() {
  const { user, role, _hasHydrated, lang } = useStore();
  const t = translations[lang].myStories;

  const [stories, setStories] = useState<any[]>([]);
  const [stats, setStats] = useState({ reads: 0, likes: 0, comments: 0, stories: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({});

  const labels = lang === 'en' ? {
    title: 'Author Studio',
    subtitle: 'Manage your stories, view analytics, and engage with your readers.',
    newStory: 'New Story',
    totalReads: 'Total Reads',
    totalLikes: 'Total Likes',
    totalComments: 'Total Comments',
    totalStories: 'Total Stories',
    yourWorks: 'Your Works',
    all: 'All',
    published: 'Published',
    drafts: 'Drafts',
    parts: 'chapters',
    reads: 'reads',
    noStories: 'You haven\'t created any stories yet.',
    startWriting: 'Start Writing',
    edit: 'Edit',
  } : {
    title: 'Studio Penulis',
    subtitle: 'Kelola cerita, lihat analitik, dan berinteraksi dengan pembaca.',
    newStory: 'Cerita Baru',
    totalReads: 'Total Dibaca',
    totalLikes: 'Total Suka',
    totalComments: 'Total Komentar',
    totalStories: 'Total Cerita',
    yourWorks: 'Karya Anda',
    all: 'Semua',
    published: 'Diterbitkan',
    drafts: 'Draf',
    parts: 'bab',
    reads: 'dibaca',
    noStories: 'Anda belum membuat cerita.',
    startWriting: 'Mulai Menulis',
    edit: 'Edit',
  };

  useEffect(() => {
    if (_hasHydrated && user?.id) {
      loadDashboard();
    }
  }, [_hasHydrated, user]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Get all stories by this author
      const myStories = await getMyStories(user.id);
      setStories(myStories);

      // Calculate stats
      let totalReads = 0;
      let totalLikes = 0;
      for (const s of myStories) {
        totalReads += s.reads_count || 0;
        totalLikes += s.likes_count || 0;
      }

      // Get comment count for author's stories
      let totalComments = 0;
      if (supabase && myStories.length > 0) {
        const storyIds = myStories.map(s => s.id);
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .in('story_id', storyIds);
        totalComments = count || 0;

        // Get chapter counts
        const { data: chapters } = await supabase
          .from('chapters')
          .select('story_id')
          .in('story_id', storyIds);
        const counts: Record<string, number> = {};
        chapters?.forEach(c => {
          counts[c.story_id] = (counts[c.story_id] || 0) + 1;
        });
        setChapterCounts(counts);
      }

      setStats({
        reads: totalReads,
        likes: totalLikes,
        comments: totalComments,
        stories: myStories.length
      });
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    }
    setLoading(false);
  };

  if (!_hasHydrated || loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-bg-input rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-bg-input rounded-xl" />)}
          </div>
          <div className="h-64 bg-bg-input rounded-xl" />
        </div>
      </div>
    );
  }

  if (role === 'guest') {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">{lang === 'en' ? 'Access Denied' : 'Akses Ditolak'}</h1>
        <p className="text-gray-500 text-sm">{lang === 'en' ? 'You must be logged in to view this page.' : 'Anda harus masuk untuk melihat halaman ini.'}</p>
      </div>
    );
  }

  const filteredStories = filter === 'all' ? stories : stories.filter(s => s.status === filter);
  const publishedCount = stories.filter(s => s.status === 'published').length;
  const draftCount = stories.filter(s => s.status === 'draft').length;

  const formatCount = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">{labels.title}</h1>
          <p className="text-tx-soft mt-1">{labels.subtitle}</p>
        </div>
        <Link
          href="/write"
          className="px-4 py-2 bg-accent text-white hover:opacity-90 rounded-lg font-medium flex items-center gap-2 transition"
        >
          <Plus className="h-5 w-5" /> {labels.newStory}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title={labels.totalStories} value={stats.stories} icon={<BookOpen className="h-5 w-5 text-purple-500" />} color="purple" />
        <StatCard title={labels.totalReads} value={formatCount(stats.reads)} icon={<Eye className="h-5 w-5 text-blue-500" />} color="blue" />
        <StatCard title={labels.totalLikes} value={formatCount(stats.likes)} icon={<Heart className="h-5 w-5 text-red-500" />} color="red" />
        <StatCard title={labels.totalComments} value={formatCount(stats.comments)} icon={<MessageSquare className="h-5 w-5 text-green-500" />} color="green" />
      </div>

      {/* Stories */}
      <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex justify-between items-center">
          <h2 className="font-bold text-lg font-serif">{labels.yourWorks}</h2>
          <div className="flex gap-1">
            {(['all', 'published', 'draft'] as const).map(f => {
              const count = f === 'all' ? stories.length : f === 'published' ? publishedCount : draftCount;
              const isActive = filter === f;
              const lbl = f === 'all' ? labels.all : f === 'published' ? labels.published : labels.drafts;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded transition-colors ${
                    isActive ? 'bg-accent/10 text-accent' : 'text-gray-400 hover:text-tx hover:bg-bg-soft'
                  }`}
                >
                  {lbl} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {filteredStories.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <BookOpen className="h-12 w-12 mx-auto text-tx-muted opacity-30" />
            <p className="text-tx-muted text-sm">{labels.noStories}</p>
            <Link
              href="/write"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" /> {labels.startWriting}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredStories.map(story => (
              <div key={story.id} className="px-6 py-4 flex items-center justify-between hover:bg-bg-soft/50 transition group">
                <div className="flex items-center gap-4 min-w-0">
                  <Link href={`/story/${story.id}`} className="shrink-0">
                    {story.cover_url ? (
                      <img src={story.cover_url} alt="" className="h-16 w-12 object-cover rounded" />
                    ) : (
                      <div className="h-16 w-12 bg-bg-input rounded flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-tx-muted" />
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/story/${story.id}`} className="font-semibold hover:text-accent transition-colors line-clamp-1">{story.title}</Link>
                    <div className="flex flex-wrap gap-2 text-xs text-tx-muted mt-1.5">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${story.status === 'published' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'}`}>
                        {story.status === 'published' ? labels.published : labels.drafts}
                      </span>
                      <span>{chapterCounts[story.id] || 0} {labels.parts}</span>
                      {story.status === 'published' && (
                        <>
                          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatCount(story.reads_count || 0)}</span>
                          <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatCount(story.likes_count || 0)}</span>
                        </>
                      )}
                      {story.category && <span className="px-1.5 py-0.5 rounded bg-bg-input">{story.category}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Link href={`/write/${story.id}`} className="p-2 text-tx-muted hover:text-accent rounded hover:bg-bg-soft transition-colors" title={labels.edit}>
                    <PenTool className="h-4 w-4" />
                  </Link>
                  <Link href={`/story/${story.id}`} className="p-2 text-tx-muted hover:text-tx rounded hover:bg-bg-soft transition-colors" title="View">
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  const bgMap: Record<string, string> = {
    purple: 'bg-purple-100 dark:bg-purple-900/30',
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    red: 'bg-red-100 dark:bg-red-900/30',
    green: 'bg-green-100 dark:bg-green-900/30',
  };
  return (
    <div className="bg-bg-card p-5 rounded-xl border border-border">
      <div className="flex justify-between items-start mb-3">
        <p className="text-[10px] uppercase tracking-widest font-bold text-tx-muted">{title}</p>
        <div className={`p-2 rounded-lg ${bgMap[color] || 'bg-bg-input'}`}>{icon}</div>
      </div>
      <h3 className="text-2xl font-bold font-serif">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
    </div>
  );
}
