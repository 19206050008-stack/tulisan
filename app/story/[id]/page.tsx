'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getStoryById, getChapters, getComments, toggleLike, isLiked as checkLiked, toggleSave, isSaved as checkSaved, getCommentLikes } from '@/lib/supabase';
import { Share2, Heart, MessageCircle, Bookmark, Settings, X, ChevronLeft, ChevronRight, Send, Pencil } from 'lucide-react';
import Link from 'next/link';
import { CommentSection } from '@/components/CommentSection';
import { LoginPopup } from '@/components/LoginPopup';
import { DonateButton } from '@/components/DonatePopup';
import { countWords, calculateReadingTime } from '@/lib/tier-utils';
import { ReadingProgress } from '@/components/ReadingProgress';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Toast } from '@/components/Toast';

export default function ReaderPage() {
  const { id } = useParams();
  const router = useRouter();
  const { textSize, setTextSize, role, user } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [activeParagraph, setActiveParagraph] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [story, setStory] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [zenMode, setZenMode] = useState(false);

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

  useEffect(() => {
    loadStory();
  }, [id]);

  useEffect(() => {
    if (user?.id && id) {
      checkLiked(user.id, id as string).then(setLiked);
      checkSaved(user.id, id as string).then(setSaved);
    }
  }, [user?.id, id]);

  // Computed — re-evaluate tiap render, tidak perlu state tambahan
  const isAuthor = !!(user?.id && story?.author_id && user.id === story.author_id);

  const loadStory = async () => {
    setLoading(true);
    const s = await getStoryById(id as string);
    if (s) {
      setStory(s);
      const chs = await getChapters(s.id);
      setChapters(chs);
      const cmts = await getComments(s.id);
      setComments(cmts);
      if (user?.id && cmts.length > 0) {
        const liked = await getCommentLikes(user.id, cmts.map((c: any) => c.id));
        setLikedCommentIds(liked);
      }
    }
    setLoading(false);
  };

  const handleLike = async () => {
    if (role === 'guest') { setLoginMessage('Log in to like this story.'); setShowLoginPopup(true); return; }
    try {
      const result = await toggleLike(user.id, id as string);
      setLiked(result);
    } catch (err) {
      // Silently handle like errors
    }
  };

  const handleSave = async () => {
    if (role === 'guest') { setLoginMessage('Log in to save this story.'); setShowLoginPopup(true); return; }
    try {
      const result = await toggleSave(user.id, id as string);
      setSaved(result);
    } catch (err) {
      // Silently handle save errors
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: displayTitle, url });
      } catch {}
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

  // Deteksi apakah konten adalah HTML (dari TipTap) atau plain text lama
  const isHtml = (s: string) => s.trimStart().startsWith('<');

  // Decode konten dari database (handle double-JSON-encoded string)
  const decodeContent = (raw: string): string => {
    if (!raw) return '';
    let text = raw;
    
    // Handle "\"teks...\"" — JSON string dalam JSON string
    if (text.startsWith('"') && text.endsWith('"')) {
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'string') text = parsed;
      } catch {}
    }
    
    // Untuk HTML content, bersihkan karakter \n yang mungkin tersisa
    if (text.trimStart().startsWith('<')) {
      // Replace literal \n dan \\n dengan spasi atau hapus (karena HTML sudah punya <p>, <br>)
      text = text.replace(/\\n/g, ' ').replace(/\n/g, ' ');
      return text;
    }
    
    // Untuk plain text, convert escape sequences
    text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return text;
  };

  const parsedContent = chapterContent ? decodeContent(chapterContent) : null;
  const wordCount = parsedContent ? countWords(parsedContent) : 0;
  const readingTime = calculateReadingTime(wordCount);

  // Paragraf hanya dipakai untuk konten lama (non-HTML)
  const paragraphs = parsedContent && !isHtml(parsedContent)
    ? parsedContent
        .split('\n')
        .filter((p: string) => p.trim())
        .filter((p: string) => !p.startsWith('# '))
        .filter((p: string) => !p.startsWith('---'))
        .map((text: string, i: number) => {
          const trimmed = text.trim();
          if (trimmed === '***' || trimmed === '* * *' || trimmed === '---') {
            return { id: `p${i}`, text: '***', isSeparator: true };
          }
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

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  return (
    <>
      <ReadingProgress />
      <ScrollToTop />
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
      <div className="max-w-3xl mx-auto pb-32 px-2 sm:px-0">
      <div className="flex items-center justify-between mb-6 md:mb-8 pb-4 border-b border-border">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Link href="/" className="p-2 hover:bg-bg-soft rounded-full transition shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{displaySubtitle}</h2>
            <h1 className="text-2xl md:text-4xl font-bold font-serif tracking-tight leading-tight mt-1 line-clamp-2">{displayTitle}</h1>
            <div className="flex items-center gap-2 mt-1">
              {story?.profiles && (
                <Link href={`/profile/${story.profiles.username}`} className="text-sm text-gray-500 hover:text-accent transition-colors">
                  by {story.profiles.full_name || story.profiles.username}
                </Link>
              )}
              <span className="text-gray-300 dark:text-gray-700 text-xs">•</span>
              <span className="text-xs text-gray-500">{readingTime} mnt baca</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          {/* Tombol Edit — hanya untuk penulis cerita */}
          {isAuthor && (
            <button
              onClick={() => router.push(`/write/${id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:opacity-90 transition mr-1"
              title="Edit cerita ini"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}
          <button
            onClick={handleSave}
            className={`p-2 rounded-full transition ${saved ? 'bg-gray-100 text-accent dark:bg-gray-800/50' : 'hover:bg-bg-soft text-gray-500'}`}
            title={saved ? 'Saved' : 'Save to Library'}
          >
            <Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-bg-soft text-gray-500 transition"
            title="Bagikan Cerita"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-bg-soft text-gray-500 transition"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-8 p-6 bg-bg-soft/50 rounded-xl border border-border grid gap-6 transition-all">
          <div>
            <h3 className="text-sm font-semibold mb-3">Text Size: {textSize}px</h3>
            <input 
              type="range" min="14" max="24" step="1" 
              value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <h3 className="text-sm font-semibold">Zen Mode (Fullscreen)</h3>
            <button 
              onClick={toggleZenMode} 
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${zenMode ? 'bg-accent text-white' : 'bg-bg-input text-tx-soft'}`}
            >
              {zenMode ? 'Nonaktif' : 'Aktif'}
            </button>
          </div>
        </div>
      )}

      <article className="space-y-5 relative" style={{ fontSize: `${textSize}px`, lineHeight: 1.9 }}>
        {parsedContent && isHtml(parsedContent) ? (
          <div
            className="tiptap-reader bg-bg px-4 py-3 rounded-lg"
            style={{ fontSize: `${textSize}px`, lineHeight: 1.9 }}
            dangerouslySetInnerHTML={{ __html: parsedContent }}
          />
        ) : (
          // Konten lama (markdown/plain text) — render paragraf seperti sebelumnya
          paragraphs.map((p: any) => (
            p.isSeparator ? (
              <div key={p.id} className="flex items-center justify-center py-4">
                <span className="text-tx-muted text-lg tracking-[0.5em]">***</span>
              </div>
            ) : (
              <div key={p.id} className="relative group">
                <p className="text-tx indent-8" dangerouslySetInnerHTML={{ __html: formatParagraph(p.text) }} />
                <button
                  onClick={() => setActiveParagraph(p.id)}
                  className={`absolute -right-2 md:-right-12 top-0 p-1.5 md:p-2 rounded-full transition-opacity ${activeParagraph === p.id ? 'opacity-100 bg-bg-input text-accent' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
              </div>
            )
          ))
        )}
      </article>

      {chapters.length > 1 && (
        <div className="mt-12 flex items-center justify-between">
          <button
            onClick={() => setActiveChapterIndex(Math.max(0, activeChapterIndex - 1))}
            disabled={activeChapterIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-full border border-border hover:bg-bg-soft disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-gray-500">{activeChapterIndex + 1} / {chapters.length}</span>
          <button
            onClick={() => setActiveChapterIndex(Math.min(chapters.length - 1, activeChapterIndex + 1))}
            disabled={activeChapterIndex === chapters.length - 1}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-full border border-border hover:bg-bg-soft disabled:opacity-30 transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-16 pt-8 border-t dark:border-gray-800 flex justify-center gap-6">
        <button 
          onClick={handleLike}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl transition ${liked ? 'text-red-500' : 'text-gray-500 hover:bg-bg-soft'}`}
        >
          <Heart className={`h-8 w-8 ${liked ? 'fill-current' : ''}`} />
          <span className="text-xs font-semibold">Like</span>
        </button>
        <button
          onClick={handleSave}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl transition ${saved ? 'text-accent' : 'text-gray-500 hover:bg-bg-soft'}`}
        >
          <Bookmark className={`h-8 w-8 ${saved ? 'fill-current' : ''}`} />
          <span className="text-xs font-semibold">Save</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-2 p-4 rounded-xl text-gray-500 hover:bg-bg-soft transition">
          <Share2 className="h-8 w-8" />
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
                <input 
                  type="text" 
                  placeholder="Add a comment..."
                  className="flex-1 bg-bg-input rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
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
