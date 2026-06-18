'use client';

import { useEffect, useState } from 'react';
import { getFrontendStats } from '@/lib/supabase';
import { Users, BookOpen, MessageSquare, Eye, TrendingUp, Layers, Image, PenTool, FileText, Megaphone } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({
    users: 0, stories: 0, comments: 0, reads: 0, totalReads: 0,
    publishedStories: 0, draftStories: 0, archivedStories: 0,
    storyCategories: 0, featuredSlides: 0, forumThreads: 0, pressArticles: 0, ads: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    const data = await getFrontendStats();
    setStats(data);
    setLoading(false);
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif">Dashboard</h1>
        <button onClick={loadStats} className="p-2 rounded-lg hover:bg-bg-soft transition-colors" title="Refresh stats">
          <TrendingUp className="h-4 w-4" />
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Users" value={stats.users} color="text-blue-500 bg-blue-100 dark:bg-blue-900/30" />
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Total Stories" value={stats.stories} color="text-green-500 bg-green-100 dark:bg-green-900/30" />
        <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Total Comments" value={stats.comments} color="text-purple-500 bg-purple-100 dark:bg-purple-900/30" />
        <StatCard icon={<Eye className="h-5 w-5" />} label="Total Reads" value={stats.totalReads} color="text-orange-500 bg-orange-100 dark:bg-orange-900/30" />
      </div>

      {/* Stories Breakdown */}
      <section className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
        <h2 className="text-lg font-bold font-serif flex items-center gap-2"><BookOpen className="h-4 w-4" /> Story Statistics</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatSmall label="Published" value={stats.publishedStories} color="text-green-500 bg-green-100 dark:bg-green-900/30" />
          <StatSmall label="Drafts" value={stats.draftStories} color="text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30" />
          <StatSmall label="Archived" value={stats.archivedStories} color="text-red-500 bg-red-100 dark:bg-red-900/30" />
        </div>
      </section>

      {/* Frontend Features Monitoring */}
      <section className="rounded-xl border border-border bg-bg-card p-5">
        <h2 className="text-lg font-bold font-serif mb-4">Frontend Features</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <FeatureItem icon={<Layers className="h-4 w-4" />} label="Story Categories" value={stats.storyCategories} />
          <FeatureItem icon={<Image className="h-4 w-4" />} label="Hero Sliders" value={stats.featuredSlides} />
          <FeatureItem icon={<PenTool className="h-4 w-4" />} label="Forum Threads" value={stats.forumThreads} />
          <FeatureItem icon={<FileText className="h-4 w-4" />} label="Press Articles" value={stats.pressArticles} />
          <FeatureItem icon={<Megaphone className="h-4 w-4" />} label="Ads Active" value={stats.ads} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="p-5 rounded-xl border border-border bg-bg-card">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <p className="text-2xl font-bold mt-3">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function StatSmall({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-bg-card">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color.replace('bg-', 'text-').replace('/30', '')}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function FeatureItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-bg-card hover:border-accent/30 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-500">{icon}</span>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
