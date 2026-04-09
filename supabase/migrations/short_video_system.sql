-- ============================================================
-- SHORT VIDEO MANAGEMENT SYSTEM — Isolated New Tables
-- Creator Studio feature ONLY — does not touch any existing tables
-- ============================================================

-- 1. short_videos — core video entity
CREATE TABLE IF NOT EXISTS short_videos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      uuid NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  video_url       text NOT NULL,           -- Cloudinary/storage URL
  thumbnail_url   text,
  duration_sec    integer DEFAULT 0,       -- video length in seconds
  product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  community_id    uuid REFERENCES communities(id) ON DELETE SET NULL,
  video_type      varchar(50) DEFAULT 'product',
  external_link   text,
  status          text NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing', 'active', 'paused', 'deleted')),
  -- Denormalised counters
  view_count      bigint NOT NULL DEFAULT 0,
  like_count      bigint NOT NULL DEFAULT 0,
  click_count     bigint NOT NULL DEFAULT 0,
  total_earnings  numeric(14,4) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_short_videos_creator    ON short_videos(creator_id);
CREATE INDEX IF NOT EXISTS idx_short_videos_user       ON short_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_short_videos_status     ON short_videos(status);
CREATE INDEX IF NOT EXISTS idx_short_videos_product    ON short_videos(product_id);
CREATE INDEX IF NOT EXISTS idx_short_videos_community  ON short_videos(community_id);

-- 2. short_video_views
CREATE TABLE IF NOT EXISTS short_video_views (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id        uuid NOT NULL REFERENCES short_videos(id) ON DELETE CASCADE,
  viewer_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  watch_time_sec  integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, viewer_id)
);

-- 3. short_video_likes
CREATE TABLE IF NOT EXISTS short_video_likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    uuid NOT NULL REFERENCES short_videos(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);

-- 4. short_video_clicks
CREATE TABLE IF NOT EXISTS short_video_clicks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     uuid NOT NULL REFERENCES short_videos(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id   uuid REFERENCES products(id) ON DELETE SET NULL,
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  converted    boolean NOT NULL DEFAULT false,
  order_id     uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 5. short_video_earnings
CREATE TABLE IF NOT EXISTS short_video_earnings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     uuid NOT NULL REFERENCES short_videos(id) ON DELETE CASCADE,
  creator_id   uuid NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  event_type   text NOT NULL CHECK (event_type IN ('view', 'click', 'sale')),
  amount       numeric(14,4) NOT NULL DEFAULT 0,
  currency     text NOT NULL DEFAULT 'RWF',
  reference_id uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 6. short_video_comments
CREATE TABLE IF NOT EXISTS short_video_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    uuid NOT NULL REFERENCES short_videos(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS Policies (Safely recreatable)
-- ============================================================

ALTER TABLE short_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_video_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_video_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_video_comments ENABLE ROW LEVEL SECURITY;

-- short_videos
DROP POLICY IF EXISTS "Creator manages own videos" ON short_videos;
CREATE POLICY "Creator manages own videos" ON short_videos FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public reads active videos" ON short_videos;
CREATE POLICY "Public reads active videos" ON short_videos FOR SELECT USING (status = 'active');

-- short_video_views
DROP POLICY IF EXISTS "Insert own view" ON short_video_views;
CREATE POLICY "Insert own view" ON short_video_views FOR INSERT WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

DROP POLICY IF EXISTS "Creator reads own video views" ON short_video_views;
CREATE POLICY "Creator reads own video views" ON short_video_views FOR SELECT USING (video_id IN (SELECT id FROM short_videos WHERE user_id = auth.uid()));

-- short_video_likes
DROP POLICY IF EXISTS "User manages own likes" ON short_video_likes;
CREATE POLICY "User manages own likes" ON short_video_likes FOR ALL USING (auth.uid() = user_id);

-- short_video_clicks
DROP POLICY IF EXISTS "Insert own click" ON short_video_clicks;
CREATE POLICY "Insert own click" ON short_video_clicks FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Creator reads clicks on own videos" ON short_video_clicks;
CREATE POLICY "Creator reads clicks on own videos" ON short_video_clicks FOR SELECT USING (video_id IN (SELECT id FROM short_videos WHERE user_id = auth.uid()));

-- short_video_earnings
DROP POLICY IF EXISTS "Creator reads own earnings" ON short_video_earnings;
CREATE POLICY "Creator reads own earnings" ON short_video_earnings FOR SELECT USING (creator_id IN (SELECT id FROM influencers WHERE user_id = auth.uid()));

-- short_video_comments
DROP POLICY IF EXISTS "Public reads comments" ON short_video_comments;
CREATE POLICY "Public reads comments" ON short_video_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Logged in users can comment" ON short_video_comments;
CREATE POLICY "Logged in users can comment" ON short_video_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users manage own comments" ON short_video_comments;
CREATE POLICY "Users manage own comments" ON short_video_comments FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Attribution Meta (Add to existing orders table)
-- ============================================================
-- Ensure columns exist safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'metadata') THEN
    ALTER TABLE public.orders ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'metadata') THEN
    ALTER TABLE public.order_items ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ============================================================
-- Helper: auto-update short_videos.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION touch_short_video_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_short_videos_updated_at ON short_videos;
CREATE TRIGGER trg_short_videos_updated_at
  BEFORE UPDATE ON short_videos
  FOR EACH ROW EXECUTE FUNCTION touch_short_video_updated_at();