
-- ============================================================
-- Forum System Tables
-- ============================================================

-- Forum categories (for organizing discussions)
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  description_en TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forum threads (discussion topics)
CREATE TABLE IF NOT EXISTS forum_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES forum_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  views_count INT DEFAULT 0,
  replies_count INT DEFAULT 0,
  votes_count INT DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forum posts (replies to threads)
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES forum_posts(id) ON DELETE SET NULL,
  votes_count INT DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forum votes (upvotes/downvotes on threads and posts)
CREATE TABLE IF NOT EXISTS forum_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  value INT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, thread_id, post_id)
);

-- ============================================================
-- Support Ticket System
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_name TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'bug', 'feature', 'account', 'content', 'billing')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_staff BOOLEAN DEFAULT false,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author ON forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_created ON forum_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_pinned ON forum_threads(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_votes_user ON forum_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_votes_thread ON forum_votes(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_votes_post ON forum_votes(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_replies_ticket ON support_ticket_replies(ticket_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- Forum categories: readable by all
CREATE POLICY "forum_categories_read_all" ON forum_categories FOR SELECT USING (true);

-- Forum threads: readable by all, writable by authenticated
CREATE POLICY "forum_threads_read_all" ON forum_threads FOR SELECT USING (true);
CREATE POLICY "forum_threads_insert_auth" ON forum_threads FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_threads_update_author" ON forum_threads FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "forum_threads_delete_author" ON forum_threads FOR DELETE USING (auth.uid() = author_id);

-- Forum posts: readable by all, writable by authenticated
CREATE POLICY "forum_posts_read_all" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "forum_posts_insert_auth" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_posts_update_author" ON forum_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "forum_posts_delete_author" ON forum_posts FOR DELETE USING (auth.uid() = author_id);

-- Forum votes: readable by all, writable by authenticated
CREATE POLICY "forum_votes_read_all" ON forum_votes FOR SELECT USING (true);
CREATE POLICY "forum_votes_insert_auth" ON forum_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_votes_delete_author" ON forum_votes FOR DELETE USING (auth.uid() = user_id);

-- Support tickets: user sees own, admin sees all
CREATE POLICY "support_tickets_read_own" ON support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "support_tickets_insert_auth" ON support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "support_tickets_update_own" ON support_tickets FOR UPDATE USING (auth.uid() = user_id);

-- Support ticket replies: user sees own ticket replies, admin sees all
CREATE POLICY "support_replies_read" ON support_ticket_replies FOR SELECT USING (
  EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  OR is_staff = true
);
CREATE POLICY "support_replies_insert" ON support_ticket_replies FOR INSERT WITH CHECK (true);

-- ============================================================
-- Seed forum categories
-- ============================================================

INSERT INTO forum_categories (name, name_en, slug, description, description_en, icon, sort_order) VALUES
  ('Diskusi Umum', 'General Discussion', 'general', 'Diskusi bebas seputar platform dan cerita', 'Free discussion about the platform and stories', 'MessageCircle', 1),
  ('Tips Menulis', 'Writing Tips', 'writing-tips', 'Bagikan tips dan trik menulis cerita', 'Share writing tips and tricks', 'PenTool', 2),
  ('Review Cerita', 'Story Reviews', 'story-reviews', 'Diskusi dan review cerita favoritmu', 'Discuss and review your favorite stories', 'Star', 3),
  ('Rekomendasi', 'Recommendations', 'recommendations', 'Rekomendasikan cerita untuk pembaca lain', 'Recommend stories for other readers', 'BookOpen', 4),
  ('Challenge & Kontes', 'Challenges & Contests', 'challenges', 'Tantangan menulis dan kompetisi cerita', 'Writing challenges and story competitions', 'Trophy', 5),
  ('Feedback & Saran', 'Feedback & Suggestions', 'feedback', 'Berikan masukan untuk pengembangan platform', 'Give feedback for platform improvement', 'Lightbulb', 6)
ON CONFLICT (slug) DO NOTHING;
