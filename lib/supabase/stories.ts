import { supabase } from './client';

// Stories
export async function createStory(authorId: string, title: string, description: string, category: string, tags: string[], coverUrl?: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('stories').insert({
    author_id: authorId,
    title,
    description,
    category,
    tags,
    cover_url: coverUrl || null,
    status: 'draft'
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateStory(storyId: string, updates: Record<string, any>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('stories').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', storyId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStory(storyId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('stories').delete().eq('id', storyId);
  if (error) throw error;
}

export async function getStories(status?: string) {
  if (!supabase) return [];
  let query = supabase.from('stories').select('*, profiles!stories_author_id_fkey(username, full_name, avatar_url)');
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

/** Lightweight query for homepage — only columns needed for story cards */
export async function getHomepageStories(limit = 20) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, description, cover_url, category, tags, reads_count, likes_count, status, created_at, profiles!stories_author_id_fkey(username, full_name, avatar_url)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

/** Editorial picks — handpicked by editors, shown with special badge */
export async function getEditorialPicks(limit = 6) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, description, cover_url, category, tags, reads_count, likes_count, status, profiles!stories_author_id_fkey(username, full_name, avatar_url)')
    .eq('status', 'published')
    .eq('is_editorial_pick', true)
    .order('reads_count', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

/** Top series this month — stories updated this month, sorted by reads */
export async function getTopMonthly(limit = 10) {
  if (!supabase) return [];
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, description, cover_url, category, tags, reads_count, likes_count, status, profiles!stories_author_id_fkey(username, full_name, avatar_url)')
    .eq('status', 'published')
    .gte('updated_at', firstDay)
    .order('reads_count', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

/** Completed series — stories marked as finished */
export async function getCompletedStories(limit = 10) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, description, cover_url, category, tags, reads_count, likes_count, status, profiles!stories_author_id_fkey(username, full_name, avatar_url)')
    .eq('status', 'published')
    .eq('is_completed', true)
    .order('reads_count', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

/** Stories by category — for genre sections on homepage */
export async function getStoriesByCategory(category: string, limit = 15) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, description, cover_url, category, tags, reads_count, likes_count, status, profiles!stories_author_id_fkey(username, full_name, avatar_url)')
    .eq('status', 'published')
    .eq('category', category)
    .order('reads_count', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function getMyStories(authorId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('stories').select('*').eq('author_id', authorId).order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function getStoryById(storyId: string) {
  if (!supabase) return null;
  // Try with donation_links first, fallback without
  let { data, error } = await supabase.from('stories').select('*, profiles!stories_author_id_fkey(username, full_name, avatar_url, donation_links)').eq('id', storyId).single();
  if (error && error.message.includes('donation_links')) {
    const res = await supabase.from('stories').select('*, profiles!stories_author_id_fkey(username, full_name, avatar_url)').eq('id', storyId).single();
    data = res.data;
    error = res.error;
  }
  if (error) return null;
  // Increment reads count
  supabase.from('stories').update({ reads_count: (data.reads_count || 0) + 1 }).eq('id', storyId).then(() => {});
  return data;
}

// Get user stories (public)
export async function getUserStories(userId: string) {
  if (!supabase) return [];
  const { data } = await supabase.from('stories').select('*').eq('author_id', userId).eq('status', 'published').order('created_at', { ascending: false });
  return data || [];
}

// Likes / Votes
export async function toggleLike(userId: string, storyId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: rows, error } = await supabase.from('votes').select('user_id').eq('user_id', userId).eq('story_id', storyId).limit(1);
  if (error) { console.error('toggleLike check error:', error.message); }
  const existing = rows && rows.length > 0;
  if (existing) {
    await supabase.from('votes').delete().eq('user_id', userId).eq('story_id', storyId);
    const { data: story } = await supabase.from('stories').select('likes_count').eq('id', storyId).single();
    await supabase.from('stories').update({ likes_count: Math.max(0, (story?.likes_count || 1) - 1) }).eq('id', storyId);
    return false;
  } else {
    await supabase.from('votes').insert({ user_id: userId, story_id: storyId });
    const { data: story } = await supabase.from('stories').select('likes_count').eq('id', storyId).single();
    await supabase.from('stories').update({ likes_count: (story?.likes_count || 0) + 1 }).eq('id', storyId);
    return true;
  }
}

export async function isLiked(userId: string, storyId: string) {
  if (!supabase) return false;
  const { data: rows, error } = await supabase.from('votes').select('user_id').eq('user_id', userId).eq('story_id', storyId).limit(1);
  if (error) { console.error('isLiked error:', error.message); return false; }
  return !!(rows && rows.length > 0);
}
