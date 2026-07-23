-- 1. POLICIES (GATEKEEPERS)
-- Allow anyone to record a view (necessary for analytics)
DROP POLICY IF EXISTS "Public can record views" ON short_video_views;
CREATE POLICY "Public can record views" ON short_video_views 
FOR INSERT WITH CHECK (true);

-- Allow creators to see their own view statistics
DROP POLICY IF EXISTS "Creator reads own video views" ON short_video_views;
CREATE POLICY "Creator reads own video views" ON short_video_views 
FOR SELECT USING (video_id IN (SELECT id FROM short_videos WHERE user_id = auth.uid()));

-- Ensure users can manage their own likes
DROP POLICY IF EXISTS "User manages own likes" ON short_video_likes;
CREATE POLICY "User manages own likes" ON short_video_likes 
FOR ALL USING (auth.uid() = user_id);

-- Ensure public can record clicks
DROP POLICY IF EXISTS "Public can record clicks" ON short_video_clicks;
CREATE POLICY "Public can record clicks" ON short_video_clicks 
FOR INSERT WITH CHECK (true);

-- 2. SCHEMA UPDATES
-- Add comment_count column if it doesn't exist
ALTER TABLE short_videos ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0;

-- 3. OPTIMIZED RPCs
CREATE OR REPLACE FUNCTION increment_video_view_count(vid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE short_videos SET view_count = view_count + 1 WHERE id = vid;
END $$;

CREATE OR REPLACE FUNCTION increment_video_click_count(vid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE short_videos SET click_count = click_count + 1 WHERE id = vid;
END $$;

CREATE OR REPLACE FUNCTION add_video_earnings(vid uuid, amt numeric)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE short_videos SET total_earnings = total_earnings + amt WHERE id = vid;
END $$;

CREATE OR REPLACE FUNCTION increment_video_like_count(vid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE short_videos SET like_count = like_count + 1 WHERE id = vid;
END $$;

CREATE OR REPLACE FUNCTION decrement_video_like_count(vid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE short_videos SET like_count = GREATEST(0, like_count - 1) WHERE id = vid;
END $$;

-- 4. TRIGGERS (AUTOMATED COUNTING)
-- Like Trigger
CREATE OR REPLACE FUNCTION tr_update_video_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM increment_video_like_count(NEW.video_id);
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM decrement_video_like_count(OLD.video_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_video_like_count ON short_video_likes;
CREATE TRIGGER tr_video_like_count
AFTER INSERT OR DELETE ON short_video_likes
FOR EACH ROW EXECUTE FUNCTION tr_update_video_like_count();

-- Comment Trigger
CREATE OR REPLACE FUNCTION tr_update_video_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE short_videos SET comment_count = comment_count + 1 WHERE id = NEW.video_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE short_videos SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_video_comment_count ON short_video_comments;
CREATE TRIGGER tr_video_comment_count
AFTER INSERT OR DELETE ON short_video_comments
FOR EACH ROW EXECUTE FUNCTION tr_update_video_comment_count();

-- 5. RELATIONSHIP FIXES
ALTER TABLE short_video_comments DROP CONSTRAINT IF EXISTS short_video_comments_user_id_profiles_fkey;
ALTER TABLE short_video_comments ADD CONSTRAINT short_video_comments_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE short_videos DROP CONSTRAINT IF EXISTS short_videos_user_id_profiles_fkey;
ALTER TABLE short_videos ADD CONSTRAINT short_videos_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
