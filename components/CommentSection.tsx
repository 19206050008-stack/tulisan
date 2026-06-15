'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { createComment, updateComment, deleteComment, toggleCommentLike, createReport, createNotification } from '@/lib/supabase';
import { Heart, Reply, Edit, Trash2, Flag, Send, X, MoreHorizontal } from 'lucide-react';
import { RichEditor, RichContent } from '@/components/RichEditor';

interface Comment {
  id: string;
  user_id: string;
  story_id: string;
  chapter_id: string | null;
  parent_id: string | null;
  paragraph_id: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  profiles: { username: string; full_name: string; avatar_url: string | null };
}

interface CommentSectionProps {
  storyId: string;
  chapterId?: string | null;
  comments: Comment[];
  likedCommentIds: string[];
  onCommentAdded: (comment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
  onCommentUpdated: (comment: Comment) => void;
  authorId?: string;
}

export function CommentSection({ storyId, chapterId, comments, likedCommentIds, onCommentAdded, onCommentDeleted, onCommentUpdated, authorId }: CommentSectionProps) {
  const { user, role } = useStore();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [likedIds, setLikedIds] = useState<string[]>(likedCommentIds);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const topLevel = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const handleSubmit = async () => {
    if (!text.trim() || role === 'guest') return;
    setSending(true);
    try {
      const comment = await createComment(user.id, storyId, chapterId || null, text);
      onCommentAdded(comment);
      setText('');
      if (authorId && authorId !== user.id) {
        await createNotification(authorId, 'comment', user.id, storyId, comment.id);
      }
    } catch {}
    setSending(false);
  };

  const handleReply = async (parentId: string) => {
    if (!replyText.trim() || role === 'guest') return;
    setSending(true);
    try {
      const comment = await createComment(user.id, storyId, chapterId || null, replyText, parentId);
      onCommentAdded(comment);
      setReplyText('');
      setReplyTo(null);
      const parent = comments.find(c => c.id === parentId);
      if (parent && parent.user_id !== user.id) {
        await createNotification(parent.user_id, 'reply', user.id, storyId, comment.id);
      }
    } catch {}
    setSending(false);
  };

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      const updated = await updateComment(commentId, editText);
      onCommentUpdated(updated);
      setEditId(null);
      setEditText('');
    } catch {}
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await deleteComment(commentId);
      onCommentDeleted(commentId);
    } catch {}
  };

  const handleLike = async (commentId: string) => {
    if (role === 'guest') return;
    const liked = await toggleCommentLike(user.id, commentId);
    if (liked) {
      setLikedIds([...likedIds, commentId]);
    } else {
      setLikedIds(likedIds.filter(id => id !== commentId));
    }
  };

  const handleReport = async (commentId: string) => {
    if (role === 'guest') return;
    const reason = prompt('Why are you reporting this comment?');
    if (!reason) return;
    try {
      await createReport(user.id, reason, storyId, commentId);
      alert('Report submitted. Thank you.');
    } catch {}
    setMenuOpen(null);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwn = user?.id === comment.user_id;
    const isLiked = likedIds.includes(comment.id);
    const replies = getReplies(comment.id);

    return (
      <div key={comment.id} className={`${isReply ? 'ml-10 mt-3' : 'mt-4'}`}>
        <div className="flex gap-3">
          <Link href={`/profile/${comment.profiles?.username}`} className="shrink-0">
            {comment.profiles?.avatar_url ? (
              <img src={comment.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-muted dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
                {(comment.profiles?.full_name || comment.profiles?.username || 'U')[0].toUpperCase()}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            {editId === comment.id ? (
              <div className="space-y-2">
                <RichEditor
                  value={editText}
                  onChange={setEditText}
                  placeholder="Edit komentarmu..."
                  minHeight={80}
                  showWordCount={false}
                  mode="comment"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(comment.id)} className="px-3 py-1 text-xs rounded-full bg-accent text-white hover:opacity-90">Simpan</button>
                  <button onClick={() => setEditId(null)} className="px-3 py-1 text-xs rounded-full border border-subtle dark:border-gray-700 hover:bg-brand-muted">Batal</button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-brand-muted dark:bg-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-none">
                  <div className="flex items-center gap-2">
                    <Link href={`/profile/${comment.profiles?.username}`} className="text-xs font-bold hover:text-accent transition-colors">
                      {comment.profiles?.full_name || comment.profiles?.username}
                    </Link>
                    <span className="text-[10px] text-gray-400">{formatTime(comment.created_at)}</span>
                  </div>
                  <RichContent html={comment.content} className="text-sm mt-1 text-gray-800 dark:text-gray-200" />
                </div>
                <div className="flex items-center gap-4 mt-1.5 ml-2">
                  <button onClick={() => handleLike(comment.id)} className={`flex items-center gap-1 text-xs transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                    <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
                    {(comment.likes_count || 0) + (isLiked && !likedCommentIds.includes(comment.id) ? 1 : !isLiked && likedCommentIds.includes(comment.id) ? -1 : 0) > 0 && (
                      <span>{(comment.likes_count || 0) + (isLiked && !likedCommentIds.includes(comment.id) ? 1 : !isLiked && likedCommentIds.includes(comment.id) ? -1 : 0)}</span>
                    )}
                  </button>
                  {role !== 'guest' && (
                    <button onClick={() => { setReplyTo(comment.id); setReplyText(''); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-accent transition-colors">
                      <Reply className="h-3.5 w-3.5" /> Reply
                    </button>
                  )}
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === comment.id ? null : comment.id)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {menuOpen === comment.id && (
                      <div className="absolute left-0 mt-1 w-32 bg-brand-bg dark:bg-gray-800 rounded-lg shadow-xl border border-subtle dark:border-gray-700 py-1 z-10">
                        {isOwn && (
                          <>
                            <button onClick={() => { setEditId(comment.id); setEditText(comment.content); setMenuOpen(null); }} className="flex items-center gap-2 px-3 py-1.5 text-xs w-full text-left hover:bg-brand-muted dark:hover:bg-gray-700">
                              <Edit className="h-3 w-3" /> Edit
                            </button>
                            <button onClick={() => { handleDelete(comment.id); setMenuOpen(null); }} className="flex items-center gap-2 px-3 py-1.5 text-xs w-full text-left text-red-600 hover:bg-brand-muted dark:hover:bg-gray-700">
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </>
                        )}
                        {!isOwn && role !== 'guest' && (
                          <button onClick={() => handleReport(comment.id)} className="flex items-center gap-2 px-3 py-1.5 text-xs w-full text-left text-yellow-600 hover:bg-brand-muted dark:hover:bg-gray-700">
                            <Flag className="h-3 w-3" /> Report
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {replyTo === comment.id && (
              <div className="mt-2 ml-2 space-y-2">
                <RichEditor
                  value={replyText}
                  onChange={setReplyText}
                  placeholder={`Balas ${comment.profiles?.full_name || comment.profiles?.username}...`}
                  minHeight={80}
                  showWordCount={false}
                  mode="comment"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleReply(comment.id)} disabled={!replyText.trim() || sending} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-accent text-white hover:opacity-90 disabled:opacity-50">
                    <Send className="h-3 w-3" /> Kirim Balasan
                  </button>
                  <button onClick={() => setReplyTo(null)} className="p-1.5 text-gray-400 hover:text-gray-600 transition">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {replies.map(r => renderComment(r, true))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {role !== 'guest' ? (
        <div className="space-y-2">
          <RichEditor
            value={text}
            onChange={setText}
            placeholder="Tulis komentar..."
            minHeight={80}
            showWordCount={false}
            mode="comment"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || sending}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-white rounded-full hover:opacity-90 disabled:opacity-50 transition"
            >
              <Send className="h-3.5 w-3.5" /> {sending ? 'Mengirim...' : 'Kirim Komentar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-brand-muted dark:bg-gray-800 rounded-xl text-center">
          <p className="text-sm text-gray-500">
            <Link href="/login" className="text-accent hover:underline">Sign in</Link> to leave a comment.
          </p>
        </div>
      )}

      <div>
        {topLevel.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No comments yet. Be the first!</p>
        ) : (
          topLevel.map(c => renderComment(c))
        )}
      </div>
    </div>
  );
}
