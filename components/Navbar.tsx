'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { supabase, signOut, getConversations, getUnreadMessageCount } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { Moon, Sun, Bell, Search, UserCircle, PenTool, LayoutDashboard, LogIn, LogOut, BookOpen, List, Globe, MessageCircle, Megaphone, Bot, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { translations } from '@/lib/i18n';
import { AdPopup } from '@/components/AdPopup';
import { getProfileFrames } from '@/lib/supabase';

export function Navbar() {
  const router = useRouter();
  const { role, user, logout, lang, setLang } = useStore();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatConvos, setChatConvos] = useState<any[]>([]);
  const [chatUnread, setChatUnread] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const [frameSvg, setFrameSvg] = useState<string | null>(null);
  const [frameMap, setFrameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load all frames once and build a map
  useEffect(() => {
    getProfileFrames().then(frames => {
      const map: Record<string, string> = {};
      frames.forEach((f: any) => { if (f.id && f.svg_data) map[f.id] = f.svg_data; });
      setFrameMap(map);
    });
  }, []);

  // Set own frame SVG from the map whenever user's frame_id changes
  useEffect(() => {
    if (user?.frame_id && frameMap[user.frame_id]) {
      setFrameSvg(frameMap[user.frame_id]);
    } else {
      setFrameSvg(null);
    }
  }, [user?.frame_id, frameMap]);

  // Load chat data for logged-in users
  useEffect(() => {
    if (role !== 'guest' && user?.id) {
      loadChatPreview();
      // Poll every 10 seconds
      const interval = setInterval(loadChatPreview, 10000);
      // Refresh on window focus (user comes back to tab)
      const handleFocus = () => loadChatPreview();
      const handleVisibility = () => { if (!document.hidden) loadChatPreview(); };
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, [role, user?.id]);

  // Refresh chat when route changes (e.g. leaving /chat page)
  useEffect(() => {
    if (role !== 'guest' && user?.id) {
      // Small delay to let the chat page finish marking messages as read
      const timeout = setTimeout(() => loadChatPreview(), 500);
      return () => clearTimeout(timeout);
    }
  }, [pathname, role, user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        setShowChat(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadChatPreview = async () => {
    if (!user?.id) return;
    try {
      const [convos, unread] = await Promise.all([
        getConversations(user.id),
        getUnreadMessageCount(user.id)
      ]);
      setChatConvos(convos.slice(0, 5)); // Show max 5 conversations
      setChatUnread(unread);
    } catch (e) {
      // Silent fail
    }
  };

  const t = translations[lang].nav;
  const isDark = theme === 'dark';

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 60) return lang === 'en' ? 'now' : 'baru';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const handleLogout = async () => {
    try { await signOut(); } catch {}
    logout();
    setShowMenu(false);
    router.push('/');
  };

  const toggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) {
      loadChatPreview(); // Refresh when opening
      setShowMenu(false);
    }
  };

  const chatLabels = lang === 'en' ? {
    messages: 'Messages',
    noMessages: 'No messages yet',
    viewAll: 'View All Messages',
    startChat: 'Start a conversation on the Chat page',
    you: 'You',
  } : {
    messages: 'Pesan',
    noMessages: 'Belum ada pesan',
    viewAll: 'Lihat Semua Pesan',
    startChat: 'Mulai percakapan di halaman Chat',
    you: 'Anda',
  };

  return (
    <>
    <AdPopup />
    <header className="sticky top-0 z-50 w-full border-b border-border bg-bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-bg-card/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center font-serif text-2xl font-bold italic tracking-tighter hover:opacity-80 transition-opacity">
            <span className="text-accent">Di.</span><span className="text-tx">tulis</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-bg-soft transition-colors" aria-label="Toggle theme">
            {mounted ? (isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />) : <div className="h-5 w-5" />}
          </button>
          
          <button 
            onClick={() => setLang(lang === 'id' ? 'en' : 'id')} 
            className="flex items-center gap-1 p-2 rounded-full hover:bg-bg-soft transition-colors text-sm font-medium text-tx-soft"
            title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          >
            <Globe className="h-5 w-5" />
            <span className="hidden sm:inline uppercase">{lang}</span>
          </button>
          
          {role !== 'guest' && (
            <>
              {/* Chat dropdown */}
              <div className="relative" ref={chatRef}>
                <button
                  onClick={toggleChat}
                  className="relative p-2 rounded-full hover:bg-bg-soft transition-colors"
                  title="Chat"
                >
                  <MessageCircle className="h-5 w-5" />
                  {chatUnread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                      {chatUnread > 9 ? '9+' : chatUnread}
                    </span>
                  )}
                </button>

                {showChat && (
                  <div className="absolute right-0 mt-2 w-80 bg-bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-accent" />
                        {chatLabels.messages}
                      </h3>
                      {chatUnread > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-white font-bold">{chatUnread}</span>
                      )}
                    </div>

                    {/* Conversation list */}
                    <div className="max-h-72 overflow-y-auto">
                      {chatConvos.length === 0 ? (
                        <div className="py-8 text-center">
                          <MessageCircle className="h-8 w-8 mx-auto text-tx-muted opacity-30 mb-2" />
                          <p className="text-xs text-tx-muted">{chatLabels.noMessages}</p>
                          <p className="text-[10px] text-tx-muted opacity-60 mt-1">{chatLabels.startChat}</p>
                        </div>
                      ) : (
                        chatConvos.map(convo => (
                          <Link
                            key={convo.conversation_id}
                            href="/chat"
                            onClick={() => { setShowChat(false); loadChatPreview(); }}
                            className={`flex items-center gap-3 px-4 py-3 hover:bg-bg-soft transition-colors border-b border-border/50 ${convo.unread_count > 0 ? 'bg-accent/5' : ''}`}
                          >
                            <div className="relative w-9 h-9 shrink-0">
                              {convo.other_user?.frame_id && frameMap[convo.other_user.frame_id] && (
                                <div className="absolute inset-[-3px] w-[42px] h-[42px] z-10 pointer-events-none" dangerouslySetInnerHTML={{ __html: frameMap[convo.other_user.frame_id].replace('<svg', '<svg width="100%" height="100%"') }} />
                              )}
                              {convo.other_user?.avatar_url || convo.other_user?.selected_avatar ? (
                                <img src={convo.other_user.avatar_url || convo.other_user.selected_avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                                  {(convo.other_user?.full_name || convo.other_user?.username || 'U')[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={`text-sm truncate ${convo.unread_count > 0 ? 'font-semibold' : 'font-medium'}`}>
                                  {convo.other_user?.full_name || convo.other_user?.username}
                                </p>
                                <span className="text-[10px] text-tx-muted shrink-0 ml-2">{timeAgo(convo.last_message?.created_at)}</span>
                              </div>
                              <div className="flex items-center justify-between mt-0.5">
                                <p className="text-xs text-tx-muted truncate">
                                  {convo.last_message?.sender_id === user?.id ? `${chatLabels.you}: ` : ''}
                                  {convo.last_message?.content || ''}
                                </p>
                                {convo.unread_count > 0 && (
                                  <span className="ml-2 w-4 h-4 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                    {convo.unread_count > 9 ? '9+' : convo.unread_count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <Link
                      href="/chat"
                      onClick={() => { setShowChat(false); loadChatPreview(); }}
                      className="block text-center px-4 py-2.5 text-xs font-medium text-accent hover:bg-accent/5 border-t border-border transition-colors"
                    >
                      {chatLabels.viewAll} →
                    </Link>
                  </div>
                )}
              </div>

              <Link href="/notifications" className="p-2 rounded-full hover:bg-bg-soft transition-colors">
                <Bell className="h-5 w-5" />
              </Link>

              {/* Nana AI button */}
              <Link
                href="/ai-chat"
                className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm font-medium"
              >
                <img src="/nana-avatar.gif" alt="" className="w-5 h-5 rounded-full object-cover" />
                <span className="hidden sm:inline">Nana AI</span>
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-lg bg-bg-card border border-border shadow-lg text-[10px] text-tx-soft whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Asisten menulis AI kamu
                </span>
              </Link>
            </>
          )}

          {role === 'guest' ? (
            <div className="hidden md:flex items-center gap-2 ml-2">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-tx-soft hover:text-accent transition-colors">
                {t.login}
              </Link>
              <Link href="/register" className="px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
                {t.register}
              </Link>
            </div>
          ) : (
            <div className="relative">
              <button 
                onClick={() => { setShowMenu(!showMenu); setShowChat(false); }}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-bg-soft transition-colors"
              >
                <div className="relative w-7 h-7 shrink-0">
                  {frameSvg && (
                    <div className="absolute inset-[-4px] w-[36px] h-[36px] z-10 pointer-events-none" dangerouslySetInnerHTML={{ __html: frameSvg.replace('<svg', '<svg width="100%" height="100%"') }} />
                  )}
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : user?.selected_avatar ? (
                    <img src={user.selected_avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                      {(user?.name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium hidden sm:block">{user?.name || 'User'}</span>
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-bg-card rounded-lg shadow-xl border border-border py-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {role}
                  </div>
                  <Link href="/my-stories" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-soft" onClick={() => setShowMenu(false)}>
                    <PenTool className="h-4 w-4" /> {t.myStories}
                  </Link>
                  <Link href="/library" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-soft" onClick={() => setShowMenu(false)}>
                    <BookOpen className="h-4 w-4" /> {t.library}
                  </Link>
                  <Link href="/reading-lists" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-soft" onClick={() => setShowMenu(false)}>
                    <List className="h-4 w-4" /> {t.readingLists}
                  </Link>
                  <Link href={`/profile/${user?.username || 'me'}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-soft" onClick={() => setShowMenu(false)}>
                    <UserCircle className="h-4 w-4" /> {t.profile}
                  </Link>
                  <Link href="/chat" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-soft" onClick={() => setShowMenu(false)}>
                    <MessageCircle className="h-4 w-4" /> Chat
                  </Link>
                  <Link href="/ai-chat" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-soft" onClick={() => setShowMenu(false)}>
                    <Sparkles className="h-4 w-4" /> Nana AI
                  </Link>
                  <Link href="/ads" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-soft" onClick={() => setShowMenu(false)}>
                    <Megaphone className="h-4 w-4" /> {lang === 'en' ? 'My Ads' : 'Iklan Saya'}
                  </Link>
                  {role === 'admin' && (
                    <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-soft" onClick={() => setShowMenu(false)}>
                      <LayoutDashboard className="h-4 w-4" /> Admin Panel
                    </Link>
                  )}
                  <div className="border-t border-border my-2"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-bg-soft w-full text-left"
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
    </>
  );
}
