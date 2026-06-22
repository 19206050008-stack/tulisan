import { supabase } from './client';

/**
 * Get all stories with audio status (admin only)
 */
export async function getAllStoriesWithAudio(client = supabase) {
  if (!client) return [];
  
  const { data: requests, error: reqError } = await client
    .from('audio_requests')
    .select(`
      id,
      story_id,
      chapter_id,
      status,
      created_at,
      voice_style,
      stories!inner(
        id,
        title,
        is_completed,
        stories_author_id_fkey(username, full_name)
      )
    `)
    .order('created_at', { ascending: false });
    
  if (reqError || !requests) return [];
  
  // Check which stories have approved audio content
  const storyIds = requests.map(r => r.story_id);
  const { data: audioContents, error: contentError } = await client
    .from('audio_contents')
    .select(`
      story_id,
      chapter_id,
      status
    `)
    .in('story_id', storyIds);
    
  if (contentError) console.error('Error loading audio contents:', contentError);
  
  const approvedStoryIds = new Set<string>();
  if (audioContents) {
    audioContents.forEach(ac => {
      if (ac.status === 'ready' || ac.status === 'completed') {
        approvedStoryIds.add(ac.story_id);
      }
    });
  }
  
  return requests.map(req => {
    const hasAudio = approvedStoryIds.has(req.story_id);
    let audioStatus: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' = req.status as any;
    
    // Override with actual audio status if available
    if (hasAudio && req.status === 'pending') {
      audioStatus = 'approved';
    }
    
    return {
      id: req.story_id,
      title: req.stories?.title || '',
      author: {
        username: req.stories?.stories_author_id_fkey?.username || '',
        full_name: req.stories?.stories_author_id_fkey?.full_name,
      },
      chapterId: req.chapter_id,
      chapterTitle: null, // Will be populated separately if needed
      has_audio: hasAudio,
      request_id: req.id,
      audio_status: audioStatus,
      story_status: req.is_completed ? 'published' : 'draft',
    };
  });
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
  if (!user.user) throw new Error('Not authenticated');
  
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

/**
 * Approve an audio request (admin only)
 */
export async function approveAudioRequest(requestId: string, client = supabase) {
  if (!client) throw new Error('Supabase not configured');
  
  const { data: request } = await client
    .from('audio_requests')
    .select('reviewed_by')
    .eq('id', requestId)
    .single();
    
  if (request?.reviewed_by) {
    throw new Error('This request was already reviewed by another admin');
  }
  
  const { error } = await client
    .from('audio_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: request.reviewed_by, // This will actually be set when calling from a server component with proper auth
    })
    .eq('id', requestId);
    
  if (error) throw error;
  return true;
}

/**
 * Reject an audio request (admin only)
 */
export async function rejectAudioRequest(requestId: string, reason: string, client = supabase) {
  if (!client) throw new Error('Supabase not configured');
  
  const { error } = await client
    .from('audio_requests')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);
    
  if (error) throw error;
  return true;
}

/**
 * Delete audio content file
 */
export async function deleteAudioContent(storyId: string, chapterId?: string, client = supabase) {
  if (!client) throw new Error('Supabase not configured');
  
  // First delete from storage bucket (requires service role key - handled in server action)
  // For now, just mark as expired
  const { error } = await client
    .from('audio_contents')
    .update({
      status: 'expired',
    })
    .eq('story_id', storyId)
    .and(chapterId ? `chapter_id.eq.${chapterId}` : '')
    .eq('status', 'ready');
    
  if (error) throw error;
  return true;
}

/**
 * Mark stories as having audio eligibility
 */
export async function bulkUpdateAudioEligibility(
  storyIds: string[], 
  eligible: boolean,
  client = supabase
) {
  if (!client) throw new Error('Supabase not configured');
  
  const { error } = await client
    .from('stories')
    .upsert(
      storyIds.map(id => ({
        id,
        has_audio: eligible,
        audio_approval_needed: eligible ? false : true,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );
    
  if (error) throw error;
  return true;
}
