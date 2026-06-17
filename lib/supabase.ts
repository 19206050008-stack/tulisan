import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl.startsWith('http') && supabaseKey && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY') 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const isSupabaseConfigured = () => supabase !== null;

export async function signUp(email: string, password: string, username: string, fullName: string, interest?: string) {
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
      role: 'user',
      interest: interest || 'both'
    });
    
    // CRITICAL FIX: If profile creation fails, we should attempt to clean up the auth user
    if (profileError) {
      // Note: Supabase doesn't provide easy way to delete auth user from client
      // In production, you should handle this via a database trigger or cloud function
      console.error('Profile creation failed after auth signup:', profileError);
      throw new Error('Registration failed. Please try again or contact support if the issue persists.');
    }
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
  const { data } = await supabase.from('site_config').select('value').eq('key', key).maybeSingle();
  return data?.value || null;
}

/**
 * Fetch site_config value based on language.
 * For 'en', tries `${key}_en` first, falls back to `${key}`.
 * For 'id' (default), uses `${key}` directly.
 */
export async function getSiteConfigLocalized(key: string, lang: string) {
  if (!supabase) return null;
  if (lang === 'en') {
    const { data: enData } = await supabase.from('site_config').select('value').eq('key', `${key}_en`).maybeSingle();
    if (enData?.value) return enData.value;
    // Fallback to default (Indonesian) if English not available
  }
  const { data } = await supabase.from('site_config').select('value').eq('key', key).maybeSingle();
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

// Avatar & Frame System
export async function getAvatarOptions() {
  if (!supabase) return [];
  const { data } = await supabase.from('avatar_options').select('*').eq('is_active', true).order('category').order('sort_order', { ascending: true });
  return data || [];
}

export async function getProfileFrames() {
  if (!supabase) return [];
  const { data } = await supabase.from('profile_frames').select('*').eq('is_active', true).order('sort_order', { ascending: true });
  return data || [];
}

// Chat System
export async function getConversations(userId: string) {
  if (!supabase) return [];

  // Step 1: Get all conversation IDs the user is in
  const { data: myParts, error: partsErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (partsErr) {
    console.error('getConversations: failed to fetch participants:', partsErr.message);
    return [];
  }
  if (!myParts || myParts.length === 0) return [];

  const convoIds = myParts.map(p => p.conversation_id);

  // Step 2: Get ALL participants for these conversations (batch)
  const { data: allParts } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', convoIds);

  // Build a map: conversation_id -> [user_ids]
  const partsMap: Record<string, string[]> = {};
  for (const p of (allParts || [])) {
    if (!partsMap[p.conversation_id]) partsMap[p.conversation_id] = [];
    partsMap[p.conversation_id].push(p.user_id);
  }

  // Step 3: Collect all "other" user IDs
  const otherUserIds = new Set<string>();
  for (const convoId of convoIds) {
    const users = partsMap[convoId] || [];
    for (const uid of users) {
      if (uid !== userId) otherUserIds.add(uid);
    }
  }

  // Step 4: Batch fetch all profiles
  const profilesMap: Record<string, any> = {};
  if (otherUserIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', [...otherUserIds]);
    for (const p of (profiles || [])) {
      profilesMap[p.id] = p;
    }
  }

  // Step 5: Batch fetch last messages for all conversations
  const lastMsgMap: Record<string, any> = {};
  if (convoIds.length > 0) {
    // Get the latest message per conversation
    const { data: allMsgs } = await supabase
      .from('messages')
      .select('conversation_id, content, sender_id, created_at')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: false });

    // Take only the first (latest) per conversation
    for (const msg of (allMsgs || [])) {
      if (!lastMsgMap[msg.conversation_id]) {
        lastMsgMap[msg.conversation_id] = msg;
      }
    }
  }

  // Step 6: Batch fetch unread counts
  const unreadMap: Record<string, number> = {};
  for (const convoId of convoIds) {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', convoId)
      .eq('is_read', false)
      .neq('sender_id', userId);
    unreadMap[convoId] = count || 0;
  }

  // Step 7: Build conversation list
  const convos: any[] = [];
  for (const convoId of convoIds) {
    const users = partsMap[convoId] || [];
    const otherUid = users.find(uid => uid !== userId);
    if (!otherUid) continue;

    const otherProfile = profilesMap[otherUid] || {
      id: otherUid,
      username: 'Unknown',
      full_name: 'Unknown User',
      avatar_url: null,
    };

    convos.push({
      conversation_id: convoId,
      other_user: otherProfile,
      last_message: lastMsgMap[convoId] || null,
      unread_count: unreadMap[convoId] || 0,
    });
  }

  // Sort: conversations with messages first (by time), then without
  convos.sort((a, b) => {
    const timeA = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
    const timeB = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
    return timeB - timeA;
  });

  return convos;
}

