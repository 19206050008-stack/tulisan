'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { supabase, signOut } from '@/lib/supabase';
import { Moon, Sun, Bell, Search, UserCircle, PenTool, LayoutDashboard, LogIn, LogOut, BookOpen, List, Globe } from 'lucide-react';
import { useState } from 'react';
import { translations } from '@/lib/i18n';

export function Navbar() {
  const router = useRouter();
  const { darkMode, setDarkMode, role, user, logout, lang, setLang } = useStore();
  const [showMenu, setShowMenu] = useState(false);
  
  const t = translations[lang].nav;

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {}
    logout();
    setShowMenu(false);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-subtle bg-brand-bg/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-brand-bg/60 dark:border-gray-800">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center font-serif text-2xl font-bold italic tracking-tighter hover:opacity-80 transition-opacity">
            <span className="text-accent">Di.</span><span className="text-brand-text dark:text-white">tulis</span>
          </Link>
          
          <div className="hidden md:flex relative group">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder={t.search} 
              className="pl-9 pr-4 py-2 bg-brand-muted dark:bg-gray-800 rounded-full text-sm focus:outline-none border border-transparent focus:border-accent w-64 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          
          <button 
            onClick={() => setLang(lang === 'id' ? 'en' : 'id')} 
            className="flex items-center gap-1 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300"
            title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          >
            <Globe className="h-5 w-5" />
            <span className="hidden sm:inline uppercase">{lang}</span>
          </button>
          
          {role !== 'guest' && (
            <Link href="/notifications" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Bell className="h-5 w-5" />
            </Link>
          )}

          {role === 'guest' ? (
            <div className="hidden md:flex items-center gap-2 ml-2">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-accent transition-colors">
                {t.login}
              </Link>
              <Link href="/register" className="px-4 py-2 rounded-full bg-brand-text text-white dark:bg-white dark:text-brand-text text-sm font-medium hover:opacity-90 transition-opacity">
                {t.register}
              </Link>
            </div>
          ) : (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <UserCircle className="h-6 w-6" />
                <span className="text-sm font-medium hidden sm:block">{user?.name || 'User'}</span>
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-brand-bg dark:bg-gray-800 rounded-lg shadow-xl border border-subtle dark:border-gray-700 py-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {role}
                  </div>
                  <Link href="/my-stories" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowMenu(false)}>
                    <PenTool className="h-4 w-4" /> {t.myStories}
                  </Link>
                  <Link href="/library" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowMenu(false)}>
                    <BookOpen className="h-4 w-4" /> {t.library}
                  </Link>
                  <Link href="/reading-lists" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowMenu(false)}>
                    <List className="h-4 w-4" /> {t.readingLists}
                  </Link>
                  <Link href={`/profile/${user?.username || 'me'}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowMenu(false)}>
                    <UserCircle className="h-4 w-4" /> {t.profile}
                  </Link>
                  {role === 'admin' && (
                    <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowMenu(false)}>
                      <LayoutDashboard className="h-4 w-4" /> Admin Panel
                    </Link>
                  )}
                  <div className="border-t dark:border-gray-700 my-2"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                  >
                    <LogOut className="h-4 w-4" /> {t.logout}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
