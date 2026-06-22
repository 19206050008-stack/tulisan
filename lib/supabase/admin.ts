import { supabase } from './client';

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

// Featured Slides
function truncateAtWord(text: string, max: number) {
  if (!text || text.length <= max) return text;
  const trimmed = text.substring(0, max);
  const lastSpace = trimmed.lastIndexOf(' ');
  return (lastSpace > 0 ? trimmed.substring(0, lastSpace) : trimmed) + '...';
}

export async function getFeaturedSlides() {
  if (!supabase) return [];
  // Try admin-configured slides first
  const { data } = await supabase.from('featured_slides').select('*, stories(title, profiles!stories_author_id_fkey(username, full_name))').eq('active', true).order('sort_order', { ascending: true });
  if (data && data.length > 0) return data;
  // Fallback: top stories by reads (single lightweight query)
  const { data: topStories } = await supabase.from('stories').select('id, title, description, cover_url, category, profiles!stories_author_id_fkey(username, full_name)').eq('status', 'published').order('reads_count', { ascending: false }).limit(5);
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

// Ad Requests
import { getCurrentUser } from './auth';

export async function getAdRequests(userId?: string) {
  if (!supabase) return [];
  let query = supabase.from('ad_requests').select('*').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching ad requests:', error);
    return [];
  }
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

export async function getPublishedAds() {
  if (!supabase) return [];
  const now = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('ad_requests')
    .select('*, stories(id, title, description, reads_count, likes_count)')
    .in('status', ['published', 'approved'])
    .lte('start_date', now)
    .gte('end_date', now)
    .order('created_at', { ascending: false });
  if (error) console.error('getPublishedAds error:', error.message);
  return data || [];
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

// Admin Dashboard Stats
export async function getFrontendStats() {
  if (!supabase) return {
    users: 0, stories: 0, comments: 0, reads: 0,
    totalReads: 0, publishedStories: 0, draftStories: 0, archivedStories: 0,
    storyCategories: 0, featuredSlides: 0, forumThreads: 0, pressArticles: 0, ads: 0
  };
  
  // Basic counts
  const [usersCount, storiesCount, commentsCount] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('stories').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
  ]);
  
  // Reads by category and status
  const [totalReads, published, drafts, archived] = await Promise.all([
    supabase.from('stories').select('reads_count'),
    supabase.from('stories').select('*', { count: 'exact' }).eq('status', 'published'),
    supabase.from('stories').select('*', { count: 'exact' }).eq('status', 'draft'),
    supabase.from('stories').select('*', { count: 'exact' }).eq('status', 'archived'),
  ]);
  
  const totalReadsValue = (totalReads.data?.reduce((sum: number, s: any) => sum + (s.reads_count || 0), 0) || 0);
  
  // Other frontend features
  const [categories, slides, threads, press, ads] = await Promise.all([
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('featured_slides').select('*', { count: 'exact', head: true }),
    supabase.from('forum_threads').select('*', { count: 'exact', head: true }),
    supabase.from('press_articles').select('*', { count: 'exact', head: true }),
    supabase.from('ads').select('*', { count: 'exact', head: true }),
  ]);
  
  return {
    users: usersCount.count || 0,
    stories: storiesCount.count || 0,
    comments: commentsCount.count || 0,
    reads: totalReadsValue,
    totalReads: totalReadsValue,
    publishedStories: published.count || 0,
    draftStories: drafts.count || 0,
    archivedStories: archived.count || 0,
    storyCategories: categories.count || 0,
    featuredSlides: slides.count || 0,
    forumThreads: threads.count || 0,
    pressArticles: press.count || 0,
    ads: ads.count || 0,
  };
}

// ========================================
// Audio Content Management
// ========================================

export async function sendAudioRequest(params: {
  storyId: string;
  chapterId?: string;
  notes?: string;
  voiceStyle: 'narrative' | 'dramatic' | 'conversational';
}) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error('Not authenticated');
  const { error } = await supabase.from('audio_requests').insert({
    story_id: params.storyId,
    chapter_id: params.chapterId || null,
    requested_by: auth.user.id,
    notes: params.notes || null,
    voice_style: params.voiceStyle,
  });
  if (error) throw error;
  return true;
}

export async function getAllStoriesWithAudio() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('audio_requests')
    .select('id, story_id, chapter_id, status, created_at, voice_style, stories!inner(id, title, is_completed, profiles!stories_author_id_fkey(username, full_name))')
    .order('created_at', { ascending: false });
  if (error || !data) { if (error) console.error('getAllStoriesWithAudio:', error.message); return []; }

  const storyIds = data.map((r: any) => r.story_id);
  const { data: contents } = await supabase
    .from('audio_contents')
    .select('story_id, status')
    .in('story_id', storyIds.length ? storyIds : ['00000000-0000-0000-0000-000000000000']);
  const ready = new Set<string>((contents || []).filter((c: any) => c.status === 'ready').map((c: any) => c.story_id));

  return data.map((req: any) => ({
    id: req.story_id,
    title: req.stories?.title || '',
    author: {
      username: req.stories?.profiles?.username || '',
      full_name: req.stories?.profiles?.full_name || undefined,
    },
    chapterId: req.chapter_id || undefined,
    chapterTitle: undefined,
    has_audio: ready.has(req.story_id),
    request_id: req.id,
    audio_status: (ready.has(req.story_id) && req.status === 'pending' ? 'approved' : req.status) as 'pending' | 'approved' | 'processing' | 'completed' | 'rejected',
    story_status: (req.stories?.is_completed ? 'published' : 'draft') as 'published' | 'draft' | 'archived',
    created_at: req.created_at,
  }));
}

export async function approveAudioRequest(requestId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: auth } = await supabase.auth.getUser();
  // Mark request approved
  const { data: req, error: reqErr } = await supabase
    .from('audio_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: auth?.user?.id || null })
    .eq('id', requestId)
    .select('story_id, chapter_id, voice_style')
    .single();
  if (reqErr || !req) throw reqErr || new Error('Request not found');

  // Create audio_contents record (metadata only - audio is client-side)
  const { error: contentErr } = await supabase.from('audio_contents').upsert({
    story_id: req.story_id,
    chapter_id: req.chapter_id || null,
    audio_request_id: requestId,
    status: 'ready',
    voice_style: req.voice_style || 'narrative',
    approved_by: auth?.user?.id || null,
  }, { onConflict: 'story_id,chapter_id' });
  if (contentErr) throw contentErr;

  // Flag the story as having audio
  await supabase.from('stories').update({ has_audio: true }).eq('id', req.story_id);
  return true;
}

export async function rejectAudioRequest(requestId: string, reason: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('audio_requests')
    .update({ status: 'rejected', rejection_reason: reason, reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw error;
  return true;
}

export async function deleteAudioContent(storyId: string, chapterId?: string) {
  if (!supabase) throw new Error('Supabase not configured');
  let q = supabase.from('audio_contents').delete().eq('story_id', storyId);
  if (chapterId) q = q.eq('chapter_id', chapterId);
  const { error } = await q;
  if (error) throw error;
  // If no more audio for this story, unflag it
  const { data: remaining } = await supabase.from('audio_contents').select('id').eq('story_id', storyId).limit(1);
  if (!remaining || remaining.length === 0) {
    await supabase.from('stories').update({ has_audio: false }).eq('id', storyId);
  }
  return true;
}

export async function getApprovedAudioStoryIds(): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data } = await supabase.from('audio_contents').select('story_id').eq('status', 'ready');
  return new Set<string>((data || []).map((d: any) => d.story_id));
}
