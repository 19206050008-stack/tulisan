import { supabase } from './client';

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
