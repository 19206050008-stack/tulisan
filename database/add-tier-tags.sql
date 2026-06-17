-- ===================================================================
-- SQL Script: Add Tier Tags to All Existing Stories
-- ===================================================================
-- Run this in Supabase SQL Editor
-- This will:
--   1. Calculate total word count for each story (from all chapters)
--   2. Determine appropriate tier (Pendek/Sedang/Panjang)
--   3. Update story tags with tier
-- ===================================================================

-- Step 1: Create temporary function to count words from HTML
CREATE OR REPLACE FUNCTION count_words_from_html(content TEXT)
RETURNS INTEGER AS $$
DECLARE
  clean_text TEXT;
  word_count INTEGER;
BEGIN
  IF content IS NULL OR content = '' THEN
    RETURN 0;
  END IF;
  
  -- Strip HTML tags
  clean_text := regexp_replace(content, '<[^>]*>', ' ', 'g');
  
  -- Count words (split by whitespace)
  word_count := array_length(
    regexp_split_to_array(trim(regexp_replace(clean_text, '\s+', ' ', 'g')), ' '),
    1
  );
  
  RETURN COALESCE(word_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create function to determine tier based on word count
CREATE OR REPLACE FUNCTION determine_tier(word_count INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF word_count > 0 AND word_count <= 700 THEN
    RETURN 'Pendek';
  ELSIF word_count > 700 AND word_count <= 1000 THEN
    RETURN 'Sedang';
  ELSIF word_count > 1000 AND word_count <= 5000 THEN
    RETURN 'Panjang';
  ELSE
    RETURN NULL; -- Stories > 5000 words or 0 words
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update all stories with appropriate tier tags
DO $$
DECLARE
  story_record RECORD;
  total_words INTEGER;
  tier_tag TEXT;
  new_tags TEXT[];
  updated_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  -- Loop through all stories
  FOR story_record IN SELECT id, title, tags FROM stories LOOP
    
    -- Calculate total word count from all chapters
    SELECT COALESCE(SUM(count_words_from_html(content)), 0)
    INTO total_words
    FROM chapters
    WHERE story_id = story_record.id;
    
    -- Determine tier
    tier_tag := determine_tier(total_words);
    
    -- Skip if no tier (0 words or > 5000 words)
    IF tier_tag IS NULL THEN
      RAISE NOTICE 'Story "%" (%) - % words: NO TIER (skipped)', 
        story_record.title, story_record.id, total_words;
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;
    
    -- Prepare new tags array
    -- Remove old tier tags (Pendek, Sedang, Panjang) if exist
    new_tags := ARRAY(
      SELECT unnest(COALESCE(story_record.tags, ARRAY[]::TEXT[]))
      WHERE unnest NOT IN ('Pendek', 'Sedang', 'Panjang')
    );
    
    -- Add new tier tag
    new_tags := array_append(new_tags, tier_tag);
    
    -- Update story
    UPDATE stories 
    SET tags = new_tags,
        updated_at = NOW()
    WHERE id = story_record.id;
    
    updated_count := updated_count + 1;
    
    RAISE NOTICE 'Story "%" (%) - % words → %', 
      story_record.title, story_record.id, total_words, tier_tag;
      
  END LOOP;
  
  RAISE NOTICE '================================';
  RAISE NOTICE 'SUMMARY:';
  RAISE NOTICE 'Updated: %', updated_count;
  RAISE NOTICE 'Skipped: %', skipped_count;
  RAISE NOTICE 'Total: %', updated_count + skipped_count;
  RAISE NOTICE '================================';
END $$;

-- Step 4: Clean up temporary functions (optional)
-- Uncomment if you want to remove the helper functions after running
-- DROP FUNCTION IF EXISTS count_words_from_html(TEXT);
-- DROP FUNCTION IF EXISTS determine_tier(INTEGER);

-- ===================================================================
-- VERIFICATION QUERY
-- Run this to see the results after update
-- ===================================================================
SELECT 
  s.id,
  s.title,
  s.tags,
  COUNT(c.id) as chapter_count,
  SUM(count_words_from_html(c.content)) as total_words
FROM stories s
LEFT JOIN chapters c ON c.story_id = s.id
GROUP BY s.id, s.title, s.tags
ORDER BY total_words DESC
LIMIT 20;
