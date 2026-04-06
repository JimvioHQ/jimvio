-- ============================================================
-- MIGRATION 042: UGC & CLIPPING MODULE (FULL REBUILD)
-- ============================================================
-- Drops the old social-feed tables and creates the proper
-- campaign/submission/payout-per-view system.
--
-- Run this in Supabase SQL Editor (superuser). Safe to run once.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1.  DROP OLD SOCIAL-FEED TABLES (wrong mental model)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.ugc_post_product_tags  CASCADE;
DROP TABLE IF EXISTS public.ugc_post_hashtags      CASCADE;
DROP TABLE IF EXISTS public.ugc_post_comments      CASCADE;
DROP TABLE IF EXISTS public.ugc_post_likes         CASCADE;
DROP TABLE IF EXISTS public.ugc_posts              CASCADE;
DROP TABLE IF EXISTS public.ugc_hashtags           CASCADE;
DROP TABLE IF EXISTS public.ugc_reports            CASCADE;
DROP TABLE IF EXISTS public.clip_affiliate_links   CASCADE;
DROP TABLE IF EXISTS public.clip_view_logs         CASCADE;
DROP TABLE IF EXISTS public.clip_likes             CASCADE;
DROP TABLE IF EXISTS public.clip_comments          CASCADE;
DROP TABLE IF EXISTS public.viral_clips            CASCADE;
DROP TABLE IF EXISTS public.clip_engagements       CASCADE;
DROP TABLE IF EXISTS public.influencer_campaigns   CASCADE;

-- Drop old indexes that referenced above tables (if they survived)
DROP INDEX IF EXISTS public.idx_campaigns_vendor_id;
DROP INDEX IF EXISTS public.idx_campaigns_status;
DROP INDEX IF EXISTS public.idx_viral_clips_vendor_id;

-- Drop old ENUMs that are no longer needed
-- (keep campaign_status — it's used by influencer_campaigns which we just dropped,
-- but we'll recreate our own ugc_campaign_status below)
DROP TYPE IF EXISTS ugc_campaign_type   CASCADE;
DROP TYPE IF EXISTS ugc_campaign_status CASCADE;
DROP TYPE IF EXISTS ugc_submission_status CASCADE;
DROP TYPE IF EXISTS ugc_platform          CASCADE;

-- ────────────────────────────────────────────────────────────
-- 2.  NEW ENUMs
-- ────────────────────────────────────────────────────────────
CREATE TYPE ugc_campaign_type   AS ENUM ('clipping', 'ugc');
CREATE TYPE ugc_campaign_status AS ENUM ('draft','active','paused','completed','cancelled');
CREATE TYPE ugc_submission_status AS ENUM ('pending','approved','rejected','removed');
CREATE TYPE ugc_platform          AS ENUM ('tiktok','instagram','youtube','x');

-- ────────────────────────────────────────────────────────────
-- 3.  ugc_campaigns  (brand creates, influencers apply)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.ugc_campaigns (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id                uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title                   text NOT NULL,
  description             text,
  campaign_type           ugc_campaign_type   NOT NULL DEFAULT 'clipping',
  status                  ugc_campaign_status NOT NULL DEFAULT 'draft',
  rate_per_1k_views       numeric NOT NULL DEFAULT 3.00,
  total_budget            numeric NOT NULL DEFAULT 0,
  spent_budget            numeric NOT NULL DEFAULT 0,
  remaining_budget        numeric GENERATED ALWAYS AS (total_budget - spent_budget) STORED,
  max_payout_per_sub      numeric DEFAULT 400,
  allowed_platforms       text[]  DEFAULT ARRAY['tiktok','instagram','youtube','x'],
  content_guidelines      text,
  example_content_urls    text[],
  requires_face           boolean DEFAULT false,
  submission_count        integer DEFAULT 0,
  approved_count          integer DEFAULT 0,
  total_views_tracked     bigint  DEFAULT 0,
  starts_at               timestamptz,
  ends_at                 timestamptz,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_ugc_campaigns_brand_id ON public.ugc_campaigns(brand_id);
CREATE INDEX idx_ugc_campaigns_status   ON public.ugc_campaigns(status);
CREATE INDEX idx_ugc_campaigns_type     ON public.ugc_campaigns(campaign_type);

CREATE TRIGGER update_ugc_campaigns_updated_at
  BEFORE UPDATE ON public.ugc_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 4.  ugc_submissions  (influencer submits a content URL)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.ugc_submissions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  influencer_id       uuid NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  post_url            text NOT NULL,
  platform            ugc_platform NOT NULL,
  media_file_url      text,
  caption             text,
  status              ugc_submission_status NOT NULL DEFAULT 'pending',
  rejection_reason    text,
  reviewed_by         uuid REFERENCES public.profiles(id),
  reviewed_at         timestamptz,
  total_views_earned  bigint  DEFAULT 0,
  total_earnings      numeric DEFAULT 0,
  last_synced_at      timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(campaign_id, post_url)
);

CREATE INDEX idx_ugc_submissions_campaign_id    ON public.ugc_submissions(campaign_id);
CREATE INDEX idx_ugc_submissions_influencer_id  ON public.ugc_submissions(influencer_id);
CREATE INDEX idx_ugc_submissions_status         ON public.ugc_submissions(status);

CREATE TRIGGER update_ugc_submissions_updated_at
  BEFORE UPDATE ON public.ugc_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- keep submission_count on campaigns in sync
CREATE OR REPLACE FUNCTION sync_ugc_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ugc_campaigns
  SET
    submission_count = (
      SELECT COUNT(*) FROM public.ugc_submissions WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
    ),
    approved_count = (
      SELECT COUNT(*) FROM public.ugc_submissions WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) AND status = 'approved'
    )
  WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ugc_submission_count
  AFTER INSERT OR UPDATE OR DELETE ON public.ugc_submissions
  FOR EACH ROW EXECUTE FUNCTION sync_ugc_submission_count();

