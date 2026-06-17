'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/i18n';
import {
  getForumCategories, getForumThreads, getForumThread, getForumPosts,
  getForumReplies, createForumThread, createForumPost, deleteForumThread,
  deleteForumPost, voteForumThread, getUserForumVoteThreads, supabase,
  getSiteConfigLocalized
} from '@/lib/supabase';
import {
  MessageCircle, PenTool, Star, BookOpen, Trophy, Lightbulb,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, X,
  Send, Trash2, Eye, Clock, Pin, Lock, Shield, Users, ArrowLeft,
  ThumbsUp, Reply
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  MessageCircle, PenTool, Star, BookOpen, Trophy, Lightbulb
};

type View = 'list' | 'thread' | 'create';

export default function CommunityPage() {
  const { user, role, lang, _hasHydrated } = useStore();
  const t = translations[lang].pages;

  // State
  const [view, setView] = useState<View>('list');
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [threadCount, setThreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});

  // Thread detail state
  const [activeThread, setActiveThread] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [postPage, setPostPage] = useState(1);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Create thread state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [creating, setCreating] = useState(false);

  // Stats
  const [stats, setStats] = useState({ writers: 0, stories: 0, comments: 0 });

  // Config
  const [config, setConfig] = useState<any>(null);

  const perPage = 15;

  // Labels
  const labels = lang === 'en' ? {
    title: 'Community',
    subtitle: 'Connect, discuss, and share with fellow writers and readers.',
    guidelines: 'Community Guidelines',
    allCategories: 'All Categories',
    newThread: 'New Discussion',
    createThread: 'Start a Discussion',
    titlePlaceholder: 'Discussion title...',
    contentPlaceholder: 'Share your thoughts, questions, or ideas...',
    selectCategory: 'Select a category',
    post: 'Post',
    cancel: 'Cancel',
    noThreads: 'No discussions yet. Be the first to start one!',
    replies: 'replies',
    views: 'views',
    writeReply: 'Write a reply...',
    send: 'Send',
    reply: 'Reply',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this?',
    loginToPost: 'Log in to join the discussion',
    pinned: 'Pinned',
    locked: 'Locked',
    backToList: 'Back to discussions',
    statsWriters: 'Active Writers',
    statsStories: 'Published Stories',
    statsComments: 'Comments',
    ago: 'ago',
  } : {
    title: 'Komunitas',
    subtitle: 'Terhubung, berdiskusi, dan berbagi dengan sesama penulis dan pembaca.',
    guidelines: 'Pedoman Komunitas',
    allCategories: 'Semua Kategori',
    newThread: 'Diskusi Baru',
    createThread: 'Mulai Diskusi',
    titlePlaceholder: 'Judul diskusi...',
    contentPlaceholder: 'Tulis pemikiran, pertanyaan, atau ide Anda...',
    selectCategory: 'Pilih kategori',
    post: 'Kirim',
    cancel: 'Batal',
    noThreads: 'Belum ada diskusi. Jadilah yang pertama!',
    replies: 'balasan',
    views: 'dilihat',
    writeReply: 'Tulis balasan...',
    send: 'Kirim',
    reply: 'Balas',
    delete: 'Hapus',
    deleteConfirm: 'Yakin ingin menghapus ini?',
    loginToPost: 'Masuk untuk ikut berdiskusi',
    pinned: 'Disematkan',
    locked: 'Terkunci',
    backToList: 'Kembali ke daftar',
    statsWriters: 'Penulis Aktif',
    statsStories: 'Cerita Diterbitkan',
    statsComments: 'Komentar',
    ago: 'lalu',
  };

  // Load categories + stats
  useEffect(() => {
    loadData();
  }, [lang]);

  const loadData = async () => {
    setLoading(true);
    const [cats, cfg] = await Promise.all([
      getForumCategories(),
      getSiteConfigLocalized('page_community', lang)
    ]);
    setCategories(cats);
    setConfig(cfg);

    if (supabase) {
      const [usersRes, storiesRes, commentsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('comments').select('*', { count: 'exact', head: true })
      ]);
      setStats({ writers: usersRes.count || 0, stories: storiesRes.count || 0, comments: commentsRes.count || 0 });
    }
    setLoading(false);
  };

  // Load threads
  const loadThreads = useCallback(async (catSlug?: string | null, p = 1) => {
    setLoading(true);
    const result = await getForumThreads(catSlug || undefined, p, perPage);
    setThreads(result.threads);
    setThreadCount(result.count);

    // Load user votes
    if (user && result.threads.length > 0) {
      const ids = result.threads.map(t => t.id);
      const votes = await getUserForumVoteThreads(ids);
      const voteMap: Record<string, number> = {};
      votes.forEach(v => { voteMap[v.thread_id] = v.value; });
      setUserVotes(voteMap);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (view === 'list') {
      loadThreads(activeCat, page);
    }
  }, [view, activeCat, page, loadThreads]);

  // Load thread detail
  const openThread = async (threadId: string) => {
    setView('thread');
    setLoading(true);
    const thread = await getForumThread(threadId);
    setActiveThread(thread);
    const result = await getForumPosts(threadId, 1, 30);
    setPosts(result.posts);
    setPostCount(result.count);
    setPostPage(1);
    // Load replies for each post
    const replyMap: Record<string, any[]> = {};
    for (const post of result.posts) {
      const r = await getForumReplies(post.id);
      if (r.length > 0) replyMap[post.id] = r;
    }
    setReplies(replyMap);
    setLoading(false);
  };

  // Create thread
  const handleCreateThread = async () => {
    if (!newTitle.trim() || !newContent.trim() || !newCatId) return;
    setCreating(true);
    try {
      await createForumThread(newCatId, newTitle.trim(), newContent.trim());
      setNewTitle(''); setNewContent(''); setNewCatId('');
      setShowCreate(false);
      loadThreads(activeCat, 1);
      setPage(1);
    } catch (e: any) {
      alert(e.message);
    }
    setCreating(false);
  };

  // Post reply
  const handlePostReply = async (parentId?: string) => {
    if (!replyContent.trim() || !activeThread) return;
    try {
      await createForumPost(activeThread.id, replyContent.trim(), parentId);
      setReplyContent('');
      setReplyingTo(null);
      openThread(activeThread.id);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Delete thread
  const handleDeleteThread = async (threadId: string) => {
    if (!confirm(labels.deleteConfirm)) return;
    try {
      await deleteForumThread(threadId);
      setView('list');
      loadThreads(activeCat, page);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm(labels.deleteConfirm)) return;
    try {
      await deleteForumPost(postId);
      if (activeThread) openThread(activeThread.id);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Vote thread
  const handleVoteThread = async (threadId: string, value: 1 | -1) => {
    if (!user) return;
    const result = await voteForumThread(threadId, value);
    setUserVotes(prev => ({ ...prev, [threadId]: result }));
    // Update local count
    setThreads(prev => prev.map(t => {
      if (t.id !== threadId) return t;
      const oldVote = userVotes[threadId] || 0;
      return { ...t, votes_count: (t.votes_count || 0) - oldVote + result };
    }));
  };

  // Time ago
  const timeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 60) return lang === 'en' ? 'just now' : 'baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${labels.ago}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ${labels.ago}`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ${labels.ago}`;
    return then.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!_hasHydrated) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  // ===== THREAD DETAIL VIEW =====
  if (view === 'thread' && activeThread) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-tx-soft hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4" /> {labels.backToList}
        </button>

        {/* Thread header */}
        <div className="p-6 rounded-xl border border-border bg-bg-card space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
              <button
                onClick={() => handleVoteThread(activeThread.id, 1)}
                className={`p-1 rounded hover:bg-bg-soft transition-colors ${userVotes[activeThread.id] === 1 ? 'text-accent' : 'text-tx-muted'}`}
              >
                <ChevronUp className="h-5 w-5" />
              </button>
              <span className={`text-sm font-bold ${userVotes[activeThread.id] === 1 ? 'text-accent' : userVotes[activeThread.id] === -1 ? 'text-blue-500' : 'text-tx-soft'}`}>
                {(activeThread.votes_count || 0)}
              </span>
              <button
                onClick={() => handleVoteThread(activeThread.id, -1)}
                className={`p-1 rounded hover:bg-bg-soft transition-colors ${userVotes[activeThread.id] === -1 ? 'text-blue-500' : 'text-tx-muted'}`}
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {activeThread.is_pinned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold">{labels.pinned}</span>}
                {activeThread.is_locked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-tx-muted font-semibold flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" />{labels.locked}</span>}
                {activeThread.forum_categories && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-tx-soft font-medium">
                    {lang === 'en' ? activeThread.forum_categories.name_en || activeThread.forum_categories.name : activeThread.forum_categories.name}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold font-serif">{activeThread.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-xs text-tx-muted">
                <div className="flex items-center gap-1.5">
                  {activeThread.author?.avatar_url ? (
                    <img src={activeThread.author.avatar_url} className="w-4 h-4 rounded-full" alt="" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-bg-input" />
                  )}
                  <span className="font-medium text-tx-soft">{activeThread.author?.full_name || activeThread.author?.username || 'Anonymous'}</span>
                </div>
                <span>{timeAgo(activeThread.created_at)}</span>
                <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {activeThread.views_count || 0}</span>
                <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {activeThread.replies_count || 0}</span>
              </div>
            </div>
            {user && (user.id === activeThread.author_id || role === 'admin') && (
              <button onClick={() => handleDeleteThread(activeThread.id)} className="p-1.5 rounded text-tx-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={labels.delete}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="pl-12 text-tx-soft text-sm leading-relaxed whitespace-pre-wrap">{activeThread.content}</div>
        </div>

        {/* Posts / Replies */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-tx-muted uppercase tracking-wider px-1">{postCount} {labels.replies}</h2>

          {posts.map(post => (
            <div key={post.id} className="space-y-2">
              {/* Main post */}
              <div className="p-4 rounded-xl border border-border bg-bg-card">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 pt-0.5">
                    {post.author?.avatar_url ? (
                      <img src={post.author.avatar_url} className="w-8 h-8 rounded-full" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-bg-input" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{post.author?.full_name || post.author?.username || 'Anonymous'}</span>
                      <span className="text-xs text-tx-muted">{timeAgo(post.created_at)}</span>
                      {post.is_edited && <span className="text-[10px] text-tx-muted">({lang === 'en' ? 'edited' : 'diedit'})</span>}
                    </div>
                    <div className="text-sm text-tx-soft whitespace-pre-wrap leading-relaxed">{post.content}</div>
                    <div className="flex items-center gap-3 mt-2">
                      {!activeThread.is_locked && user && (
                        <button onClick={() => { setReplyingTo(replyingTo === post.id ? null : post.id); setReplyContent(''); }} className="flex items-center gap-1 text-xs text-tx-muted hover:text-accent transition-colors">
                          <Reply className="h-3 w-3" /> {labels.reply}
                        </button>
                      )}
                      {user && (user.id === post.author_id || role === 'admin') && (
                        <button onClick={() => handleDeletePost(post.id)} className="flex items-center gap-1 text-xs text-tx-muted hover:text-red-500 transition-colors">
                          <Trash2 className="h-3 w-3" /> {labels.delete}
                        </button>
                      )}
                    </div>

                    {/* Reply input */}
                    {replyingTo === post.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={replyContent}
                          onChange={e => setReplyContent(e.target.value)}
                          placeholder={labels.writeReply}
                          className="flex-1 px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent"
                          onKeyDown={e => { if (e.key === 'Enter') handlePostReply(post.id); }}
                        />
                        <button onClick={() => handlePostReply(post.id)} className="p-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity">
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-replies */}
              {replies[post.id]?.map((r: any) => (
                <div key={r.id} className="ml-11 p-3 rounded-lg border border-border/50 bg-bg-soft/50">
                  <div className="flex items-start gap-2.5">
                    {r.author?.avatar_url ? (
                      <img src={r.author.avatar_url} className="w-6 h-6 rounded-full shrink-0 mt-0.5" alt="" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-bg-input shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium">{r.author?.full_name || r.author?.username || 'Anonymous'}</span>
                        <span className="text-[10px] text-tx-muted">{timeAgo(r.created_at)}</span>
                      </div>
                      <div className="text-sm text-tx-soft whitespace-pre-wrap">{r.content}</div>
                      {user && (user.id === r.author_id || role === 'admin') && (
                        <button onClick={() => handleDeletePost(r.id)} className="text-[10px] text-tx-muted hover:text-red-500 mt-1 transition-colors">
                          {labels.delete}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {posts.length === 0 && !activeThread.is_locked && (
            <div className="text-center py-8 text-tx-muted text-sm">
              {lang === 'en' ? 'No replies yet. Be the first to respond!' : 'Belum ada balasan. Jadilah yang pertama!'}
            </div>
          )}
        </div>

        {/* Reply to thread */}
        {!activeThread.is_locked && (
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            {user ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyingTo === '__thread__' ? replyContent : ''}
                  onChange={e => { setReplyingTo('__thread__'); setReplyContent(e.target.value); }}
                  onFocus={() => setReplyingTo('__thread__')}
                  placeholder={labels.writeReply}
                  className="flex-1 px-3 py-2.5 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent"
                  onKeyDown={e => { if (e.key === 'Enter') handlePostReply(); }}
                />
                <button onClick={() => handlePostReply()} className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5">
                  <Send className="h-4 w-4" /> {labels.send}
                </button>
              </div>
            ) : (
              <p className="text-center text-sm text-tx-muted py-2">{labels.loginToPost}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ===== LIST VIEW =====
  const totalPages = Math.ceil(threadCount / perPage);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-serif">{config?.title || labels.title}</h1>
        <p className="text-tx-soft">{config?.subtitle || labels.subtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label={labels.statsWriters} value={stats.writers} />
        <StatCard icon={<BookOpen className="h-4 w-4" />} label={labels.statsStories} value={stats.stories} />
        <StatCard icon={<MessageCircle className="h-4 w-4" />} label={labels.statsComments} value={stats.comments} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Categories */}
        <aside className="lg:w-56 shrink-0 space-y-2">
          <button
            onClick={() => { setActiveCat(null); setPage(1); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!activeCat ? 'bg-accent/10 text-accent' : 'text-tx-soft hover:bg-bg-soft'}`}
          >
            {labels.allCategories}
          </button>
          {categories.map(cat => {
            const Icon = ICON_MAP[cat.icon] || MessageCircle;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCat(cat.slug); setPage(1); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeCat === cat.slug ? 'bg-accent/10 text-accent' : 'text-tx-soft hover:bg-bg-soft'}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{lang === 'en' ? (cat.name_en || cat.name) : cat.name}</span>
              </button>
            );
          })}

          {/* Guidelines */}
          {config?.guidelines && config.guidelines.length > 0 && (
            <div className="mt-4 p-4 rounded-xl border border-border bg-bg-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-tx-muted mb-3 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> {labels.guidelines}
              </h3>
              <ul className="space-y-2">
                {config.guidelines.map((g: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-tx-soft">
                    <span className="w-4 h-4 rounded-full bg-accent/10 text-accent text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* Main - Threads */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Create button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-tx-muted">{threadCount} {lang === 'en' ? 'discussions' : 'diskusi'}</p>
            {user && (
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" /> {labels.newThread}
              </button>
            )}
          </div>

          {/* Create form */}
          {showCreate && user && (
            <div className="p-5 rounded-xl border border-accent/30 bg-bg-card space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><PenTool className="h-4 w-4" /> {labels.createThread}</h3>
              <select
                value={newCatId}
                onChange={e => setNewCatId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent [&>option]:bg-bg-card [&>option]:text-tx"
              >
                <option value="">{labels.selectCategory}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{lang === 'en' ? (c.name_en || c.name) : c.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={labels.titlePlaceholder}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent"
              />
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder={labels.contentPlaceholder}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border focus:outline-none focus:border-accent resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateThread}
                  disabled={creating || !newTitle.trim() || !newContent.trim() || !newCatId}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> {creating ? '...' : labels.post}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-bg-soft transition-colors">
                  {labels.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Thread list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-bg-card animate-pulse space-y-2">
                  <div className="h-4 bg-bg-input rounded w-3/4" />
                  <div className="h-3 bg-bg-input rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-16 text-tx-muted">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{labels.noThreads}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map(thread => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  userVote={userVotes[thread.id] || 0}
                  onVote={(v) => handleVoteThread(thread.id, v)}
                  onClick={() => openThread(thread.id)}
                  timeAgo={timeAgo}
                  lang={lang}
                  user={user}
                  role={role}
                  onDelete={() => handleDeleteThread(thread.id)}
                  labels={labels}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-border hover:bg-bg-soft transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-tx-soft px-3">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-border hover:bg-bg-soft transition-colors disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Sub-components =====

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-bg-card">
      <div className="p-2 rounded-lg bg-bg-input text-accent">{icon}</div>
      <div>
        <p className="text-lg font-bold">{value.toLocaleString()}</p>
        <p className="text-[10px] text-tx-muted">{label}</p>
      </div>
    </div>
  );
}

function ThreadCard({ thread, userVote, onVote, onClick, timeAgo, lang, user, role, onDelete, labels }: {
  thread: any; userVote: number; onVote: (v: 1 | -1) => void; onClick: () => void;
  timeAgo: (d: string) => string; lang: string; user: any; role: string;
  onDelete: () => void; labels: any;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-bg-card hover:border-accent/20 transition-colors group">
      {/* Vote column */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); if (user) onVote(1); }}
          className={`p-0.5 rounded hover:bg-bg-soft transition-colors ${userVote === 1 ? 'text-accent' : 'text-tx-muted'}`}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <span className={`text-xs font-bold ${userVote === 1 ? 'text-accent' : userVote === -1 ? 'text-blue-500' : 'text-tx-muted'}`}>
          {(thread.votes_count || 0)}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); if (user) onVote(-1); }}
          className={`p-0.5 rounded hover:bg-bg-soft transition-colors ${userVote === -1 ? 'text-blue-500' : 'text-tx-muted'}`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          {thread.is_pinned && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold flex items-center gap-0.5">
              <Pin className="h-2.5 w-2.5" /> {labels.pinned}
            </span>
          )}
          {thread.is_locked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-tx-muted font-semibold flex items-center gap-0.5">
              <Lock className="h-2.5 w-2.5" /> {labels.locked}
            </span>
          )}
          {thread.forum_categories && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-tx-soft font-medium">
              {lang === 'en' ? (thread.forum_categories.name_en || thread.forum_categories.name) : thread.forum_categories.name}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold group-hover:text-accent transition-colors line-clamp-1">{thread.title}</h3>
        <p className="text-xs text-tx-muted mt-0.5 line-clamp-1">{thread.content}</p>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-tx-muted">
          <span className="font-medium text-tx-soft">{thread.author?.full_name || thread.author?.username || 'Anonymous'}</span>
          <span>{timeAgo(thread.created_at)}</span>
          <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {thread.replies_count || 0}</span>
          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {thread.views_count || 0}</span>
        </div>
      </div>

      {/* Delete */}
      {user && (user.id === thread.author_id || role === 'admin') && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded text-tx-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          title={labels.delete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
