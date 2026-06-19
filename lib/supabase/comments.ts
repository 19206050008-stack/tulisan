import { supabase } from './client';

export async function createComment(userId: string, storyId: string, chapterId: string | null, content: string, parentId?: string, paragraphId?: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('comments').insert({
    user_id: userId,
    story_id: storyId,
    chapter_id: chapterId,
    content,
    parent_id: parentId || null,
    paragraph_id: paragraphId || null
  }).select('*, profiles!comments_user_id_fkey(username, full_name, avatar_url)').single();
  if (error) throw error;
  return data;
}

export async function getComments(storyId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('comments').select('*, profiles!comments_user_id_fkey(username, full_name, avatar_url, frame_id)').eq('story_id', storyId).order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function updateComment(commentId: string, content: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('comments').update({ content }).eq('id', commentId).select('*, profiles!comments_user_id_fkey(username, full_name, avatar_url, frame_id)').single();
  if (error) throw error;
  return data;
}

export async function deleteComment(commentId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function toggleCommentLike(userId: string, commentId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: existing } = await supabase.from('comment_likes').select('*').eq('user_id', userId).eq('comment_id', commentId).single();
  if (existing) {
    await supabase.from('comment_likes').delete().eq('user_id', userId).eq('comment_id', commentId);
    try { await supabase.rpc('decrement_comment_likes', { cid: commentId }); } catch {}
    return false;
  } else {
    await supabase.from('comment_likes').insert({ user_id: userId, comment_id: commentId });
    try { await supabase.rpc('increment_comment_likes', { cid: commentId }); } catch {}
    return true;
  }
}

export async function getCommentLikes(userId: string, commentIds: string[]) {
  if (!supabase || commentIds.length === 0) return [];
  const { data } = await supabase.from('comment_likes').select('comment_id').eq('user_id', userId).in('comment_id', commentIds);
  return data?.map(d => d.comment_id) || [];
}

export async function getRecentComments(limit = 5) {
  if (!supabase) return [];
  const { data } = await supabase.from('comments').select('*, profiles!comments_user_id_fkey(username, full_name, avatar_url, frame_id), stories!comments_story_id_fkey(id, title)').order('created_at', { ascending: false }).limit(limit);
  return data || [];
}
