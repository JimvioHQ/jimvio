-- ═══════════════════════════════════════════════════════════════════
-- JIMVIO — UGC + CLIPPING + MONETIZATION FULL SCHEMA
-- Run AFTER the core marketplace schema and community-schema.sql
-- ═══════════════════════════════════════════════════════════════════
-- Tables: ugc_posts, ugc_post_likes, ugc_post_comments, ugc_post_product_tags,
--         ugc_hashtags, ugc_post_hashtags, ugc_reports,
--         clip_likes, clip_comments, clip_view_logs, clip_affiliate_links,
--         creator_earnings (view consolidating all affiliate/clip income)
-- Depends on: profiles, products, vendors, influencers, affiliates,
--             affiliate_links, viral_clips (already created in main schema)
-- ═══════════════════════════════════════════════════════════════════

-- ── STEP 1: EXTEND viral_clips IF MISSING COLUMNS ────────────────────
ALTER TABLE public.viral_clips
  ADD COLUMN IF NOT EXISTS influencer_id   uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_likes     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_comments  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS music_title     text,
  ADD COLUMN IF NOT EXISTS music_artist    text,
  ADD COLUMN IF NOT EXISTS caption         text,
  ADD COLUMN IF NOT EXISTS hashtags        text[],
  ADD COLUMN IF NOT EXISTS is_clipped_from uuid REFERENCES public.viral_clips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS clip_start_sec  numeric,
  ADD COLUMN IF NOT EXISTS clip_end_sec    numeric,
  ADD COLUMN IF NOT EXISTS user_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── STEP 2: CLIP LIKES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clip_likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id     uuid NOT NULL REFERENCES public.viral_clips(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(clip_id, user_id)
);

-- ── STEP 3: CLIP COMMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clip_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id     uuid NOT NULL REFERENCES public.viral_clips(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.clip_comments(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  like_count  integer DEFAULT 0,
  is_deleted  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.clip_comments ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- ── STEP 4: CLIP VIEW LOGS (Fraud prevention — rate-limited unique views) ─
CREATE TABLE IF NOT EXISTS public.clip_view_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id     uuid NOT NULL REFERENCES public.viral_clips(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_hash     text NOT NULL,  -- SHA-256 of IP, not raw IP (privacy-safe)
  viewed_at   timestamptz DEFAULT now()
);
-- Partial unique index: one view per (clip, ip_hash) per hour
CREATE UNIQUE INDEX IF NOT EXISTS idx_clip_view_dedup
  ON public.clip_view_logs (clip_id, ip_hash, date_trunc('hour', viewed_at AT TIME ZONE 'UTC'));

-- ── STEP 5: CLIP AFFILIATE LINKS ─────────────────────────────────────
-- Maps a clip to an affiliate_link so views/clicks are tracked per clip
CREATE TABLE IF NOT EXISTS public.clip_affiliate_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id         uuid NOT NULL REFERENCES public.viral_clips(id) ON DELETE CASCADE,
  affiliate_link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(clip_id, affiliate_link_id)
);

-- ═══════════════════════════════════════════════════════════════════
-- UGC POSTS (Marketplace-level, not community-level)
-- Users can post content tagging marketplace products
-- ═══════════════════════════════════════════════════════════════════

-- ── STEP 6: UGC POSTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption         text CHECK (char_length(caption) <= 2200),
  media           jsonb DEFAULT '[]',   -- [{ url, type: "image"|"video", public_id? }]
  post_type       text DEFAULT 'post'
                  CHECK (post_type IN ('post', 'review', 'unboxing', 'howto', 'deal')),
  -- Engagement
  like_count      integer DEFAULT 0,
  comment_count   integer DEFAULT 0,
  share_count     integer DEFAULT 0,
  view_count      integer DEFAULT 0,
  -- Moderation
  is_published    boolean DEFAULT true,
  is_featured     boolean DEFAULT false,
  reported_count  integer DEFAULT 0,
  moderation_status text DEFAULT 'approved'
                  CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'hidden')),
  -- Timestamps
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── STEP 7: UGC PRODUCT TAGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_post_product_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.ugc_posts(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(post_id, product_id)
);