-- ────────────────────────────────────────────────────────────
-- 5.  ugc_view_snapshots  (daily view deltas recorded by cron)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.ugc_view_snapshots (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id           uuid NOT NULL REFERENCES public.ugc_submissions(id) ON DELETE CASCADE,
  views_at_snapshot       bigint  NOT NULL DEFAULT 0,
  delta_views             bigint  NOT NULL DEFAULT 0,
  earnings_this_snapshot  numeric NOT NULL DEFAULT 0,
  snapshotted_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_ugc_view_snapshots_submission_id ON public.ugc_view_snapshots(submission_id);
CREATE INDEX idx_ugc_view_snapshots_at            ON public.ugc_view_snapshots(snapshotted_at DESC);

-- ────────────────────────────────────────────────────────────
-- 6.  ugc_reports  (rebuilt clean — no more social-feed refs)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.ugc_reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id    uuid NOT NULL REFERENCES public.profiles(id),
  submission_id  uuid REFERENCES public.ugc_submissions(id),
  reason         text NOT NULL CHECK (reason IN ('spam','fraud','copyright','inappropriate','other')),
  details        text,
  status         text DEFAULT 'pending' CHECK (status IN ('pending','reviewed','actioned','dismissed')),
  reviewed_by    uuid REFERENCES public.profiles(id),
  reviewed_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_ugc_reports_submission_id ON public.ugc_reports(submission_id);
CREATE INDEX idx_ugc_reports_status        ON public.ugc_reports(status);

-- ────────────────────────────────────────────────────────────
-- 7.  ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

-- Helper: get vendor.id for current user
CREATE OR REPLACE FUNCTION my_vendor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper: get influencers.id for current user
CREATE OR REPLACE FUNCTION my_influencer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.influencers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── ugc_campaigns ──
ALTER TABLE public.ugc_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select_all_authenticated"
  ON public.ugc_campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "campaigns_insert_own_vendor"
  ON public.ugc_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (brand_id = my_vendor_id());

CREATE POLICY "campaigns_update_own_vendor_or_admin"
  ON public.ugc_campaigns FOR UPDATE
  TO authenticated
  USING (brand_id = my_vendor_id() OR is_admin());

CREATE POLICY "campaigns_delete_admin"
  ON public.ugc_campaigns FOR DELETE
  TO authenticated
  USING (is_admin());

-- ── ugc_submissions ──
ALTER TABLE public.ugc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_select"
  ON public.ugc_submissions FOR SELECT
  TO authenticated
  USING (
    influencer_id = my_influencer_id()
    OR EXISTS (
      SELECT 1 FROM public.ugc_campaigns c
      WHERE c.id = campaign_id AND c.brand_id = my_vendor_id()
    )
    OR is_admin()
  );

CREATE POLICY "submissions_insert_influencer"
  ON public.ugc_submissions FOR INSERT
  TO authenticated
  WITH CHECK (influencer_id = my_influencer_id());

CREATE POLICY "submissions_update_vendor_or_admin"
  ON public.ugc_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ugc_campaigns c
      WHERE c.id = campaign_id AND c.brand_id = my_vendor_id()
    )
    OR is_admin()
  );

CREATE POLICY "submissions_delete_admin"
  ON public.ugc_submissions FOR DELETE
  TO authenticated
  USING (is_admin());

-- ── ugc_view_snapshots ──
ALTER TABLE public.ugc_view_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_select"
  ON public.ugc_view_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ugc_submissions s
      WHERE s.id = submission_id AND (
        s.influencer_id = my_influencer_id()
        OR EXISTS (
          SELECT 1 FROM public.ugc_campaigns c
          WHERE c.id = s.campaign_id AND c.brand_id = my_vendor_id()
        )
        OR is_admin()
      )
    )
  );

-- Cron job inserts via service_role — no policy needed for INSERT  
-- (service_role bypasses RLS)

-- ── ugc_reports ──
ALTER TABLE public.ugc_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_admin"
  ON public.ugc_reports FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "reports_insert_authenticated"
  ON public.ugc_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 8.  GRANT service_role bypass (already implicit, but explicit)
-- ────────────────────────────────────────────────────────────
GRANT ALL ON public.ugc_campaigns       TO service_role;
GRANT ALL ON public.ugc_submissions     TO service_role;
GRANT ALL ON public.ugc_view_snapshots  TO service_role;
GRANT ALL ON public.ugc_reports         TO service_role;
