-- 1. Add Read Status to Messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- 2. Create Notifications Table (for generic alerts like "Match Accepted")
CREATE TABLE IF NOT EXISTS notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    type text NOT NULL, -- 'match_accepted', 'new_match', 'system'
    content text NOT NULL,
    link text,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 3. RLS for Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System/Users can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (true); -- Ideally restricted, but for this MVP, we allow client-side triggers (e.g., when User A accepts User B, User A inserts notif for User B)

CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);
