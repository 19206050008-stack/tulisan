-- ================================================================
-- RLS POLICIES untuk Di.tulis
-- Jalankan di Supabase SQL Editor
-- ================================================================

-- ── STORIES TABLE ────────────────────────────────────────────────
-- Enable RLS (jika belum)
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa INSERT story mereka sendiri
CREATE POLICY "Users can insert their own stories"
ON stories FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Policy: User bisa UPDATE story mereka sendiri
CREATE POLICY "Users can update their own stories"
ON stories FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Policy: User bisa DELETE story mereka sendiri
CREATE POLICY "Users can delete their own stories"
ON stories FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- Policy: Semua orang bisa READ published stories
CREATE POLICY "Anyone can read published stories"
ON stories FOR SELECT
TO public
USING (status = 'published');

-- Policy: User bisa READ draft stories mereka sendiri
CREATE POLICY "Users can read their own draft stories"
ON stories FOR SELECT
TO authenticated
USING (auth.uid() = author_id);

-- ── CHAPTERS TABLE ───────────────────────────────────────────────
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa INSERT chapter untuk story mereka
CREATE POLICY "Users can insert chapters for their stories"
ON chapters FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stories 
    WHERE stories.id = chapters.story_id 
    AND stories.author_id = auth.uid()
  )
);

-- Policy: User bisa UPDATE chapter dari story mereka
CREATE POLICY "Users can update their story chapters"
ON chapters FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stories 
    WHERE stories.id = chapters.story_id 
    AND stories.author_id = auth.uid()
  )
);

-- Policy: User bisa DELETE chapter dari story mereka
CREATE POLICY "Users can delete their story chapters"
ON chapters FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stories 
    WHERE stories.id = chapters.story_id 
    AND stories.author_id = auth.uid()
  )
);

-- Policy: Public bisa READ published chapters
CREATE POLICY "Anyone can read published chapters"
ON chapters FOR SELECT
TO public
USING (
  status = 'published' OR
  EXISTS (
    SELECT 1 FROM stories 
    WHERE stories.id = chapters.story_id 
    AND stories.status = 'published'
  )
);

-- Policy: User bisa READ chapters dari story mereka (termasuk draft)
CREATE POLICY "Users can read their own story chapters"
ON chapters FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stories 
    WHERE stories.id = chapters.story_id 
    AND stories.author_id = auth.uid()
  )
);

-- ── PROFILES TABLE ───────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Semua orang bisa READ profiles
CREATE POLICY "Anyone can read profiles"
ON profiles FOR SELECT
TO public
USING (true);

-- Policy: User bisa UPDATE profile mereka sendiri
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ── COMMENTS TABLE ───────────────────────────────────────────────
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: Semua orang bisa READ comments
CREATE POLICY "Anyone can read comments"
ON comments FOR SELECT
TO public
USING (true);

-- Policy: Authenticated users bisa INSERT comments
CREATE POLICY "Authenticated users can insert comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: User bisa UPDATE comment mereka sendiri
CREATE POLICY "Users can update their own comments"
ON comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: User bisa DELETE comment mereka sendiri
CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ── VOTES TABLE ──────────────────────────────────────────────────
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa INSERT vote mereka
CREATE POLICY "Users can insert their votes"
ON votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: User bisa DELETE vote mereka
CREATE POLICY "Users can delete their votes"
ON votes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Public bisa READ votes (untuk count likes)
CREATE POLICY "Anyone can read votes"
ON votes FOR SELECT
TO public
USING (true);

-- ── LIBRARY_SAVES TABLE ──────────────────────────────────────────
ALTER TABLE library_saves ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa INSERT save mereka
CREATE POLICY "Users can save stories"
ON library_saves FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: User bisa DELETE save mereka
CREATE POLICY "Users can unsave stories"
ON library_saves FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: User bisa READ save mereka sendiri
CREATE POLICY "Users can read their own saves"
ON library_saves FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ================================================================
-- SELESAI - Policies sudah ditambahkan
-- ================================================================
