'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { LayoutDashboard, Users, BookOpen, MessageSquare, Sliders, Image, Tag, Flag, Settings, Globe, FileText, Megaphone, Newspaper, Shield, Sparkles, Menu, X, Headphones } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/stories', label: 'Stories', icon: BookOpen },
  { href: '/admin/audio-cerita', label: 'Audio Cerita', icon: Headphones },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { href: '/admin/moderation', label: 'Moderation', icon: Shield },
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
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    if (_hasHydrated && role !== 'admin') {
      router.push('/');
    }
  }, [role, _hasHydrated]);

  useEffect(() => {
    setShowSidebar(false);
  }, [pathname]);

  if (!_hasHydrated || role !== 'admin') return null;

  return (
    <div className="flex gap-0 lg:gap-6 -my-8 -mx-4">
      {/* Mobile overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        fixed lg:relative z-50 lg:z-auto
        w-64 lg:w-56 shrink-0
        border-r border-border bg-bg-card lg:bg-transparent
        py-6 px-4 lg:px-0 lg:pr-4
        space-y-1 min-h-[calc(100vh-4rem)] h-full lg:h-auto
        transition-transform duration-200
      `}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 px-3">Admin Panel</p>
          <button onClick={() => setShowSidebar(false)} className="p-1.5 rounded-lg hover:bg-bg-soft lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>
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

      {/* Main content */}
      <main className="flex-1 py-6 min-w-0 px-4 lg:px-0">
        {/* Mobile header with hamburger */}
        <div className="flex items-center gap-3 mb-4 lg:hidden">
          <button onClick={() => setShowSidebar(true)} className="p-2 rounded-lg border border-border hover:bg-bg-soft transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-tx-muted">
            {NAV_ITEMS.find(i => i.href === pathname)?.label || 'Admin'}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
