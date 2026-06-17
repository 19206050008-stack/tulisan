-- Add interest field to profiles table
-- This field stores user's reading/writing preference from registration

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS interest TEXT CHECK (interest IN ('read', 'write', 'both'));

-- Update existing users to have 'both' as default
UPDATE profiles 
SET interest = 'both' 
WHERE interest IS NULL;

COMMENT ON COLUMN profiles.interest IS 'User interest: read, write, or both';
