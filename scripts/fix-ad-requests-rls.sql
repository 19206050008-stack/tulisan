-- Fix RLS policies for ad_requests table
-- This allows admins to see all ad requests, and users to see only their own

-- Enable RLS on ad_requests
ALTER TABLE ad_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own ad requests
DROP POLICY IF EXISTS "Users can view their own ad requests" ON ad_requests;
CREATE POLICY "Users can view their own ad requests"
ON ad_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can create their own ad requests
DROP POLICY IF EXISTS "Users can create their own ad requests" ON ad_requests;
CREATE POLICY "Users can create their own ad requests"
ON ad_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own ad requests
DROP POLICY IF EXISTS "Users can update their own ad requests" ON ad_requests;
CREATE POLICY "Users can update their own ad requests"
ON ad_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own ad requests
DROP POLICY IF EXISTS "Users can delete their own ad requests" ON ad_requests;
CREATE POLICY "Users can delete their own ad requests"
ON ad_requests
FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Admins can see ALL ad requests
DROP POLICY IF EXISTS "Admins can view all ad requests" ON ad_requests;
CREATE POLICY "Admins can view all ad requests"
ON ad_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Policy: Admins can update ANY ad request
DROP POLICY IF EXISTS "Admins can update any ad request" ON ad_requests;
CREATE POLICY "Admins can update any ad request"
ON ad_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Policy: Admins can delete ANY ad request
DROP POLICY IF EXISTS "Admins can delete any ad request" ON ad_requests;
CREATE POLICY "Admins can delete any ad request"
ON ad_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Policy: Public can see published ad requests
-- This allows the AdPopup to show published ads to all visitors
DROP POLICY IF EXISTS "Public can view published ads" ON ad_requests;
CREATE POLICY "Public can view published ads"
ON ad_requests
FOR SELECT
USING (status = 'published');
