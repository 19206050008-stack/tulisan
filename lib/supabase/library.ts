import { supabase } from './client';

// Library / Saves
export async function toggleSave(userId: string, storyId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: rows, error } = await supabase.from('library_saves').select('user_id').eq('user_id', userId).eq('story_id', storyId).limit(1);
  if (error) { console.error('toggleSave check error:', error.message); }
  const existing = rows && rows.length > 0;
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
  const { data: rows, error } = await supabase.from('library_saves').select('user_id').eq('user_id', userId).eq('story_id', storyId).limit(1);
  if (error) { console.error('isSaved error:', error.message); return false; }
  return !!(rows && rows.length > 0);
}

export async function getSavedStories(userId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('library_saves').select('*, stories(*, profiles!stories_author_id_fkey(username, full_name))').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
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
