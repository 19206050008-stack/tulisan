-- Audio Feature Migration - 2026-06-22
-- Adds support for user audio requests and admin approval workflow

-- ========================================
-- audio_requests Table (Pending User Requests)
-- ========================================
CREATE TABLE IF NOT EXISTS audio_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,  -- null = whole story request
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
    priority INTEGER DEFAULT 0,
    notes TEXT,
    estimated_duration_seconds INTEGER,
    voice_style TEXT DEFAULT 'narrative' CHECK (voice_style IN ('narrative', 'dramatic', 'conversational')),
    language_code TEXT DEFAULT 'id-ID',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT
);

CREATE INDEX idx_audio_requests_story_id ON audio_requests(story_id);
CREATE INDEX idx_audio_requests_chapter_id ON audio_requests(chapter_id);
CREATE INDEX idx_audio_requests_requested_by ON audio_requests(requested_by);
CREATE INDEX idx_audio_requests_status_priority ON audio_requests(status, priority) WHERE status = 'pending';

-- ========================================
-- audio_contents Table (Approved Audio Files)
-- ========================================
CREATE TABLE IF NOT EXISTS audio_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,  -- null = entire story audio
    audio_request_id UUID REFERENCES audio_requests(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'mp3' CHECK (format IN ('mp3', 'aac', 'opus', 'wav')),
    bitrate INTEGER DEFAULT 128,  -- kbps
    sample_rate INTEGER DEFAULT 44100,  -- Hz
    duration_seconds INTEGER NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'ready', 'failed', 'expired')),
    tts_provider TEXT,
    tts_model TEXT,
    tts_voice_id TEXT,
    transcription TEXT,
    waveform_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audio_contents_story_id ON audio_contents(story_id);
CREATE INDEX idx_audio_contents_chapter_id ON audio_contents(chapter_id);
CREATE INDEX idx_audio_contents_storage_path ON audio_contents(storage_path);
CREATE INDEX idx_audio_contents_status ON audio_contents(status) WHERE status = 'ready';

-- ========================================
-- audio_downloads Table (Tracking Downloads)
-- ========================================
CREATE TABLE IF NOT EXISTS audio_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audio_content_id UUID NOT NULL REFERENCES audio_contents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    download_method TEXT DEFAULT 'free' CHECK (download_method IN ('free', 'premium', 'credit_purchased'))
);

CREATE INDEX idx_audio_downloads_audio_content_id ON audio_downloads(audio_content_id);
CREATE INDEX idx_audio_downloads_user_id ON audio_downloads(user_id);
CREATE INDEX idx_audio_downloads_downloaded_at ON audio_downloads(downloaded_at DESC);

-- ========================================
-- Add is_audio_ready flag to stories table
-- ========================================
ALTER TABLE stories ADD COLUMN IF NOT EXISTS has_audio BOOLEAN DEFAULT FALSE;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS audio_approval_needed BOOLEAN DEFAULT TRUE;

-- Update existing completed stories to be eligible for audio
UPDATE stories SET audio_approval_needed = FALSE WHERE is_completed = TRUE AND author_id IS NOT NULL;

-- ========================================
-- Storage Bucket for Audio Files
-- ========================================
-- Run this manually or add to your deployment process:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', false);
-- Note: You'll need to configure RLS policies for this bucket separately

-- ========================================
-- Sample Data (Optional - for testing)
-- ========================================
-- INSERT INTO audio_requests (story_id, requested_by, status, voice_style)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'pending', 'narrative');
