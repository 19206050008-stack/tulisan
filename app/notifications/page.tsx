'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getNotifications, markNotificationsRead, supabase } from '@/lib/supabase';
import { translations } from '@/lib/i18n';
import { Bell, Heart, MessageSquare, UserPlus, Reply, Check, Trash2, CheckCheck } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  like: Heart,
  comment: MessageSquare,
  follow: UserPlus,
  reply: Reply,
};

export default function NotificationsPage() {
  const { user, role, _hasHydrated, lang } = useStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const labels = lang === 'en' ? {
    title: 'Notifications',
    noNotifs: 'No notifications yet.',
    noNotifsDesc: 'When people interact with your stories, you will see it here.',
    markAllRead: 'Mark all read',
    all: 'All',
    unread: 'Unread',
    view: 'View',
    liked: 'liked your story',
    commented: 'commented on',
    followed: 'started following you',
    replied: 'replied to your comment on',
    interacted: 'interacted with your content',
    aStory: 'a story',
    justNow: 'just now',
    minAgo: 'm ago',
    hourAgo: 'h ago',
    dayAgo: 'd ago',
    delete: 'Delete',
  } : {
    title: 'Notifikasi',
    noNotifs: 'Belum ada notifikasi.',
    noNotifsDesc: 'Ketika orang berinteraksi dengan cerita Anda, Anda akan melihatnya di sini.',
    markAllRead: 'Tandai semua dibaca',
    all: 'Semua',
    unread: 'Belum dibaca',
    view: 'Lihat',
    liked: 'menyukai cerita Anda',
    commented: 'mengomentari',
    followed: 'mulai mengikuti Anda',
    replied: 'membalas komentar Anda di',
    interacted: 'berinteraksi dengan konten Anda',
    aStory: 'sebuah cerita',
    justNow: 'baru saja',
    minAgo: 'm lalu',
    hourAgo: 'j lalu',
    dayAgo: 'h lalu',
    delete: 'Hapus',
  };

  const loadNotifications = async () => {
    setLoading(true);
    const data = await getNotifications(user!.id);
    setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!_hasHydrated) return;
    if (role === 'guest') {
      router.push('/login');
      return;
    }
    if (user?.id) {
      loadNotifications();
    }
  }, [user, role, _hasHydrated]);

  const markOneRead = async (id: string) => {
    if (!supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await markNotificationsRead(user!.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    if (!supabase) return;
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationText = (n: any) => {
    const actor = n.actor?.full_name || n.actor?.username || 'Someone';
    const story = n.stories?.title || labels.aStory;
    switch (n.type) {
      case 'like': return `${actor} ${labels.liked} "${story}"`;
      case 'comment': return `${actor} ${labels.commented} "${story}"`;
      case 'follow': return `${actor} ${labels.followed}`;
      case 'reply': return `${actor} ${labels.replied} "${story}"`;
      default: return `${actor} ${labels.interacted}`;
    }
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 60) return labels.justNow;
    if (diff < 3600) return `${Math.floor(diff / 60)}${labels.minAgo}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${labels.hourAgo}`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}${labels.dayAgo}`;
    return then.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold font-serif flex items-center gap-2">
          <Bell className="h-6 w-6 md:h-7 md:w-7" /> {labels.title}
          {unreadCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-white font-bold">{unreadCount}</span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-tx-soft hover:text-accent transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-accent/30"
          >
            <CheckCheck className="h-3.5 w-3.5" /> {labels.markAllRead}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${filter === f ? 'bg-accent/10 text-accent' : 'text-tx-muted hover:bg-bg-soft'}`}
          >
            {f === 'all' ? labels.all : labels.unread}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Bell className="h-12 w-12 mx-auto text-tx-muted opacity-30" />
          <p className="text-tx-muted">{labels.noNotifs}</p>
          <p className="text-sm text-tx-muted opacity-60">{labels.noNotifsDesc}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const Icon = ICON_MAP[n.type] || Bell;
            return (
              <div key={n.id} className={`group flex items-start gap-3 p-4 rounded-xl border transition-colors ${n.read ? 'border-border bg-bg-card' : 'border-accent/30 bg-accent/5 dark:bg-accent/10 dark:border-accent/20'}`}>
                <div className={`p-2 rounded-full shrink-0 ${n.type === 'like' ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : n.type === 'follow' ? 'bg-blue-100 text-blue-500 dark:bg-blue-900/30' : 'bg-bg-input text-gray-500'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{getNotificationText(n)}</p>
                  <p className="text-xs text-tx-muted mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {n.stories && (
                    <Link href={`/story/${n.story_id}`} className="text-xs text-accent hover:underline px-2 py-1 rounded">
                      {labels.view}
                    </Link>
                  )}
                  {!n.read && (
                    <button
                      onClick={() => markOneRead(n.id)}
                      className="p-1.5 rounded text-tx-muted hover:text-accent hover:bg-accent/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="p-1.5 rounded text-tx-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                    title={labels.delete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
