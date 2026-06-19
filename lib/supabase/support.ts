import { supabase } from './client';
import { getCurrentUser } from './auth';

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
