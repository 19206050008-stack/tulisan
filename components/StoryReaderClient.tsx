'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { toggleLike, isLiked as checkLiked, toggleSave, isSaved as checkSaved, getCommentLikes } from '@/lib/supabase';
import { Share2, Heart, MessageCircle, Bookmark, Settings, X, ChevronLeft, ChevronRight, Send, Pencil, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { LoginPopup } from '@/components/LoginPopup';
import { TTSPlayer } from '@/components/TTSPlayer';
import { countWords, calculateReadingTime } from '@/lib/tier-utils';
import { ReadingProgress } from '@/components/ReadingProgress';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Toast } from '@/components/Toast';

// Lazy load CommentSection
const CommentSection = dynamic(
  () => import('@/components/CommentSection').then(m => ({ default: m.CommentSection })),
  {
    loading: () => (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-bg-input rounded-xl animate-pulse" />
        ))}
      </div>
    ),
  }
);

// Lazy load DonateButton
const DonateButton = dynamic(
  () => import('@/components/DonatePopup').then(m => ({ default: m.DonateButton })),
  { ssr: false }
);

interface StoryReaderClientProps {
  story: any;
  chapters: any[];
  comments: any[];
}

export default function StoryReaderClient({ story: initialStory, chapters: initialChapters, comments: initialComments }: StoryReaderClientProps) {
  const { id } = useParams();
  const router = useRouter();
  const textSize = useStore((s) => s.textSize);
  const setTextSize = useStore((s) => s.setTextSize);
  const role = useStore((s) => s.role);
  const user = useStore((s) => s.user);
  const lang = useStore((s) => s.lang);

  const [showSettings, setShowSettings] = useState(false);
  const [activeParagraph, setActiveParagraph] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const story = initialStory;
  const [chapters, setChapters] = useState<any[]>(initialChapters);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [comments, setComments] = useState<any[]>(initialComments);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [zenMode, setZenMode] = useState(false);

  useEffect(() => {
    if (user?.id && id) {
      checkLiked(user.id, id as string).then(setLiked);
      checkSaved(user.id, id as string).then(setSaved);
      if (initialComments.length > 0) {
        getCommentLikes(user.id, initialComments.map((c: any) => c.id)).then(setLikedCommentIds);
      }
    }
  }, [user?.id, id]);

  const isAuthor = !!(user?.id && story?.author_id && user.id === story.author_id);

  const toggleZenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        setToastMessage('Gagal masuk zen mode');
        setShowToast(true);
      });
      setZenMode(true);
    } else {
      document.exitFullscreen();
      setZenMode(false);
    }
  };

  const handleLike = async () => {
    if (role === 'guest') { setLoginMessage('Log in to like this story.'); setShowLoginPopup(true); return; }
    try {
      const result = await toggleLike(user!.id, id as string);
      setLiked(result);
    } catch (err) {}
  };

  const handleSave = async () => {
    if (role === 'guest') { setLoginMessage('Log in to save this story.'); setShowLoginPopup(true); return; }
    try {
      const result = await toggleSave(user!.id, id as string);
      setSaved(result);
    } catch (err) {}
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: displayTitle, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setToastMessage('Link berhasil disalin!');
      setShowToast(true);
    }
  };

  const currentChapter = chapters[activeChapterIndex];
  const chapterContent = currentChapter
    ? (typeof currentChapter.content === 'string'
        ? currentChapter.content
        : typeof currentChapter.content === 'object' && currentChapter.content !== null
          ? JSON.stringify(currentChapter.content)
          : '')
    : null;

  const isHtml = (s: string) => s.trimStart().startsWith('<');

  const decodeContent = (raw: string): string => {
    if (!raw) return '';
    let text = raw;
    if (text.startsWith('"') && text.endsWith('"')) {
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'string') text = parsed;
      } catch {}
    }
    if (text.trimStart().startsWith('<')) {
      text = text.replace(/\\n/g, ' ').replace(/\n/g, ' ');
      return text;
    }
    text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return text;
  };

  const parsedContent = chapterContent ? decodeContent(chapterContent) : null;
  const wordCount = parsedContent ? countWords(parsedContent) : 0;
  const readingTime = calculateReadingTime(wordCount);

  const paragraphs = parsedContent && !isHtml(parsedContent)
    ? parsedContent.split('\n').filter((p: string) => p.trim()).filter((p: string) => !p.startsWith('# ')).filter((p: string) => !p.startsWith('---'))
        .map((text: string, i: number) => {
          const trimmed = text.trim();
          if (trimmed === '***' || trimmed === '* * *' || trimmed === '---') return { id: `p${i}`, text: '***', isSeparator: true };
          return { id: `p${i}`, text: trimmed, isSeparator: false };
        })
    : [];

  const formatParagraph = (text: string) => {
    let html = text;
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/__(.+?)__/g, '<u>$1</u>');
    return html;
  };

  const storyTitle = story?.title || 'Story';
  const displayTitle = chapters.length <= 1 ? storyTitle : (currentChapter?.title || 'Bagian 1');
  const displaySubtitle = chapters.length <= 1 ? `Bagian ${activeChapterIndex + 1}` : storyTitle;

  return (
    <>
      <ReadingProgress />
      <ScrollToTop />
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
      <div className="max-w-3xl mx-auto pb-32 px-2 sm:px-0">
      <div className="flex items-start justify-between mb-4 md:mb-8 pb-4 border-b border-border gap-2">
        <div className="flex items-start gap-2 md:gap-4 min-w-0">
          <Link href="/" className="p-1.5 md:p-2 hover:bg-bg-soft rounded-full transition shrink-0 mt-1">
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Link>
          <div className="min-w-0">
            <h2 className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{displaySubtitle}</h2>
            <h1 className="text-lg sm:text-xl md:text-4xl font-bold font-serif tracking-tight leading-tight mt-0.5 md:mt-1 line-clamp-2">{displayTitle}</h1>
            <div className="flex items-center gap-2 mt-1">
              {story?.profiles && (
                <Link href={`/profile/${story.profiles.username}`} className="text-xs md:text-sm text-gray-500 hover:text-accent transition-colors">
                  by {story.profiles.full_name || story.profiles.username}
                </Link>
              )}
              <span className="text-gray-300 dark:text-gray-700 text-xs">&bull;</span>
              <span className="text-[10px] md:text-xs text-gray-500">{readingTime} mnt baca</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
          {isAuthor && (
            <button onClick={() => router.push(`/write/${id}`)} className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-accent text-white text-[10px] md:text-xs font-medium hover:opacity-90 transition mr-0.5" title="Edit cerita ini">
              <Pencil className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}
          <button onClick={handleSave} className={`p-1.5 md:p-2 rounded-full transition ${saved ? 'bg-gray-100 text-accent dark:bg-gray-800/50' : 'hover:bg-bg-soft text-gray-500'}`} title={saved ? 'Saved' : 'Save to Library'}>
            <Bookmark className={`h-4 w-4 md:h-5 md:w-5 ${saved ? 'fill-current' : ''}`} />
          </button>
          <button onClick={handleShare} className="p-1.5 md:p-2 rounded-full hover:bg-bg-soft text-gray-500 transition" title="Bagikan Cerita">
            <Share2 className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 md:p-2 rounded-full hover:bg-bg-soft text-gray-500 transition">
            <Settings className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-8 p-6 bg-bg-soft/50 rounded-xl border border-border grid gap-6 transition-all">
          <div>
            <h3 className="text-sm font-semibold mb-3">Text Size: {textSize}px</h3>
            <input type="range" min="14" max="24" step="1" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} className="w-full accent-accent" />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <h3 className="text-sm font-semibold">Zen Mode (Fullscreen)</h3>
            <button onClick={toggleZenMode} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${zenMode ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft'}`}>
              {zenMode ? 'Nonaktif' : 'Aktif'}
            </button>
          </div>
        </div>
      )}

      {/* TTS Player */}
      <div className="mb-4 relative">
        <TTSPlayer text={parsedContent || paragraphs.map((p: any) => p.text).join(' ')} lang={lang as 'id' | 'en'} />
      </div>

      <article className="space-y-4 md:space-y-5 relative" style={{ fontSize: `${Math.max(14, textSize - 2)}px`, lineHeight: 1.8 }}>
        {parsedContent && isHtml(parsedContent) ? (
          <div className="tiptap-reader bg-bg px-2 md:px-4 py-3 rounded-lg text-sm md:text-base" style={{ fontSize: `${Math.max(14, textSize - 2)}px`, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: parsedContent }} />
        ) : (
          paragraphs.map((p: any) => (
            p.isSeparator ? (
              <div key={p.id} className="flex items-center justify-center py-4">
                <span className="text-tx-muted text-lg tracking-[0.5em]">***</span>
              </div>
            ) : (
              <div key={p.id} className="relative group">
                <p className="text-tx indent-8" dangerouslySetInnerHTML={{ __html: formatParagraph(p.text) }} />
                <button onClick={() => setActiveParagraph(p.id)} className={`absolute -right-1 md:-right-12 top-0 p-1 md:p-2 rounded-full transition-opacity ${activeParagraph === p.id ? 'opacity-100 bg-bg-input text-accent' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                  <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
              </div>
            )
          ))
        )}
      </article>

      {chapters.length > 1 && (
        <div className="mt-8 md:mt-12 flex items-center justify-between gap-2">
          <button onClick={() => setActiveChapterIndex(Math.max(0, activeChapterIndex - 1))} disabled={activeChapterIndex === 0} className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm rounded-full border border-border hover:bg-bg-soft disabled:opacity-30 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
          </button>
          <span className="text-xs md:text-sm text-gray-500">{activeChapterIndex + 1} / {chapters.length}</span>
          <button onClick={() => setActiveChapterIndex(Math.min(chapters.length - 1, activeChapterIndex + 1))} disabled={activeChapterIndex === chapters.length - 1} className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm rounded-full border border-border hover:bg-bg-soft disabled:opacity-30 transition-colors">
            <span className="hidden sm:inline">Next</span><span className="sm:hidden">Next</span> <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
        </div>
      )}

      <div className="mt-12 md:mt-16 pt-6 md:pt-8 border-t dark:border-gray-800 flex justify-center gap-4 md:gap-6">
        <button onClick={handleLike} className={`flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl transition ${liked ? 'text-red-500' : 'text-gray-500 hover:bg-bg-soft'}`}>
          <Heart className={`h-6 w-6 md:h-8 md:w-8 ${liked ? 'fill-current' : ''}`} />
          <span className="text-[10px] md:text-xs font-semibold">Like</span>
        </button>
        <button onClick={handleSave} className={`flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl transition ${saved ? 'text-accent' : 'text-gray-500 hover:bg-bg-soft'}`}>
          <Bookmark className={`h-6 w-6 md:h-8 md:w-8 ${saved ? 'fill-current' : ''}`} />
          <span className="text-[10px] md:text-xs font-semibold">Save</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl text-gray-500 hover:bg-bg-soft transition">
          <Share2 className="h-6 w-6 md:h-8 md:w-8" />
          <span className="text-xs font-semibold">Share</span>
        </button>
        <DonateButton authorName={story?.profiles?.full_name || story?.profiles?.username || 'Penulis'} links={story?.profiles?.donation_links || []} />
      </div>

      <div className="mt-12 space-y-4">
        <h3 className="text-xl font-bold font-serif flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> Comments ({comments.length})
        </h3>
        <CommentSection
          storyId={id as string}
          chapterId={chapters[activeChapterIndex]?.id || null}
          comments={comments}
          likedCommentIds={likedCommentIds}
          onCommentAdded={(c) => setComments([...comments, c])}
          onCommentDeleted={(cid) => setComments(comments.filter(c => c.id !== cid))}
          onCommentUpdated={(c) => setComments(comments.map(cm => cm.id === c.id ? c : cm))}
          authorId={story?.author_id}
        />
      </div>

      {activeParagraph && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-bg shadow-2xl border-l border-border z-50 flex flex-col">
          <div className="p-4 border-b border-border flex justify-between items-center bg-bg-input/50">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Paragraph Comments
            </h3>
            <button onClick={() => setActiveParagraph(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4 border-b border-border bg-gray-100/50 dark:bg-gray-800/30">
            <p className="text-sm italic text-tx-soft line-clamp-3">
              &quot;{paragraphs.find((p: any) => p.id === activeParagraph)?.text}&quot;
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-center text-sm text-gray-400 py-8">No paragraph comments yet.</p>
          </div>
          <div className="p-4 border-t border-border bg-bg">
            {role === 'guest' ? (
              <div className="text-center p-4 bg-bg-input rounded-lg">
                <p className="text-sm text-gray-500"><Link href="/login" className="text-accent hover:underline">Sign in</Link> to comment.</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" placeholder="Add a comment..." className="flex-1 bg-bg-input rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
                <button className="p-2 bg-accent text-white rounded-full hover:opacity-90 disabled:opacity-50 transition">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <LoginPopup show={showLoginPopup} onClose={() => setShowLoginPopup(false)} message={loginMessage} />
    </div>
    </>
  );
}
