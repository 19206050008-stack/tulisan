-- Create banners storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to banners bucket
DROP POLICY IF EXISTS "Public read access to banners" ON storage.objects;
CREATE POLICY "Public read access to banners"
ON storage.objects
FOR SELECT
USING (bucket_id = 'banners');

-- Policy: Allow authenticated users to upload to banners bucket
DROP POLICY IF EXISTS "Authenticated users can upload banners" ON storage.objects;
CREATE POLICY "Authenticated users can upload banners"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow users to update their own uploads
DROP POLICY IF EXISTS "Users can update their own banner uploads" ON storage.objects;
CREATE POLICY "Users can update their own banner uploads"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete their own banner uploads" ON storage.objects;
CREATE POLICY "Users can delete their own banner uploads"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);
