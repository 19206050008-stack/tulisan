import { supabase } from './client';

export async function getProfile(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
}

// Get profile by username
export async function getProfileByUsername(username: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('username', username).single();
  if (error) return null;
  return data;
}

// Update profile
export async function updateProfile(userId: string, updates: Record<string, any>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

// Upload avatar
export async function uploadAvatar(file: File, userId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const ext = file.name.split('.').pop();
  const path = `${userId}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = await supabase.storage.from('avatars').getPublicUrl(path);
  return urlData.publicUrl;
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
