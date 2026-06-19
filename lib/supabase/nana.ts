import { supabase } from './client';
import { getCurrentUser } from './auth';

// Nana AI
export async function syncNanaChat(title: string, messages: { role: string; content: string }[]) {
  if (!supabase) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const { data: chat, error: chatErr } = await supabase
    .from('nana_chats')
    .insert({ user_id: user.id, title, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (chatErr || !chat) return null;
  if (messages.length > 0) {
    await supabase.from('nana_messages').insert(
      messages.map(m => ({ chat_id: chat.id, role: m.role, content: m.content }))
    );
  }
  return chat;
}

export async function getNanaChatStats() {
  if (!supabase) return { totalChats: 0, totalMessages: 0, totalUsers: 0, users: [] };
  const { data: chats } = await supabase.from('nana_chats').select('id, user_id, title, created_at, updated_at').order('updated_at', { ascending: false });
  if (!chats || chats.length === 0) return { totalChats: 0, totalMessages: 0, totalUsers: 0, users: [] };
  
  // Fetch unique user IDs
  const userIds = [...new Set(chats.map(c => c.user_id))];
  
  // Get user profiles by ID (using auth.users is better, but use profiles for consistency)
  const { data: profilesData } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds);
  const profileMap: Record<string, any> = {};
  (profilesData || []).forEach((p: any) => { profileMap[p.id] = p; });
  
  const userMap: Record<string, any> = {};
  for (const chat of chats) {
    const uid = chat.user_id;
    const profile = profileMap[uid] || {};
    if (!userMap[uid]) {
      userMap[uid] = {
        user_id: uid,
        username: profile.username || 'Unknown',
        full_name: profile.full_name || 'Unknown',
        avatar_url: profile.avatar_url,
        chat_count: 0,
        last_active: chat.updated_at,
        chats: [],
      };
    }
    userMap[uid].chat_count++;
    userMap[uid].chats.push({ id: chat.id, title: chat.title, created_at: chat.created_at, updated_at: chat.updated_at });
    if (new Date(chat.updated_at) > new Date(userMap[uid].last_active)) {
      userMap[uid].last_active = chat.updated_at;
    }
  }
  const users = Object.values(userMap).sort((a: any, b: any) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime());
  const { count: msgCount } = await supabase.from('nana_messages').select('*', { count: 'exact', head: true });
  return { totalChats: chats.length, totalMessages: msgCount || 0, totalUsers: users.length, users };
}

export async function getNanaChatMessages(chatId: string) {
  if (!supabase) return [];
  const { data } = await supabase.from('nana_messages').select('id, role, content, created_at').eq('chat_id', chatId).order('created_at', { ascending: true });
  return data || [];
}

export async function deleteNanaChat(chatId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  await supabase.from('nana_messages').delete().eq('chat_id', chatId);
  await supabase.from('nana_chats').delete().eq('id', chatId);
}

export async function getNanaConfig() {
  if (!supabase) return {};
  const keys = ['nana_enabled', 'nana_system_prompt_id', 'nana_system_prompt_en', 'nana_model', 'nana_temperature', 'nana_max_tokens'];
  const { data } = await supabase.from('site_config').select('key, value').in('key', keys);
  const config: Record<string, any> = {};
  (data || []).forEach((item: any) => { config[item.key] = item.value; });
  return config;
}

export async function updateNanaConfig(updates: Record<string, any>) {
  if (!supabase) throw new Error('Supabase not configured');
  for (const [key, value] of Object.entries(updates)) {
    const { data: existing } = await supabase.from('site_config').select('key').eq('key', key).single();
    if (existing) {
      await supabase.from('site_config').update({ value }).eq('key', key);
    } else {
      await supabase.from('site_config').insert({ key, value });
    }
  }
}
