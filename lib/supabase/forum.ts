import { supabase } from './client';
import { getCurrentUser } from './auth';

export async function getForumCategories() {
  if (!supabase) return [];
  const { data } = await supabase.from('forum_categories').select('*').eq('active', true).order('sort_order', { ascending: true });
  return data || [];
}

export async function getForumThreads(categorySlug?: string, page = 1, perPage = 20) {
  if (!supabase) return { threads: [], count: 0 };
  let query = supabase.from('forum_threads').select('*, author:profiles!forum_threads_author_id_fkey(username, full_name, avatar_url, frame_id), forum_categories(name, name_en, slug)', { count: 'exact' });
  if (categorySlug) query = query.eq('forum_categories.slug', categorySlug);
  const from = (page - 1) * perPage;
  query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).range(from, from + perPage - 1);
  const { data, error, count } = await query;
  if (error) return { threads: [], count: 0 };
  return { threads: data || [], count: count || 0 };
}

export async function getForumThread(threadId: string) {
  if (!supabase) return null;
  const { data } = await supabase.from('forum_threads').select('*, author:profiles!forum_threads_author_id_fkey(username, full_name, avatar_url, frame_id), forum_categories(name, name_en, slug)').eq('id', threadId).single();
  if (data) {
    supabase.from('forum_threads').update({ views_count: (data.views_count || 0) + 1 }).eq('id', threadId).then(() => {});
  }
  return data;
}

export async function createForumThread(categoryId: string, title: string, content: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('forum_threads').insert({
    category_id: categoryId,
    author_id: user.id,
    title,
    content
  }).select('*, author:profiles!forum_threads_author_id_fkey(username, full_name, avatar_url, frame_id)').single();
  if (error) throw error;
  return data;
}

export async function deleteForumThread(threadId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('forum_threads').delete().eq('id', threadId);
  if (error) throw error;
}

export async function getForumPosts(threadId: string, page = 1, perPage = 20) {
  if (!supabase) return { posts: [], count: 0 };
  const from = (page - 1) * perPage;
  const { data, error, count } = await supabase
    .from('forum_posts')
    .select('*, author:profiles!forum_posts_author_id_fkey(username, full_name, avatar_url, frame_id)', { count: 'exact' })
    .eq('thread_id', threadId)
    .is('parent_id', null)
    .order('created_at', { ascending: true })
    .range(from, from + perPage - 1);
  if (error) return { posts: [], count: 0 };
  return { posts: data || [], count: count || 0 };
}

export async function getForumReplies(postId: string) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('forum_posts')
    .select('*, author:profiles!forum_posts_author_id_fkey(username, full_name, avatar_url, frame_id)')
    .eq('parent_id', postId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function createForumPost(threadId: string, content: string, parentId?: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('forum_posts').insert({
    thread_id: threadId,
    author_id: user.id,
    content,
    parent_id: parentId || null
  }).select('*, author:profiles!forum_posts_author_id_fkey(username, full_name, avatar_url, frame_id)').single();
  if (error) throw error;
  // Update thread replies count and last_reply_at
  await supabase.from('forum_threads').update({ last_reply_at: new Date().toISOString() }).eq('id', threadId);
  return data;
}

export async function deleteForumPost(postId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('forum_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function voteForumThread(threadId: string, value: 1 | -1) {
  if (!supabase) throw new Error('Supabase not configured');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  // Check existing vote
  const { data: existing } = await supabase.from('forum_votes').select('*').eq('user_id', user.id).eq('thread_id', threadId).is('post_id', null).single();
  if (existing) {
    if (existing.value === value) {
      // Remove vote (toggle off)
      await supabase.from('forum_votes').delete().eq('id', existing.id);
      return 0;
    } else {
      // Change vote
      await supabase.from('forum_votes').update({ value }).eq('id', existing.id);
      return value;
    }
  } else {
    await supabase.from('forum_votes').insert({ user_id: user.id, thread_id: threadId, value });
    return value;
  }
}

export async function voteForumPost(postId: string, value: 1 | -1) {
  if (!supabase) throw new Error('Supabase not configured');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { data: existing } = await supabase.from('forum_votes').select('*').eq('user_id', user.id).eq('post_id', postId).is('thread_id', null).single();
  if (existing) {
    if (existing.value === value) {
      await supabase.from('forum_votes').delete().eq('id', existing.id);
      return 0;
    } else {
      await supabase.from('forum_votes').update({ value }).eq('id', existing.id);
      return value;
    }
  } else {
    await supabase.from('forum_votes').insert({ user_id: user.id, post_id: postId, value });
    return value;
  }
}

export async function getUserForumVoteThreads(threadIds: string[]) {
  if (!supabase || threadIds.length === 0) return [];
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await supabase.from('forum_votes').select('thread_id, value').eq('user_id', user.id).in('thread_id', threadIds).is('post_id', null);
  return data || [];
}
