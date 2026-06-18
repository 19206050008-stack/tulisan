'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getConversations, getMessages, sendMessage, getOrCreateConversation, getProfileFrames, supabase } from '@/lib/supabase';
import { translations } from '@/lib/i18n';
import { Send, ArrowLeft, MessageCircle, Search, Users } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const { user, role, _hasHydrated, lang } = useStore();
  const t = translations[lang].nav;

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [activeOther, setActiveOther] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [frameMap, setFrameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    getProfileFrames().then((frames: any[]) => {
      const map: Record<string, string> = {};
      frames.forEach((f: any) => { if (f.id && f.svg_data) map[f.id] = f.svg_data; });
      setFrameMap(map);
    });
  }, []);

  const labels = lang === 'en' ? {
    title: 'Messages',
    noConvos: 'No conversations yet.',
    startChat: 'Start a conversation by searching for a user.',
    searchUser: 'Search users...',
    typeMessage: 'Type a message...',
    send: 'Send',
    back: 'Back',
    justNow: 'just now',
    minAgo: 'm ago',
    hourAgo: 'h ago',
    dayAgo: 'd ago',
    you: 'You',
    online: 'Online',
  } : {
    title: 'Pesan',
    noConvos: 'Belum ada percakapan.',
    startChat: 'Mulai percakapan dengan mencari pengguna.',
    searchUser: 'Cari pengguna...',
    typeMessage: 'Ketik pesan...',
    send: 'Kirim',
    back: 'Kembali',
    justNow: 'baru saja',
    minAgo: 'm lalu',
    hourAgo: 'j lalu',
    dayAgo: 'h lalu',
    you: 'Anda',
    online: 'Online',
  };

  useEffect(() => {
    if (!_hasHydrated) return;
    if (role === 'guest') { router.push('/login'); return; }
    if (user?.id) loadConversations(true);
  }, [user, role, _hasHydrated]);

  // Auto-poll for new messages
  useEffect(() => {
    if (activeConvo) {
      pollRef.current = setInterval(() => {
        refreshMessages();
      }, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConvo]);

  const loadConversations = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const convos = await getConversations(user.id);
      setConversations(convos);
    } catch (e) {
      console.error('loadConversations error:', e);
    }
    if (showLoading) setLoading(false);
  };

  const openConversation = async (convoId: string, otherUser: any) => {
    setActiveConvo(convoId);
    setActiveOther(otherUser);
    setShowSearch(false);
    try {
      const result = await getMessages(convoId);
      setMessages(result.messages || []);
    } catch (e) {
      console.error('openConversation error:', e);
      setMessages([]);
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const refreshMessages = useCallback(async () => {
    if (!activeConvo) return;
    try {
      const result = await getMessages(activeConvo);
      setMessages(result.messages || []);
    } catch (e) {
      // Silent fail on auto-refresh
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [activeConvo]);

  const startNewChat = async (otherUserId: string, otherUser: any) => {
    setLoading(true);
    setShowSearch(false);
    try {
      const convoId = await getOrCreateConversation(user.id, otherUserId);
      if (convoId) {
        await loadConversations();
        await openConversation(convoId, otherUser);
      } else {
        console.error('Failed to create conversation');
        alert(lang === 'en' ? 'Failed to start conversation. Please try again.' : 'Gagal memulai percakapan. Silakan coba lagi.');
      }
    } catch (e: any) {
      console.error('Chat error:', e);
      alert(e.message || 'An error occurred');
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvo || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(activeConvo, newMessage.trim());
      if (msg) {
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        loadConversations();
      }
    } catch (e: any) {
      console.error('Send error:', JSON.stringify(e), e?.message, e?.code);
      alert(e?.message || 'Failed to send message. Please try again.');
    }
    setSending(false);
  };

  const handleSearchUsers = async (query: string) => {
    setSearchUser(query);
    if (query.length < 2) { setSearchResults([]); return; }
    if (!supabase) return;
    const q = query.trim();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, avatar_type, selected_avatar, frame_id')
      .neq('id', user.id)
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(10);
    if (error) {
      console.error('Search error:', error);
      return;
    }
    setSearchResults(data || []);
  };

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 60) return labels.justNow;
    if (diff < 3600) return `${Math.floor(diff / 60)}${labels.minAgo}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${labels.hourAgo}`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}${labels.dayAgo}`;
    return then.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { month: 'short', day: 'numeric' });
  };

  if (!_hasHydrated || loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)]">
        <div className="w-80 border-r border-border bg-bg-card animate-pulse" />
        <div className="flex-1 bg-bg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -my-8 -mx-4">
      {/* Sidebar - Conversation List */}
      <div className={`w-full md:w-80 border-r border-border bg-bg-card flex flex-col shrink-0 ${activeConvo ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold font-serif flex items-center gap-2"><MessageCircle className="h-5 w-5 text-accent" /> {labels.title}</h1>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg hover:bg-bg-soft transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          {showSearch && (
            <div className="space-y-2">
              <input
                type="text"
                value={searchUser}
                onChange={e => handleSearchUsers(e.target.value)}
                placeholder={labels.searchUser}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent"
                autoFocus
              />
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-bg-card">
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => startNewChat(u.id, u)}
                      className="w-full flex items-center gap-2.5 p-2.5 hover:bg-bg-soft transition-colors text-left"
                    >
                      <div className="relative w-8 h-8 shrink-0">
                        {u.frame_id && frameMap[u.frame_id] && (
                          <div className="absolute inset-[-3px] w-[38px] h-[38px] z-10 pointer-events-none" dangerouslySetInnerHTML={{ __html: frameMap[u.frame_id].replace('<svg', '<svg width="100%" height="100%"') }} />
                        )}
                        {u.avatar_url || u.selected_avatar ? (
                          <img src={u.avatar_url || u.selected_avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                            {(u.full_name || u.username || 'U')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name || u.username}</p>
                        <p className="text-[10px] text-tx-muted">@{u.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="h-10 w-10 mx-auto text-tx-muted opacity-30 mb-3" />
              <p className="text-sm text-tx-muted">{labels.noConvos}</p>
              <p className="text-xs text-tx-muted mt-1 opacity-60">{labels.startChat}</p>
            </div>
          ) : (
            conversations.map(convo => (
              <button
                key={convo.conversation_id}
                onClick={() => openConversation(convo.conversation_id, convo.other_user)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-bg-soft transition-colors text-left border-b border-border/50 ${activeConvo === convo.conversation_id ? 'bg-accent/5' : ''}`}
              >
                <div className="relative w-10 h-10 shrink-0">
                  {convo.other_user?.frame_id && frameMap[convo.other_user.frame_id] && (
                    <div className="absolute inset-[-3px] w-[46px] h-[46px] z-10 pointer-events-none" dangerouslySetInnerHTML={{ __html: frameMap[convo.other_user.frame_id].replace('<svg', '<svg width="100%" height="100%"') }} />
                  )}
                  {convo.other_user?.avatar_url || convo.other_user?.selected_avatar ? (
                    <img src={convo.other_user.avatar_url || convo.other_user.selected_avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                      {(convo.other_user?.full_name || convo.other_user?.username || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{convo.other_user?.full_name || convo.other_user?.username}</p>
                    <span className="text-[10px] text-tx-muted shrink-0 ml-2">{timeAgo(convo.last_message?.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-tx-muted truncate">
                      {convo.last_message?.sender_id === user.id ? `${labels.you}: ` : ''}{convo.last_message?.content || ''}
                    </p>
                    {convo.unread_count > 0 && (
                      <span className="ml-2 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {convo.unread_count > 9 ? '9+' : convo.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main - Message Thread */}
      <div className={`flex-1 flex flex-col min-w-0 ${!activeConvo ? 'hidden md:flex' : 'flex'}`}>
        {activeConvo && activeOther ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-bg-card">
              <button onClick={() => setActiveConvo(null)} className="md:hidden p-1 rounded hover:bg-bg-soft">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative w-9 h-9">
                {activeOther.frame_id && frameMap[activeOther.frame_id] && (
                  <div className="absolute inset-[-3px] w-[42px] h-[42px] z-10 pointer-events-none" dangerouslySetInnerHTML={{ __html: frameMap[activeOther.frame_id].replace('<svg', '<svg width="100%" height="100%"') }} />
                )}
                {activeOther.avatar_url || activeOther.selected_avatar ? (
                  <img src={activeOther.avatar_url || activeOther.selected_avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                    {(activeOther.full_name || activeOther.username || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <Link href={`/profile/${activeOther.username}`} className="text-sm font-medium hover:text-accent transition-colors">{activeOther.full_name || activeOther.username}</Link>
                <p className="text-[10px] text-tx-muted">@{activeOther.username}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg">
              {messages.map((msg, i) => {
                const isMine = msg.sender_id === user.id;
                return (
                  <div key={msg.id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMine ? 'bg-accent text-white rounded-br-sm' : 'bg-bg-card border border-border rounded-bl-sm'}`}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-tx-muted'}`}>{timeAgo(msg.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-bg-card">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={labels.typeMessage}
                  className="flex-1 px-4 py-2.5 rounded-full bg-bg-input border border-border focus:outline-none focus:border-accent text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 rounded-full bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageCircle className="h-16 w-16 mx-auto text-tx-muted opacity-20 mb-4" />
              <p className="text-tx-muted font-medium">{labels.title}</p>
              <p className="text-sm text-tx-muted mt-1 opacity-60">{labels.startChat}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
