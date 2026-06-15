'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getNotifications, markNotificationsRead } from '@/lib/supabase';
import { Bell, Heart, MessageSquare, UserPlus, Reply } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  like: Heart,
  comment: MessageSquare,
  follow: UserPlus,
  reply: Reply,
};

export default function NotificationsPage() {
  const { user, role } = useStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'guest') {
      router.push('/login');
      return;
    }
    if (user?.id) {
      loadNotifications();
    }
  }, [user, role]);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await getNotifications(user.id);
    setNotifications(data);
    await markNotificationsRead(user.id);
    setLoading(false);
  };

  const getNotificationText = (n: any) => {
    const actor = n.actor?.full_name || n.actor?.username || 'Someone';
    switch (n.type) {
      case 'like': return `${actor} liked your story "${n.stories?.title || 'a story'}"`;
      case 'comment': return `${actor} commented on "${n.stories?.title || 'a story'}"`;
      case 'follow': return `${actor} started following you`;
      case 'reply': return `${actor} replied to your comment on "${n.stories?.title || 'a story'}"`;
      default: return `${actor} interacted with your content`;
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold font-serif flex items-center gap-2"><Bell className="h-7 w-7" /> Notifications</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Bell className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500">No notifications yet.</p>
          <p className="text-sm text-gray-400">When people interact with your stories, you will see it here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = ICON_MAP[n.type] || Bell;
            return (
              <div key={n.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${n.read ? 'border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800' : 'border-accent/30 bg-accent/5 dark:bg-accent/10 dark:border-accent/20'}`}>
                <div className={`p-2 rounded-full shrink-0 ${n.type === 'like' ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : n.type === 'follow' ? 'bg-blue-100 text-blue-500 dark:bg-blue-900/30' : 'bg-brand-muted dark:bg-gray-700 text-gray-500'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{getNotificationText(n)}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {n.stories && (
                  <Link href={`/story/${n.story_id}`} className="text-xs text-accent hover:underline shrink-0">View</Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
