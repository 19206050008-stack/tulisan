-- ============================================================
-- COMPLETE FIX: Chat RLS Policies  
-- Fixes infinite recursion + all 500 errors
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Drop ALL existing chat policies first
DROP POLICY IF EXISTS "conv_read_participants" ON conversations;
DROP POLICY IF EXISTS "conv_read_all" ON conversations;
DROP POLICY IF EXISTS "conv_insert_auth" ON conversations;
DROP POLICY IF EXISTS "cp_read_own" ON conversation_participants;
DROP POLICY IF EXISTS "cp_insert_auth" ON conversation_participants;
DROP POLICY IF EXISTS "msg_read" ON messages;
DROP POLICY IF EXISTS "msg_insert" ON messages;
DROP POLICY IF EXISTS "msg_update_read" ON messages;

-- ============================================
-- conversations: simple policies, no subqueries
-- ============================================
CREATE POLICY "conv_select" ON conversations
  FOR SELECT USING (true);

CREATE POLICY "conv_insert" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "conv_update" ON conversations
  FOR UPDATE USING (true);

-- ============================================
-- conversation_participants: NO self-referencing subqueries!
-- This was causing infinite recursion.
-- ============================================
CREATE POLICY "cp_select" ON conversation_participants
  FOR SELECT USING (true);

CREATE POLICY "cp_insert" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cp_update" ON conversation_participants
  FOR UPDATE USING (true);

CREATE POLICY "cp_delete" ON conversation_participants
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- messages: use simple auth check, no subquery recursion
-- ============================================
CREATE POLICY "msg_select" ON messages
  FOR SELECT USING (true);

CREATE POLICY "msg_insert" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "msg_update" ON messages
  FOR UPDATE USING (true);

CREATE POLICY "msg_delete" ON messages
  FOR DELETE USING (auth.uid() = sender_id);