-- ── STEP 8: UGC HASHTAGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_hashtags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag         text NOT NULL UNIQUE,
  post_count  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_post_hashtags (
  post_id     uuid NOT NULL REFERENCES public.ugc_posts(id) ON DELETE CASCADE,
  hashtag_id  uuid NOT NULL REFERENCES public.ugc_hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

-- ── STEP 9: UGC POST LIKES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_post_likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.ugc_posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ── STEP 10: UGC POST COMMENTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_post_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.ugc_posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.ugc_post_comments(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  like_count  integer DEFAULT 0,
  is_deleted  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.ugc_post_comments ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- ── STEP 11: UGC REPORTS (Moderation) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- One of these must be set
  post_id         uuid REFERENCES public.ugc_posts(id) ON DELETE CASCADE,
  clip_id         uuid REFERENCES public.viral_clips(id) ON DELETE CASCADE,
  comment_id      uuid REFERENCES public.ugc_post_comments(id) ON DELETE CASCADE,
  reason          text NOT NULL CHECK (reason IN (
                    'spam', 'hate_speech', 'misinformation', 'nudity',
                    'violence', 'copyright', 'fraud', 'other'
                  )),
  details         text,
  status          text DEFAULT 'pending'
                  CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════

-- Clip indexes
CREATE INDEX IF NOT EXISTS idx_clip_likes_clip      ON public.clip_likes(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_likes_user      ON public.clip_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_clip_comments_clip   ON public.clip_comments(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_comments_user   ON public.clip_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_clip_view_logs_clip  ON public.clip_view_logs(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_view_logs_time  ON public.clip_view_logs(viewed_at);
CREATE INDEX IF NOT EXISTS idx_viral_clips_influencer ON public.viral_clips(influencer_id);
CREATE INDEX IF NOT EXISTS idx_viral_clips_user     ON public.viral_clips(user_id);
CREATE INDEX IF NOT EXISTS idx_viral_clips_product  ON public.viral_clips(product_id);
CREATE INDEX IF NOT EXISTS idx_viral_clips_active   ON public.viral_clips(is_active, total_views DESC);

-- UGC indexes
CREATE INDEX IF NOT EXISTS idx_ugc_posts_user       ON public.ugc_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_ugc_posts_published  ON public.ugc_posts(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ugc_posts_modstatus  ON public.ugc_posts(moderation_status);
CREATE INDEX IF NOT EXISTS idx_ugc_product_tags_post    ON public.ugc_post_product_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_ugc_product_tags_product ON public.ugc_post_product_tags(product_id);
CREATE INDEX IF NOT EXISTS idx_ugc_likes_post       ON public.ugc_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_ugc_likes_user       ON public.ugc_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_ugc_comments_post    ON public.ugc_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_ugc_hashtags_tag     ON public.ugc_hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_ugc_reports_status   ON public.ugc_reports(status);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.clip_likes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_view_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_post_product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_hashtags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_post_hashtags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_post_likes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_post_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_reports          ENABLE ROW LEVEL SECURITY;

-- CLIP LIKES
CREATE POLICY "clip_likes_select_all"   ON public.clip_likes   FOR SELECT USING (true);
CREATE POLICY "clip_likes_insert_own"   ON public.clip_likes   FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clip_likes_delete_own"   ON public.clip_likes   FOR DELETE USING (auth.uid() = user_id);

-- CLIP COMMENTS
CREATE POLICY "clip_comments_select_all"    ON public.clip_comments FOR SELECT USING (is_deleted = false);
CREATE POLICY "clip_comments_insert_auth"   ON public.clip_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clip_comments_update_own"    ON public.clip_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clip_comments_delete_own"    ON public.clip_comments FOR DELETE USING (auth.uid() = user_id);

-- CLIP VIEW LOGS (insert-only; users can't read others' view logs)
CREATE POLICY "clip_view_logs_insert_any"   ON public.clip_view_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "clip_view_logs_select_own"   ON public.clip_view_logs FOR SELECT USING (auth.uid() = user_id);

-- CLIP AFFILIATE LINKS
CREATE POLICY "clip_aff_links_select_all"   ON public.clip_affiliate_links FOR SELECT USING (true);

-- UGC POSTS
CREATE POLICY "ugc_posts_select_published"  ON public.ugc_posts FOR SELECT
  USING (is_published = true AND moderation_status = 'approved');
CREATE POLICY "ugc_posts_select_own"        ON public.ugc_posts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "ugc_posts_insert_auth"       ON public.ugc_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ugc_posts_update_own"        ON public.ugc_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ugc_posts_delete_own"        ON public.ugc_posts FOR DELETE
  USING (auth.uid() = user_id);

-- UGC PRODUCT TAGS
CREATE POLICY "ugc_tags_select_all"     ON public.ugc_post_product_tags FOR SELECT USING (true);
CREATE POLICY "ugc_tags_manage_own"     ON public.ugc_post_product_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.ugc_posts p
    WHERE p.id = ugc_post_product_tags.post_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ugc_posts p
    WHERE p.id = ugc_post_product_tags.post_id AND p.user_id = auth.uid()
  ));

-- UGC HASHTAGS
CREATE POLICY "ugc_hashtags_select_all" ON public.ugc_hashtags FOR SELECT USING (true);
CREATE POLICY "ugc_hashtags_insert_auth" ON public.ugc_hashtags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ugc_post_hashtags_select_all" ON public.ugc_post_hashtags FOR SELECT USING (true);
CREATE POLICY "ugc_post_hashtags_manage_own" ON public.ugc_post_hashtags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.ugc_posts p
    WHERE p.id = ugc_post_hashtags.post_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ugc_posts p
    WHERE p.id = ugc_post_hashtags.post_id AND p.user_id = auth.uid()
  ));

-- UGC LIKES
CREATE POLICY "ugc_likes_select_all"    ON public.ugc_post_likes FOR SELECT USING (true);
CREATE POLICY "ugc_likes_insert_own"    ON public.ugc_post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ugc_likes_delete_own"    ON public.ugc_post_likes FOR DELETE USING (auth.uid() = user_id);

-- UGC COMMENTS
CREATE POLICY "ugc_comments_select_all"  ON public.ugc_post_comments FOR SELECT USING (is_deleted = false);
CREATE POLICY "ugc_comments_insert_auth" ON public.ugc_post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ugc_comments_update_own"  ON public.ugc_post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ugc_comments_delete_own"  ON public.ugc_post_comments FOR DELETE USING (auth.uid() = user_id);

-- UGC REPORTS
CREATE POLICY "ugc_reports_insert_auth"  ON public.ugc_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "ugc_reports_select_own"   ON public.ugc_reports FOR SELECT USING (auth.uid() = reporter_id);

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS: keep like/comment counter columns in sync
-- ═══════════════════════════════════════════════════════════════════

-- UGC post like counter
CREATE OR REPLACE FUNCTION public.trg_ugc_like_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ugc_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ugc_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_ugc_like_counter ON public.ugc_post_likes;
CREATE TRIGGER trg_ugc_like_counter
  AFTER INSERT OR DELETE ON public.ugc_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_ugc_like_counter();

-- UGC post comment counter
CREATE OR REPLACE FUNCTION public.trg_ugc_comment_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ugc_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ugc_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_ugc_comment_counter ON public.ugc_post_comments;
CREATE TRIGGER trg_ugc_comment_counter
  AFTER INSERT OR DELETE ON public.ugc_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_ugc_comment_counter();

-- Clip like counter
CREATE OR REPLACE FUNCTION public.trg_clip_like_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.viral_clips SET total_likes = total_likes + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.viral_clips SET total_likes = GREATEST(total_likes - 1, 0) WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_clip_like_counter ON public.clip_likes;
CREATE TRIGGER trg_clip_like_counter
  AFTER INSERT OR DELETE ON public.clip_likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_clip_like_counter();

-- Clip comment counter
CREATE OR REPLACE FUNCTION public.trg_clip_comment_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.viral_clips SET total_comments = total_comments + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.viral_clips SET total_comments = GREATEST(total_comments - 1, 0) WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_clip_comment_counter ON public.clip_comments;
CREATE TRIGGER trg_clip_comment_counter
  AFTER INSERT OR DELETE ON public.clip_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_clip_comment_counter();

-- Hashtag post_count counter
CREATE OR REPLACE FUNCTION public.trg_hashtag_post_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ugc_hashtags SET post_count = post_count + 1 WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ugc_hashtags SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.hashtag_id;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_hashtag_post_counter ON public.ugc_post_hashtags;
CREATE TRIGGER trg_hashtag_post_counter
  AFTER INSERT OR DELETE ON public.ugc_post_hashtags
  FOR EACH ROW EXECUTE FUNCTION public.trg_hashtag_post_counter();
