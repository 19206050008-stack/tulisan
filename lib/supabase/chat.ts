import { supabase } from './client';
import { getCurrentUser } from './auth';

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
      .select('id, username, full_name, avatar_url, selected_avatar, frame_id')
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
      const { data: profile } = await supabase!
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