export async function getOrCreateConversation(userId: string, otherUserId: string) {
  if (!supabase) return null;

  try {
    // Step 1: Check if conversation already exists between these 2 users
    const { data: myParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (myParts && myParts.length > 0) {
      const myConvoIds = myParts.map(p => p.conversation_id);

      const { data: sharedParts } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', myConvoIds)
        .limit(1);

      if (sharedParts && sharedParts.length > 0) {
        return sharedParts[0].conversation_id;
      }
    }

    // Step 2: Create new conversation
    const { data: newConvo, error: convoErr } = await supabase
      .from('conversations')
      .insert({})
      .select('id')
      .maybeSingle();

    if (convoErr) {
      console.error('Create conversation error:', convoErr.message);
      return null;
    }
    if (!newConvo) {
      console.error('Create conversation: no data returned');
      return null;
    }

    // Step 3: Add both participants
    const { error: partErr } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: newConvo.id, user_id: userId },
        { conversation_id: newConvo.id, user_id: otherUserId }
      ]);

    if (partErr) {
      console.error('Add participants error:', partErr.message);
      return null;
    }

    return newConvo.id;
  } catch (e: any) {
    console.error('getOrCreateConversation exception:', e.message || e);
    return null;
  }
}

export async function getMessages(conversationId: string, page = 1, perPage = 50) {
  if (!supabase) return { messages: [], count: 0 };
  const from = (page - 1) * perPage;

  // Fetch messages without FK join (FK points to auth.users, not profiles)
  const { data, count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (error) {
    console.error('getMessages error:', error.message);
    return { messages: [], count: 0 };
  }

  // Fetch sender profiles separately
  const messagesWithSenders = await Promise.all(
    (data || []).map(async (msg: any) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', msg.sender_id)
        .maybeSingle();
      return { ...msg, sender: profile || { id: msg.sender_id, username: 'Unknown', full_name: 'Unknown', avatar_url: null } };
    })
  );

  // Mark as read
  const user = await getCurrentUser();
  if (user && data) {
    const unreadIds = data.filter(m => !m.is_read && m.sender_id !== user.id).map(m => m.id);
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
    }
  }

  return { messages: messagesWithSenders.reverse(), count: count || 0 };
}

export async function sendMessage(conversationId: string, content: string) {
  if (!supabase) throw new Error('Not configured');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Insert message (no .select() to avoid RLS/FK issues)
  const { error: insertErr } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, content });

  if (insertErr) {
    console.error('Insert message error:', insertErr.message, insertErr.code);
    throw new Error(insertErr.message || 'Failed to send message');
  }

  // Get sender profile separately (FK is to auth.users, not profiles)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  // Fetch the latest message
  const { data: latestMsg } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('sender_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Update conversation timestamp
  await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

  // Combine message with sender profile
  if (latestMsg) {
    return { ...latestMsg, sender: profile };
  }

  // Fallback: return optimistic message
  return {
    id: 'temp-' + Date.now(),
    content,
    sender_id: user.id,
    sender: profile || { id: user.id, username: 'You', full_name: 'You', avatar_url: null },
    created_at: new Date().toISOString(),
    is_read: false,
  };
}

export async function getUnreadMessageCount(userId: string) {
  if (!supabase) return 0;
  // Get all conversation IDs for this user
  const { data: convos } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (!convos || convos.length === 0) return 0;

  const convoIds = convos.map(c => c.conversation_id);
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', convoIds)
    .eq('is_read', false)
    .neq('sender_id', userId);

  return count || 0;
}

// Ad Requests
export async function getAdRequests(userId?: string) {
  if (!supabase) return [];
  let query = supabase.from('ad_requests').select('*, profiles!ad_requests_user_id_fkey(username, full_name), stories(title)').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data } = await query;
  return data || [];
}

