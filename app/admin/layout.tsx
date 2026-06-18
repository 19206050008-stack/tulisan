'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { LayoutDashboard, Users, BookOpen, MessageSquare, Sliders, Image, Tag, Flag, Settings, Globe, FileText, Megaphone, Newspaper, Sparkles } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/stories', label: 'Stories', icon: BookOpen },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { href: '/admin/slider', label: 'Hero Slider', icon: Image },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/pages', label: 'Pages', icon: FileText },
  { href: '/admin/ads', label: 'Advertisements', icon: Megaphone },
  { href: '/admin/press', label: 'Press Articles', icon: Newspaper },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/nana', label: 'Nana AI', icon: Sparkles },
  { href: '/admin/api', label: 'Public API', icon: Globe },
  { href: '/admin/settings', label: 'Site Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, _hasHydrated } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (_hasHydrated && role !== 'admin') {
      router.push('/');
    }
  }, [role, _hasHydrated]);

  if (!_hasHydrated || role !== 'admin') return null;

  return (
    <div className="flex gap-6 -my-8 -mx-4">
      <aside className="w-56 shrink-0 border-r border-border py-6 pr-4 space-y-1 min-h-[calc(100vh-4rem)]">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 px-3 mb-3">Admin Panel</p>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-accent/10 text-accent' : 'text-tx-soft hover:bg-bg-soft'}`}>
              <Icon className="h-4 w-4" /> {item.label}
            </Link>
          );
        })}
      </aside>
      <main className="flex-1 py-6 min-w-0">
        {children}
      </main>
    </div>
  );
}
