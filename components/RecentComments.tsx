'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRecentComments, getProfileFrames } from '@/lib/supabase';
import { MessageSquare } from 'lucide-react';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/i18n';

export function RecentComments() {
  const { lang } = useStore();
  const t = translations[lang].home;
  
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [frameMap, setFrameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadComments();
    getProfileFrames().then((frames: any[]) => {
      const map: Record<string, string> = {};
      frames.forEach((f: any) => { if (f.id && f.svg_data) map[f.id] = f.svg_data; });
      setFrameMap(map);
    });
  }, []);

  const loadComments = async () => {
    const data = await getRecentComments(5);
    setComments(data);
    setLoading(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    
    if (lang === 'id') {
      if (mins < 1) return 'baru saja';
      if (mins < 60) return `${mins}m yang lalu`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}j yang lalu`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}h yang lalu`;
      return date.toLocaleDateString('id', { month: 'short', day: 'numeric' });
    } else {
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-bg-input rounded-xl" />)}</div>;
  }

  if (comments.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold font-serif flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-accent" /> {t.recentComments}
      </h2>
      <div className="space-y-3">
        {comments.map(c => (
          <Link href={`/story/${c.stories?.id || c.story_id}`} key={c.id} className="flex gap-3 p-3 rounded-xl border border-border bg-bg-card hover:border-accent/30 transition-colors group">
            <div className="relative w-8 h-8 shrink-0">
              {c.profiles?.frame_id && frameMap[c.profiles.frame_id] && (
                <div className="absolute inset-[-3px] w-[38px] h-[38px] z-10 pointer-events-none" dangerouslySetInnerHTML={{ __html: frameMap[c.profiles.frame_id].replace('<svg', '<svg width="100%" height="100%"') }} />
              )}
              {c.profiles?.avatar_url ? (
                <img src={c.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-bg-input flex items-center justify-center text-xs font-bold text-gray-400">
                  {(c.profiles?.full_name || c.profiles?.username || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-1 text-tx">{c.content}</p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-medium text-tx-soft">{c.profiles?.full_name || c.profiles?.username}</span>
                {c.stories?.title && <> on <span className="text-accent group-hover:underline">{c.stories.title}</span></>}
                <span className="ml-2">{formatTime(c.created_at)}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
