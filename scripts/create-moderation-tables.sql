-- Moderation System Tables

-- Stories moderation status field addition (run this in Supabase SQL Editor)
ALTER TABLE stories ADD COLUMN IF NOT EXISTS 
  moderation_status text DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged'));

ALTER TABLE stories ADD COLUMN IF NOT EXISTS 
  moderation_flags text[];

ALTER TABLE stories ADD COLUMN IF NOT EXISTS 
  moderation_score float DEFAULT 0;

ALTER TABLE stories ADD COLUMN IF NOT EXISTS 
  last_moderated_at timestamptz DEFAULT now();

-- Moderation review queue
CREATE TABLE IF NOT EXISTS moderation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id),
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  notes text,
  confidence_score float,
  flag_reasons text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

-- User reports
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  report_type text CHECK (report_type IN ('inappropriate', 'copyright', 'spam', 'other')),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_moderation ON stories(moderation_status) WHERE moderation_status != 'approved';
CREATE INDEX IF NOT EXISTS idx_moderation_reviews_queue ON moderation_reviews(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status, created_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE moderation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Policies for moderation_reviews
DROP POLICY IF EXISTS moderation_reviews_select ON moderation_reviews;
CREATE POLICY moderation_reviews_select ON moderation_reviews 
  FOR SELECT USING (
    auth.uid() = reviewer_id OR 
    EXISTS (SELECT 1 FROM stories WHERE stories.id = moderation_reviews.story_id AND stories.author_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS moderation_reviews_insert ON moderation_reviews;
CREATE POLICY moderation_reviews_insert ON moderation_reviews 
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Policies for content_reports  
DROP POLICY IF EXISTS content_reports_insert ON content_reports;
CREATE POLICY content_reports_insert ON content_reports 
  FOR INSERT WITH CHECK (auth.uid() = COALESCE(reporter_id, auth.uid()));

DROP POLICY IF EXISTS content_reports_select ON content_reports;
CREATE POLICY content_reports_select ON content_reports 
  FOR SELECT USING (
    auth.uid() = reporter_id OR 
    EXISTS (SELECT 1 FROM stories WHERE stories.id = content_reports.story_id AND stories.author_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
