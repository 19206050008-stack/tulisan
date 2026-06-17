-- ============================================================
-- Migration 2: Chat, Ads, Press Articles, Profile Frames
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- ==================== CHAT SYSTEM ====================

-- Conversations (between 2 users)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== AD SYSTEM ====================

-- Ad requests from users
CREATE TABLE IF NOT EXISTS ad_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  banner_url TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published', 'expired', 'cancelled')),
  rejection_reason TEXT,
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  views_count INT DEFAULT 0,
  clicks_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PRESS ARTICLES ====================

CREATE TABLE IF NOT EXISTS press_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  excerpt_en TEXT,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_en JSONB DEFAULT '[]'::jsonb,
  cover_url TEXT,
  author_name TEXT DEFAULT 'Di.tulis Editorial',
  category TEXT DEFAULT 'news' CHECK (category IN ('news', 'announcement', 'tutorial', 'interview', 'review', 'feature')),
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  views_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PROFILE FRAMES & AVATARS ====================

CREATE TABLE IF NOT EXISTS profile_frames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL CHECK (category IN ('fire', 'lightning', 'snow', 'nature', 'neon', 'gold', 'rainbow', 'galaxy', 'heart', 'seasonal', 'special')),
  svg_data TEXT NOT NULL,
  css_animation TEXT,
  preview_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-installed avatar options (animals, characters, etc)
CREATE TABLE IF NOT EXISTS avatar_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('animal', 'character', 'abstract', 'nature', 'food', 'emoji', 'letter')),
  image_url TEXT NOT NULL,
  svg_data TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's selected frame and avatar
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS frame_id UUID REFERENCES profile_frames(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_avatar TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_type TEXT DEFAULT 'letter' CHECK (avatar_type IN ('letter', 'upload', 'preset'));

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_requests_user ON ad_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_requests_status ON ad_requests(status);
CREATE INDEX IF NOT EXISTS idx_ad_requests_dates ON ad_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_press_articles_slug ON press_articles(slug);
CREATE INDEX IF NOT EXISTS idx_press_articles_published ON press_articles(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_press_articles_category ON press_articles(category);
CREATE INDEX IF NOT EXISTS idx_profile_frames_category ON profile_frames(category);
CREATE INDEX IF NOT EXISTS idx_avatar_options_category ON avatar_options(category);

-- ==================== RLS POLICIES ====================

-- Conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE press_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_options ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe for re-run)
DROP POLICY IF EXISTS "conv_read_participants" ON conversations;
DROP POLICY IF EXISTS "conv_insert_auth" ON conversations;
DROP POLICY IF EXISTS "cp_read_own" ON conversation_participants;
DROP POLICY IF EXISTS "cp_insert_auth" ON conversation_participants;
DROP POLICY IF EXISTS "msg_read" ON messages;
DROP POLICY IF EXISTS "msg_insert" ON messages;
DROP POLICY IF EXISTS "ad_read_own" ON ad_requests;
DROP POLICY IF EXISTS "ad_insert_auth" ON ad_requests;
DROP POLICY IF EXISTS "ad_update_own" ON ad_requests;
DROP POLICY IF EXISTS "ad_delete_own" ON ad_requests;
DROP POLICY IF EXISTS "press_read_published" ON press_articles;
DROP POLICY IF EXISTS "frames_read_all" ON profile_frames;
DROP POLICY IF EXISTS "avatars_read_all" ON avatar_options;

-- Conversations: participants can read their own, any auth user can insert
DROP POLICY IF EXISTS "conv_read_participants" ON conversations;
DROP POLICY IF EXISTS "conv_insert_auth" ON conversations;
CREATE POLICY "conv_read_participants" ON conversations FOR SELECT USING (true);
CREATE POLICY "conv_insert_auth" ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Participants: user sees their own conversations
CREATE POLICY "cp_read_own" ON conversation_participants FOR SELECT USING (user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM conversation_participants cp2 WHERE cp2.conversation_id = conversation_id AND cp2.user_id = auth.uid())
);
CREATE POLICY "cp_insert_auth" ON conversation_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages: participants can read and send
CREATE POLICY "msg_read" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "msg_insert" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);

-- Ad requests: user sees own, admin sees all
CREATE POLICY "ad_read_own" ON ad_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ad_insert_auth" ON ad_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ad_update_own" ON ad_requests FOR UPDATE USING (auth.uid() = user_id AND status IN ('pending', 'rejected'));
CREATE POLICY "ad_delete_own" ON ad_requests FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Press articles: readable by all when published
CREATE POLICY "press_read_published" ON press_articles FOR SELECT USING (published = true);

