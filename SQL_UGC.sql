-- 1. Update songs table for User Ownership & Security
ALTER TABLE songs ADD COLUMN IF NOT EXISTS uploader_id uuid REFERENCES auth.users(id);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS file_path text; -- Path in storage
ALTER TABLE songs ADD COLUMN IF NOT EXISTS file_hash text; -- SHA-256 for duplicate check
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_original boolean DEFAULT false;

-- Add constraint to prevent duplicate hashes (Duplicate Protection)
ALTER TABLE songs ADD CONSTRAINT unique_file_hash UNIQUE (file_hash);

-- 2. Create Reports table for Abuse compliance
CREATE TABLE IF NOT EXISTS reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id uuid REFERENCES auth.users(id),
    song_id uuid REFERENCES songs(id),
    reason text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. RLS for Songs (Update existing policies)
-- Everyone can read metadata (for matching)
CREATE POLICY "Public songs metadata is viewable" ON songs FOR SELECT USING (true);
-- Only uploader can update/delete
CREATE POLICY "Users can update own songs" ON songs FOR UPDATE USING (auth.uid() = uploader_id);
CREATE POLICY "Users can delete own songs" ON songs FOR DELETE USING (auth.uid() = uploader_id);

-- 4. RLS for Reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can report songs" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- 5. Storage: Private Bucket for Audio
-- Create bucket 'private_songs' (Private = true is default, we specify explicit public=false just in case)
INSERT INTO storage.buckets (id, name, public) VALUES ('private_songs', 'private_songs', false) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- DENY public access (this is implicit with private buckets, but we don't enable public SELECT)
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload songs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'private_songs' AND auth.role() = 'authenticated');
-- Allow authenticated users to read (needed for generating Signed URLs on server)
CREATE POLICY "Authenticated users can read songs" ON storage.objects FOR SELECT USING (bucket_id = 'private_songs' AND auth.role() = 'authenticated');

-- 7. Likes System
CREATE TABLE IF NOT EXISTS likes (
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    song_id uuid REFERENCES songs(id) NOT NULL,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, song_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can like songs" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike songs" ON likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can see their likes" ON likes FOR SELECT USING (auth.uid() = user_id);
