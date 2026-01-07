-- Add language column to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS language text DEFAULT 'English';

-- Policy update (optional, usually covered by existing policies)
-- Verify that the generic update policy allows updating this new column (it usually does for owner)
-- CREATE POLICY "Users can update own songs language" ... (Not needed if generic update exists)
