import { supabase } from './client';

/**
 * Get audio-ready stories for a user
 */
export async function getStoriesWithAudio(userId?: string, client = supabase) {
  if (!client) return [];
  
  const query = client.from('stories').select(`
    id,
    title,
    description,
    cover_url,
    author_id,
    is_completed,
    has_audio,
    audio_approval_needed,
    profiles!stories_author_id_fkey(username, full_name)
  `).eq('status', 'published');
  
  if (userId) {
    query.eq('author_id', userId);
  }
  
  const { data, error } = await query;
  if (error || !data) return [];
  
  return data as any[];
}

/**
 * Send audio request from user
 */
export async function sendAudioRequest(params: {
  storyId: string;
  chapterId?: string;
  notes?: string;
  voiceStyle: 'narrative' | 'dramatic' | 'conversational';
}) {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error('Not authenticated');
  
  const { error } = await supabase.from('audio_requests').insert({
    story_id: params.storyId,
    chapter_id: params.chapterId || null,
    requested_by: user.user.id,
    notes: params.notes || null,
    voice_style: params.voiceStyle,
  });
  
  if (error) throw error;
  return true;
}
