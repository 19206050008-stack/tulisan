-- Add banner_url column to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS banner_url TEXT;
