import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== 'fix-rls-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = `
-- Admin policies for stories (UPDATE, DELETE by admin)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stories' AND policyname = 'admin_manage_stories') THEN
    CREATE POLICY "admin_manage_stories" ON stories FOR ALL TO authenticated
    USING (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    )
    WITH CHECK (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
  END IF;
END $$;

-- Admin policies for profiles (admin can update any profile)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'admin_manage_profiles') THEN
    CREATE POLICY "admin_manage_profiles" ON profiles FOR ALL TO authenticated
    USING (
      id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    )
    WITH CHECK (
      id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
  END IF;
END $$;

-- Admin policies for comments (admin can delete any comment)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND policyname = 'admin_manage_comments') THEN
    CREATE POLICY "admin_manage_comments" ON comments FOR ALL TO authenticated
    USING (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    )
    WITH CHECK (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
  END IF;
END $$;

-- Admin policies for notifications (admin can manage)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'admin_manage_notifications') THEN
    CREATE POLICY "admin_manage_notifications" ON notifications FOR ALL TO authenticated
    USING (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
  END IF;
END $$;

-- Admin policies for forum_threads (admin can manage)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'forum_threads' AND policyname = 'admin_manage_threads') THEN
    CREATE POLICY "admin_manage_threads" ON forum_threads FOR ALL TO authenticated
    USING (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
  END IF;
END $$;

-- Admin policies for forum_posts (admin can manage)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'forum_posts' AND policyname = 'admin_manage_posts') THEN
    CREATE POLICY "admin_manage_posts" ON forum_posts FOR ALL TO authenticated
    USING (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
  END IF;
END $$;

-- Fix: ensure stories table has RLS enabled
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Also allow anon to read published stories and profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stories' AND policyname = 'anon_read_published') THEN
    CREATE POLICY "anon_read_published" ON stories FOR SELECT TO anon USING (status = 'published');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'anon_read_profiles') THEN
    CREATE POLICY "anon_read_profiles" ON profiles FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stories' AND policyname = 'auth_read_stories') THEN
    CREATE POLICY "auth_read_stories" ON stories FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'auth_read_profiles') THEN
    CREATE POLICY "auth_read_profiles" ON profiles FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
`;

  return NextResponse.json({
    message: 'Run this SQL in Supabase SQL Editor to fix admin CRUD permissions',
    sql,
  });
}
