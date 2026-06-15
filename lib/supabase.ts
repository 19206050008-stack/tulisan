import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl.startsWith('http') && supabaseKey && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY') 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const isSupabaseConfigured = () => supabase !== null;

export async function signUp(email: string, password: string, username: string, fullName: string) {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, full_name: fullName }
    }
  });
  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username,
      full_name: fullName,
      role: 'user'
    });
    if (profileError) throw profileError;
  }

  return data;
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

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

// Chapters
export async function createChapter(storyId: string, title: string, content: any, chapterNumber: number) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('chapters').insert({
    story_id: storyId,
    title,
    content,
    chapter_number: chapterNumber,
    status: 'draft'
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateChapter(chapterId: string, updates: Record<string, any>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('chapters').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', chapterId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteChapter(chapterId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('chapters').delete().eq('id', chapterId);
  if (error) throw error;
}

export async function getChapters(storyId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('chapters').select('*').eq('story_id', storyId).order('chapter_number', { ascending: true });
  if (error) return [];
  return data || [];
}

// Comments
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
  const { data, error } = await supabase.from('comments').select('*, profiles!comments_user_id_fkey(username, full_name, avatar_url)').eq('story_id', storyId).order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function updateComment(commentId: string, content: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('comments').update({ content }).eq('id', commentId).select('*, profiles!comments_user_id_fkey(username, full_name, avatar_url)').single();
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
    await supabase.rpc('decrement_comment_likes', { cid: commentId }).catch(() => {});
    return false;
  } else {
    await supabase.from('comment_likes').insert({ user_id: userId, comment_id: commentId });
    await supabase.rpc('increment_comment_likes', { cid: commentId }).catch(() => {});
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
  const { data } = await supabase.from('comments').select('*, profiles!comments_user_id_fkey(username, full_name, avatar_url), stories!comments_story_id_fkey(id, title)').order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

// Likes / Votes
export async function toggleLike(userId: string, storyId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: existing } = await supabase.from('votes').select('*').eq('user_id', userId).eq('story_id', storyId).single();
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
  const { data } = await supabase.from('votes').select('*').eq('user_id', userId).eq('story_id', storyId).single();
  return !!data;
}

// Library / Saves
export async function toggleSave(userId: string, storyId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: existing } = await supabase.from('library_saves').select('*').eq('user_id', userId).eq('story_id', storyId).single();
  if (existing) {
    await supabase.from('library_saves').delete().eq('user_id', userId).eq('story_id', storyId);
    return false;
  } else {
    await supabase.from('library_saves').insert({ user_id: userId, story_id: storyId });
    return true;
  }
}

export async function isSaved(userId: string, storyId: string) {
  if (!supabase) return false;
  const { data } = await supabase.from('library_saves').select('*').eq('user_id', userId).eq('story_id', storyId).single();
  return !!data;
}

export async function getSavedStories(userId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('library_saves').select('*, stories(*, profiles!stories_author_id_fkey(username, full_name))').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// Upload cover image
export async function uploadCover(file: File, storyId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const ext = file.name.split('.').pop();
  const path = `${storyId}.${ext}`;
  const { data, error } = await supabase.storage.from('covers').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path);
  return urlData.publicUrl;
}

// Upload avatar
export async function uploadAvatar(file: File, userId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const ext = file.name.split('.').pop();
  const path = `${userId}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  return urlData.publicUrl;
}

// Update profile
export async function updateProfile(userId: string, updates: Record<string, any>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

// Get profile by username
export async function getProfileByUsername(username: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('username', username).single();
  if (error) return null;
  return data;
}

// Get user stories (public)
export async function getUserStories(userId: string) {
  if (!supabase) return [];
  const { data } = await supabase.from('stories').select('*').eq('author_id', userId).eq('status', 'published').order('created_at', { ascending: false });
  return data || [];
}

// Follows
export async function followUser(followerId: string, followingId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId });
  if (error) throw error;
}

export async function unfollowUser(followerId: string, followingId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
  if (error) throw error;
}

export async function isFollowing(followerId: string, followingId: string) {
  if (!supabase) return false;
  const { data } = await supabase.from('follows').select('*').eq('follower_id', followerId).eq('following_id', followingId).single();
  return !!data;
}

export async function getFollowerCount(userId: string) {
  if (!supabase) return 0;
  const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId);
  return count || 0;
}

export async function getFollowingCount(userId: string) {
  if (!supabase) return 0;
  const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId);
  return count || 0;
}

// Reading Lists
export async function createReadingList(userId: string, name: string, description?: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('reading_lists').insert({ user_id: userId, name, description }).select().single();
  if (error) throw error;
  return data;
}

export async function getReadingLists(userId: string) {
  if (!supabase) return [];
  const { data } = await supabase.from('reading_lists').select('*, reading_list_items(story_id, stories(title, cover_url))').eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
}

export async function addToReadingList(listId: string, storyId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('reading_list_items').insert({ list_id: listId, story_id: storyId });
  if (error) throw error;
}

export async function removeFromReadingList(listId: string, storyId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('reading_list_items').delete().eq('list_id', listId).eq('story_id', storyId);
  if (error) throw error;
}

export async function deleteReadingList(listId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('reading_lists').delete().eq('id', listId);
  if (error) throw error;
}

// Notifications
export async function getNotifications(userId: string) {
  if (!supabase) return [];
  const { data } = await supabase.from('notifications').select('*, actor:profiles!notifications_actor_id_fkey(username, full_name, avatar_url), stories(title)').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  return data || [];
}

export async function markNotificationsRead(userId: string) {
  if (!supabase) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function createNotification(userId: string, type: string, actorId: string, storyId?: string, commentId?: string) {
  if (!supabase) return;
  if (userId === actorId) return;
  await supabase.from('notifications').insert({ user_id: userId, type, actor_id: actorId, story_id: storyId || null, comment_id: commentId || null });
}

// Site Config
export async function getSiteConfig(key: string) {
  if (!supabase) return null;
  const { data } = await supabase.from('site_config').select('value').eq('key', key).single();
  return data?.value || null;
}

export async function setSiteConfig(key: string, value: any) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('site_config').upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function getAllSiteConfig() {
  if (!supabase) return {};
  const { data } = await supabase.from('site_config').select('*');
  const config: Record<string, any> = {};
  data?.forEach(item => { config[item.key] = item.value; });
  return config;
}

// Featured Slides
export async function getFeaturedSlides() {
  if (!supabase) return [];
  // First try admin-configured slides
  const { data } = await supabase.from('featured_slides').select('*, stories(title, profiles!stories_author_id_fkey(username, full_name))').eq('active', true).order('sort_order', { ascending: true });
  if (data && data.length > 0) return data;
  // Fallback: auto-pick top stories by reads
  const { data: topStories } = await supabase.from('stories').select('id, title, description, cover_url, category, reads_count, profiles!stories_author_id_fkey(username, full_name)').eq('status', 'published').order('reads_count', { ascending: false }).limit(5);
  if (!topStories) return [];
  return topStories.map((s, i) => ({
    id: s.id,
    story_id: s.id,
    title: s.title,
    subtitle: truncateAtWord(s.description || '', 80),
    image_url: s.cover_url,
    badge: i === 0 ? 'Most Popular' : 'Trending',
    category: s.category,
    stories: { title: s.title, profiles: s.profiles }
  }));
}

function truncateAtWord(text: string, max: number) {
  if (!text || text.length <= max) return text;
  const trimmed = text.substring(0, max);
  const lastSpace = trimmed.lastIndexOf(' ');
  return (lastSpace > 0 ? trimmed.substring(0, lastSpace) : trimmed) + '...';
}

export async function getAllFeaturedSlides() {
  if (!supabase) return [];
  const { data } = await supabase.from('featured_slides').select('*, stories(title, profiles!stories_author_id_fkey(username, full_name))').order('sort_order', { ascending: true });
  return data || [];
}

export async function createFeaturedSlide(slide: { story_id?: string; title: string; subtitle?: string; image_url?: string; badge?: string; sort_order?: number }) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('featured_slides').insert(slide).select().single();
  if (error) throw error;
  return data;
}

export async function updateFeaturedSlide(id: string, updates: Record<string, any>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('featured_slides').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteFeaturedSlide(id: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('featured_slides').delete().eq('id', id);
  if (error) throw error;
}

// Categories
export async function getCategories() {
  if (!supabase) return [];
  const { data } = await supabase.from('categories').select('*').eq('active', true).order('sort_order', { ascending: true });
  return data || [];
}

export async function getAllCategories() {
  if (!supabase) return [];
  const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
  return data || [];
}

export async function createCategory(name: string, slug: string, description?: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('categories').insert({ name, slug, description }).select().single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: Record<string, any>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('categories').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(id: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// Reports
export async function createReport(reporterId: string, reason: string, storyId?: string, commentId?: string, userId?: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('reports').insert({ reporter_id: reporterId, reason, story_id: storyId || null, comment_id: commentId || null, user_id: userId || null });
  if (error) throw error;
}

export async function getReports() {
  if (!supabase) return [];
  const { data } = await supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(username, full_name), stories(title), reported_user:profiles!reports_user_id_fkey(username, full_name)').order('created_at', { ascending: false });
  return data || [];
}

export async function updateReportStatus(id: string, status: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('reports').update({ status }).eq('id', id);
  if (error) throw error;
}

// Admin stats
export async function getAdminStats() {
  if (!supabase) return { users: 0, stories: 0, comments: 0, reads: 0 };
  const [usersRes, storiesRes, commentsRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('stories').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
  ]);
  const { data: readsData } = await supabase.from('stories').select('reads_count');
  const totalReads = readsData?.reduce((sum, s) => sum + (s.reads_count || 0), 0) || 0;
  return {
    users: usersRes.count || 0,
    stories: storiesRes.count || 0,
    comments: commentsRes.count || 0,
    reads: totalReads
  };
}