-- Profile frames & avatars: readable by all
CREATE POLICY "frames_read_all" ON profile_frames FOR SELECT USING (is_active = true);
CREATE POLICY "avatars_read_all" ON avatar_options FOR SELECT USING (is_active = true);

-- ==================== SEED DATA ====================

-- Seed profile frames (SVG-based effects)
INSERT INTO profile_frames (name, name_en, category, svg_data, css_animation, sort_order) VALUES
  ('Api Biru', 'Blue Fire', 'fire', '<svg viewBox="0 0 100 100"><defs><radialGradient id="fire"><stop offset="0%" stop-color="#ff6b35" stop-opacity="0.8"/><stop offset="50%" stop-color="#f7931e" stop-opacity="0.6"/><stop offset="100%" stop-color="#ff0000" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="50" r="48" fill="none" stroke="url(#fire)" stroke-width="6"><animate attributeName="stroke-width" values="4;8;4" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite"/></circle></svg>', 'pulse 1.5s infinite', 1),
  ('Petir Ungu', 'Purple Lightning', 'lightning', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="8 4"><animate attributeName="stroke-dashoffset" values="0;24" dur="0.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;1;0.5" dur="0.6s" repeatCount="indefinite"/></circle></svg>', 'spark 0.6s infinite', 2),
  ('Salju', 'Snowfall', 'snow', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="#93c5fd" stroke-width="4" stroke-dasharray="3 8"><animate attributeName="stroke-dashoffset" values="0;-22" dur="3s" repeatCount="indefinite"/></circle></svg>', 'none', 3),
  ('Neon Hijau', 'Green Neon', 'neon', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="#22c55e" stroke-width="3"><animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/></circle><circle cx="50" cy="50" r="46" fill="none" stroke="#22c55e" stroke-width="1" opacity="0.3"/></svg>', 'glow 2s infinite', 4),
  ('Emas', 'Gold', 'gold', '<svg viewBox="0 0 100 100"><defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fbbf24"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="none" stroke="url(#gold)" stroke-width="4"/></svg>', 'none', 5),
  ('Pelangi', 'Rainbow', 'rainbow', '<svg viewBox="0 0 100 100"><defs><linearGradient id="rb" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ef4444"/><stop offset="20%" stop-color="#f97316"/><stop offset="40%" stop-color="#eab308"/><stop offset="60%" stop-color="#22c55e"/><stop offset="80%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="none" stroke="url(#rb)" stroke-width="4"><animateTransform attributeName="transform" type="rotate" values="0 50 50;360 50 50" dur="4s" repeatCount="indefinite"/></circle></svg>', 'none', 6),
  ('Galaksi', 'Galaxy', 'galaxy', '<svg viewBox="0 0 100 100"><defs><radialGradient id="gal"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#1e1b4b"/></radialGradient></defs><circle cx="50" cy="50" r="48" fill="none" stroke="url(#gal)" stroke-width="4" stroke-dasharray="2 6"><animateTransform attributeName="transform" type="rotate" values="0 50 50;360 50 50" dur="8s" repeatCount="indefinite"/></circle></svg>', 'none', 7),
  ('Hati', 'Hearts', 'heart', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="#f43f5e" stroke-width="3" stroke-dasharray="4 8"><animate attributeName="stroke-dashoffset" values="0;24" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite"/></circle></svg>', 'pulse 1.5s infinite', 8),
  ('Daun', 'Leaves', 'nature', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="#16a34a" stroke-width="3" stroke-dasharray="6 4"><animate attributeName="stroke-dashoffset" values="0;-20" dur="4s" repeatCount="indefinite"/></circle></svg>', 'none', 9),
  ('Merah Muda', 'Pink Sparkle', 'special', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="#ec4899" stroke-width="2" stroke-dasharray="1 10"><animate attributeName="stroke-dashoffset" values="0;22" dur="1s" repeatCount="indefinite"/></circle><circle cx="50" cy="50" r="46" fill="none" stroke="#ec4899" stroke-width="1" opacity="0.3"><animate attributeName="r" values="46;48;46" dur="2s" repeatCount="indefinite"/></circle></svg>', 'pulse 2s infinite', 10)
ON CONFLICT DO NOTHING;

-- Seed avatar options (using DiceBear API for free avatars)
INSERT INTO avatar_options (name, category, image_url, sort_order) VALUES
  -- Animals
  ('Kucing', 'animal', 'https://api.dicebear.com/9.x/thumbs/svg?seed=cat&backgroundColor=ffdfbf', 1),
  ('Anjing', 'animal', 'https://api.dicebear.com/9.x/thumbs/svg?seed=dog&backgroundColor=c0aede', 2),
  ('Kelinci', 'animal', 'https://api.dicebear.com/9.x/thumbs/svg?seed=rabbit&backgroundColor=b6e3f4', 3),
  ('Rubah', 'animal', 'https://api.dicebear.com/9.x/thumbs/svg?seed=fox&backgroundColor=ffd5dc', 4),
  ('Burung Hantu', 'animal', 'https://api.dicebear.com/9.x/thumbs/svg?seed=owl&backgroundColor=d1d4f9', 5),
  ('Panda', 'animal', 'https://api.dicebear.com/9.x/thumbs/svg?seed=panda&backgroundColor=ffdfbf', 6),
  ('Singa', 'animal', 'https://api.dicebear.com/9.x/thumbs/svg?seed=lion&backgroundColor=ffd5dc', 7),
  ('Serigala', 'animal', 'https://api.dicebear.com/9.x/thumbs/svg?seed=wolf&backgroundColor=c0aede', 8),
  -- Characters
  ('Robot', 'character', 'https://api.dicebear.com/9.x/bottts/svg?seed=robot1&backgroundColor=b6e3f4', 10),
  ('Astronot', 'character', 'https://api.dicebear.com/9.x/bottts/svg?seed=astro&backgroundColor=d1d4f9', 11),
  ('Ninja', 'character', 'https://api.dicebear.com/9.x/bottts/svg?seed=ninja&backgroundColor=c0aede', 12),
  ('Wizard', 'character', 'https://api.dicebear.com/9.x/bottts/svg?seed=wizard&backgroundColor=ffd5dc', 13),
  ('Pixel Hero', 'character', 'https://api.dicebear.com/9.x/pixel-art/svg?seed=hero&backgroundColor=ffdfbf', 14),
  ('Pixel Mage', 'character', 'https://api.dicebear.com/9.x/pixel-art/svg?seed=mage&backgroundColor=b6e3f4', 15),
  -- Abstract
  ('Gradient 1', 'abstract', 'https://api.dicebear.com/9.x/shapes/svg?seed=shape1&backgroundColor=b6e3f4', 20),
  ('Gradient 2', 'abstract', 'https://api.dicebear.com/9.x/shapes/svg?seed=shape2&backgroundColor=ffd5dc', 21),
  ('Geometric', 'abstract', 'https://api.dicebear.com/9.x/identicon/svg?seed=geo1&backgroundColor=c0aede', 22),
  ('Mosaic', 'abstract', 'https://api.dicebear.com/9.x/identicon/svg?seed=mosaic&backgroundColor=ffdfbf', 23),
  -- Emoji
  ('Happy', 'emoji', 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=happy&backgroundColor=b6e3f4', 30),
  ('Cool', 'emoji', 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=cool&backgroundColor=c0aede', 31),
  ('Love', 'emoji', 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=love&backgroundColor=ffd5dc', 32),
  ('Star', 'emoji', 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=star&backgroundColor=ffdfbf', 33),
  ('Fire', 'emoji', 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=fire&backgroundColor=d1d4f9', 34)
ON CONFLICT DO NOTHING;

-- Seed some press articles
INSERT INTO press_articles (title, title_en, slug, excerpt, excerpt_en, content, content_en, category, tags, published, published_at) VALUES
  (
    'Di.tulis Resmi Diluncurkan dengan 460+ Cerpen Indonesia',
    'Di.tulis Officially Launches with 460+ Indonesian Short Stories',
    'ditulis-resmi-diluncurkan',
    'Platform storytelling Di.tulis resmi hadir dengan lebih dari 460 cerita pendek berbahasa Indonesia dari berbagai genre.',
    'Storytelling platform Di.tulis officially launches with over 460 Indonesian short stories across multiple genres.',
    '[{"type":"paragraph","text":"Platform storytelling Di.tulis resmi diluncurkan hari ini, membawa lebih dari 460 cerita pendek berbahasa Indonesia yang ditulis oleh para penulis berbakat dari seluruh nusantara."},{"type":"paragraph","text":"Dengan fitur-fitur seperti editor rich text, sistem komentar paragraf, dan komunitas yang aktif, Di.tulis hadir sebagai rumah baru bagi para penulis dan pembaca Indonesia."},{"type":"paragraph","text":"\"Kami percaya setiap orang punya cerita yang layak dibagikan,\" kata tim Di.tulis. \"Platform ini kami bangun untuk mendemokratisasi storytelling dan memberikan ruang bagi semua suara.\""}]',
    '[{"type":"paragraph","text":"Storytelling platform Di.tulis officially launches today, bringing over 460 Indonesian short stories written by talented authors from across the archipelago."},{"type":"paragraph","text":"With features like a rich text editor, paragraph commenting system, and an active community, Di.tulis arrives as a new home for Indonesian writers and readers."},{"type":"paragraph","text":"\"We believe everyone has a story worth sharing,\" said the Di.tulis team. \"We built this platform to democratize storytelling and give space to all voices.\""}]',
    'announcement',
    ARRAY['launch', 'milestone', 'indonesia'],
    true,
    NOW()
  ),
  (
    'Kolaborasi dengan Penulis AAR Nugroho untuk Konten Perdana',
    'Collaboration with Author AAR Nugroho for Premiere Content',
    'kolaborasi-aar-nugroho',
    'Penulis AAR Nugroho menjadi salah satu kontributor konten perdana di Di.tulis dengan koleksi cerpen yang beragam.',
    'Author AAR Nugroho becomes one of the premiere content contributors on Di.tulis with a diverse short story collection.',
    '[{"type":"paragraph","text":"Di.tulis dengan bangga mengumumkan kolaborasi dengan penulis AAR Nugroho, yang menjadi salah satu kontributor konten perdana di platform ini."},{"type":"paragraph","text":"Dengan koleksi lebih dari 400 cerita pendek yang mencakup berbagai genre dari Romance hingga Sci-Fi, karya-karya AAR Nugroho memperkaya perpustakaan cerita Di.tulis sejak hari pertama."},{"type":"paragraph","text":"Kolaborasi ini menandakan komitmen Di.tulis untuk menghadirkan konten berkualitas tinggi sekaligus membuka pintu bagi penulis-penulis baru untuk bergabung."}]',
    '[{"type":"paragraph","text":"Di.tulis proudly announces its collaboration with author AAR Nugroho, who becomes one of the premiere content contributors on the platform."},{"type":"paragraph","text":"With a collection of over 400 short stories spanning genres from Romance to Sci-Fi, AAR Nugroho''s works enrich the Di.tulis story library from day one."},{"type":"paragraph","text":"This collaboration signals Di.tulis'' commitment to delivering high-quality content while opening doors for new writers to join."}]',
    'news',
    ARRAY['author', 'collaboration', 'content'],
    true,
    NOW()
  ),
  (
    'Tips Menulis Cerita Pendek yang Memikat Pembaca',
    'Tips for Writing Short Stories That Captivate Readers',
    'tips-menulis-cerpen',
    'Panduan praktis untuk penulis pemula yang ingin menulis cerita pendek yang engaging dan memorable.',
    'A practical guide for beginner writers who want to write engaging and memorable short stories.',
    '[{"type":"heading","text":"1. Mulai dengan Konflik yang Kuat"},{"type":"paragraph","text":"Cerita pendek yang baik langsung memperkenalkan konflik di paragraf pertama. Jangan bertele-tele dengan deskripsi panjang - langsung masuk ke inti cerita."},{"type":"heading","text":"2. Fokus pada Satu Momen"},{"type":"paragraph","text":"Berbeda dengan novel, cerpen harus fokus pada satu momen atau peristiwa penting. Ini yang membuat cerita terasa intens dan berkesan."},{"type":"heading","text":"3. Dialog yang Natural"},{"type":"paragraph","text":"Tulis dialog yang terdengar seperti percakapan nyata. Baca dialog Anda dengan suara keras untuk mengecek apakah terdengar natural."},{"type":"heading","text":"4. Ending yang Memuaskan"},{"type":"paragraph","text":"Ending cerpen tidak harus selalu bahagia, tapi harus terasa memuaskan. Reader harus merasa perjalanannya worth it."}]',
    '[{"type":"heading","text":"1. Start with a Strong Conflict"},{"type":"paragraph","text":"A good short story introduces conflict in the first paragraph. Don''t waste time with lengthy descriptions - get straight to the heart of the story."},{"type":"heading","text":"2. Focus on One Moment"},{"type":"paragraph","text":"Unlike novels, short stories should focus on one pivotal moment or event. This is what makes the story feel intense and memorable."},{"type":"heading","text":"3. Natural Dialogue"},{"type":"paragraph","text":"Write dialogue that sounds like real conversation. Read your dialogue out loud to check if it sounds natural."},{"type":"heading","text":"4. A Satisfying Ending"},{"type":"paragraph","text":"A short story ending doesn''t always have to be happy, but it must feel satisfying. The reader should feel the journey was worth it."}]',
    'tutorial',
    ARRAY['writing', 'tips', 'beginner'],
    true,
    NOW()
  )
ON CONFLICT (slug) DO NOTHING;
