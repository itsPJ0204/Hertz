
-- Fix missing column issue
ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT;

-- Also verify other columns just in case
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Re-apply RLS just to be safe
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
