import { supabase } from './client';

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