export async function createAdRequest(req: { story_id?: string; title: string; description?: string; image_url?: string; start_date: string; end_date: string }) {
  if (!supabase) throw new Error('Not configured');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('ad_requests').insert({
    user_id: user.id,
    ...req,
    status: 'pending'
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateAdRequestStatus(id: string, status: string, reason?: string, adminNotes?: string) {
  if (!supabase) throw new Error('Not configured');
  const user = await getCurrentUser();
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (status === 'approved') { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
  if (status === 'rejected' && reason) updates.rejection_reason = reason;
  if (adminNotes) updates.admin_notes = adminNotes;
  if (status === 'published') updates.published_at = new Date().toISOString();
  const { error } = await supabase.from('ad_requests').update(updates).eq('id', id);
  if (error) throw error;
}

export async function getActiveAds() {
  if (!supabase) return [];
  const now = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('ad_requests')
    .select('*')
    .eq('status', 'published')
    .lte('start_date', now)
    .gte('end_date', now)
    .order('created_at', { ascending: false });
  return data || [];
}

// Press Articles
export async function getPressArticles(publishedOnly = true) {
  if (!supabase) return [];
  let query = supabase.from('press_articles').select('*').order('published_at', { ascending: false });
  if (publishedOnly) query = query.eq('published', true);
  const { data } = await query;
  return data || [];
}

export async function getPressArticle(slug: string) {
  if (!supabase) return null;
  const { data } = await supabase.from('press_articles').select('*').eq('slug', slug).single();
  if (data) {
    supabase.from('press_articles').update({ views_count: (data.views_count || 0) + 1 }).eq('id', data.id).then(() => {});
  }
  return data;
}

export async function createPressArticle(article: { title: string; title_en?: string; slug: string; excerpt?: string; excerpt_en?: string; content: any[]; content_en?: any[]; cover_url?: string; category?: string; tags?: string[] }) {
  if (!supabase) throw new Error('Not configured');
  const { data, error } = await supabase.from('press_articles').insert({
    ...article,
    published: false,
    published_at: new Date().toISOString()
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updatePressArticle(id: string, updates: Record<string, any>) {
  if (!supabase) throw new Error('Not configured');
  const { error } = await supabase.from('press_articles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deletePressArticle(id: string) {
  if (!supabase) throw new Error('Not configured');
  const { error } = await supabase.from('press_articles').delete().eq('id', id);
  if (error) throw error;
}

// Forum System
export async function getForumCategories() {
  if (!supabase) return [];
  const { data } = await supabase.from('forum_categories').select('*').eq('active', true).order('sort_order', { ascending: true });
  return data || [];
}

export async function getForumThreads(categorySlug?: string, page = 1, perPage = 20) {
  if (!supabase) return { threads: [], count: 0 };
  let query = supabase.from('forum_threads').select('*, author:profiles!forum_threads_author_id_fkey(username, full_name, avatar_url), forum_categories(name, name_en, slug)', { count: 'exact' });
  if (categorySlug) query = query.eq('forum_categories.slug', categorySlug);
  const from = (page - 1) * perPage;
  query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).range(from, from + perPage - 1);
  const { data, error, count } = await query;
  if (error) return { threads: [], count: 0 };
  return { threads: data || [], count: count || 0 };
}

export async function getForumThread(threadId: string) {
  if (!supabase) return null;
  const { data } = await supabase.from('forum_threads').select('*, author:profiles!forum_threads_author_id_fkey(username, full_name, avatar_url), forum_categories(name, name_en, slug)').eq('id', threadId).single();
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
  }).select('*, author:profiles!forum_threads_author_id_fkey(username, full_name, avatar_url)').single();
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
    .select('*, author:profiles!forum_posts_author_id_fkey(username, full_name, avatar_url)', { count: 'exact' })
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
    .select('*, author:profiles!forum_posts_author_id_fkey(username, full_name, avatar_url)')
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
  }).select('*, author:profiles!forum_posts_author_id_fkey(username, full_name, avatar_url)').single();
  if (error) throw error;
  // Update thread replies count and last_reply_at
  await supabase.from('forum_threads').update({ replies_count: supabase.rpc ? undefined : 0, last_reply_at: new Date().toISOString() }).eq('id', threadId);
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

// Support Tickets
export async function createSupportTicket(subject: string, description: string, category = 'general') {
  if (!supabase) throw new Error('Supabase not configured');
  const user = await getCurrentUser();
  const { data, error } = await supabase.from('support_tickets').insert({
    user_id: user?.id || null,
    subject,
    description,
    category
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getSupportTickets(userId: string) {
  if (!supabase) return [];
  const { data } = await supabase.from('support_tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
}

export async function getSupportTicket(ticketId: string) {
  if (!supabase) return null;
  const { data } = await supabase.from('support_tickets').select('*, replies:support_ticket_replies(*, author:profiles!support_ticket_replies_user_id_fkey(username, full_name, avatar_url))').eq('id', ticketId).single();
  return data;
}

export async function replySupportTicket(ticketId: string, content: string, isStaff = false) {
  if (!supabase) throw new Error('Supabase not configured');
  const user = await getCurrentUser();
  const { data, error } = await supabase.from('support_ticket_replies').insert({
    ticket_id: ticketId,
    user_id: user?.id || null,
    content,
    is_staff: isStaff
  }).select().single();
  if (error) throw error;
  // Update ticket status if staff replies
  if (isStaff) {
    await supabase.from('support_tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', ticketId);
  }
  return data;
}
