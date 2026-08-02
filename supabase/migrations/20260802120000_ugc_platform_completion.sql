-- UGC Platform Completion V1.0
-- Safe, additive, backward-compatible. No data loss.

-- ─── Ensure participation statuses exist (join engine may be missing remotely)
DO $$ BEGIN
  ALTER TYPE ugc_participation_status ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE ugc_participation_status ADD VALUE IF NOT EXISTS 'waitlisted';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE ugc_participation_status ADD VALUE IF NOT EXISTS 'withdrawn';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Submission revision status ─────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE ugc_submission_status ADD VALUE IF NOT EXISTS 'revision_requested';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.ugc_submissions
  ADD COLUMN IF NOT EXISTS revision_round integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_submission_id uuid REFERENCES public.ugc_submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_review jsonb,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- ─── Campaign templates ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_favorite boolean NOT NULL DEFAULT false,
  source_campaign_id uuid REFERENCES public.ugc_campaigns(id) ON DELETE SET NULL,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_campaign_templates_brand
  ON public.ugc_campaign_templates(brand_id, updated_at DESC);

-- ─── Creator invitations ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_creator_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  invitee_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invitee_email text,
  invitee_username text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_invitations_campaign
  ON public.ugc_creator_invitations(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ugc_invitations_brand
  ON public.ugc_creator_invitations(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ugc_invitations_influencer
  ON public.ugc_creator_invitations(influencer_id, status);

-- ─── Favorite creators (brand bookmarks) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_favorite_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  influencer_id uuid NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, influencer_id)
);

CREATE INDEX IF NOT EXISTS idx_ugc_favorite_creators_brand
  ON public.ugc_favorite_creators(brand_id, updated_at DESC);

-- ─── Saved campaigns (creator bookmarks + collections) ──────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_saved_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_saved_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.ugc_saved_collections(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_ugc_saved_campaigns_user
  ON public.ugc_saved_campaigns(user_id, created_at DESC);

-- ─── Content library ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_content_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.ugc_campaigns(id) ON DELETE SET NULL,
  submission_id uuid REFERENCES public.ugc_submissions(id) ON DELETE SET NULL,
  title text,
  file_url text NOT NULL,
  thumbnail_url text,
  media_type text NOT NULL DEFAULT 'video'
    CHECK (media_type IN ('video', 'image', 'file', 'audio')),
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'draft', 'approved', 'rejected', 'archived')),
  mime_type text,
  file_size bigint,
  duration_seconds numeric,
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_content_library_user
  ON public.ugc_content_library(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ugc_content_library_status
  ON public.ugc_content_library(user_id, status);

-- ─── Campaign chat ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_campaign_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  influencer_id uuid NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, influencer_id)
);

CREATE TABLE IF NOT EXISTS public.ugc_campaign_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.ugc_campaign_chat_threads(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text,
  message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'attachment', 'voice', 'system')),
  attachment_url text,
  attachment_name text,
  attachment_mime text,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_chat_messages_thread
  ON public.ugc_campaign_chat_messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ugc_chat_pinned
  ON public.ugc_campaign_chat_messages(thread_id) WHERE is_pinned = true;

-- ─── Activity timeline ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_campaign_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  submission_id uuid REFERENCES public.ugc_submissions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_campaign_activity_campaign
  ON public.ugc_campaign_activity(campaign_id, created_at DESC);

-- ─── Submission revisions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_submission_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.ugc_submissions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  round_number integer NOT NULL DEFAULT 1,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_notes text,
  creator_response text,
  media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'submitted', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ugc_submission_revisions_sub
  ON public.ugc_submission_revisions(submission_id, round_number DESC);

-- ─── Reputation snapshots ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_brand_reputation (
  brand_id uuid PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,
  trust_score numeric NOT NULL DEFAULT 50,
  avg_approval_hours numeric,
  avg_payment_hours numeric,
  creator_rating numeric,
  completed_campaigns integer NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ugc_creator_reputation (
  influencer_id uuid PRIMARY KEY REFERENCES public.influencers(id) ON DELETE CASCADE,
  trust_score numeric NOT NULL DEFAULT 50,
  quality_score numeric NOT NULL DEFAULT 50,
  completion_rate numeric NOT NULL DEFAULT 0,
  approval_rate numeric NOT NULL DEFAULT 0,
  average_views numeric NOT NULL DEFAULT 0,
  total_earnings numeric NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Badges & achievements ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  category text NOT NULL DEFAULT 'creator',
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.ugc_user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  badge_id text NOT NULL REFERENCES public.ugc_badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.ugc_achievements (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ugc_badges (id, name, description, icon, category) VALUES
  ('verified_creator', 'Verified Creator', 'Identity and portfolio verified by Jimvio.', 'badge-check', 'creator'),
  ('top_creator', 'Top Creator', 'Top-performing creator in the last 90 days.', 'trophy', 'creator'),
  ('fast_responder', 'Fast Responder', 'Responds to brand feedback within 24 hours.', 'zap', 'creator'),
  ('campaigns_100', '100 Campaigns', 'Completed 100 campaigns on Jimvio.', 'medal', 'creator'),
  ('high_quality', 'High Quality', 'Maintains a 90%+ approval rate.', 'star', 'creator'),
  ('legend_creator', 'Legend Creator', 'Elite creator with exceptional trust and earnings.', 'crown', 'creator')
ON CONFLICT (id) DO NOTHING;

-- ─── AI review cache / match feedback ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ugc_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES public.ugc_submissions(id) ON DELETE SET NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_ai_reviews_user
  ON public.ugc_ai_reviews(user_id, created_at DESC);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.ugc_campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_creator_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_favorite_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_saved_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_saved_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_campaign_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_campaign_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_campaign_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_submission_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_brand_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_creator_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_ai_reviews ENABLE ROW LEVEL SECURITY;

-- Helper: brand owner
CREATE OR REPLACE FUNCTION public.ugc_is_brand_owner(p_brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = p_brand_id AND v.user_id = auth.uid()
  );
$$;

-- Templates
DROP POLICY IF EXISTS ugc_templates_brand_all ON public.ugc_campaign_templates;
CREATE POLICY ugc_templates_brand_all ON public.ugc_campaign_templates
  FOR ALL USING (public.ugc_is_brand_owner(brand_id))
  WITH CHECK (public.ugc_is_brand_owner(brand_id));

-- Invitations
DROP POLICY IF EXISTS ugc_invites_brand ON public.ugc_creator_invitations;
CREATE POLICY ugc_invites_brand ON public.ugc_creator_invitations
  FOR ALL USING (public.ugc_is_brand_owner(brand_id))
  WITH CHECK (public.ugc_is_brand_owner(brand_id));

DROP POLICY IF EXISTS ugc_invites_creator_read ON public.ugc_creator_invitations;
CREATE POLICY ugc_invites_creator_read ON public.ugc_creator_invitations
  FOR SELECT USING (
    invitee_user_id = auth.uid()
    OR influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS ugc_invites_creator_update ON public.ugc_creator_invitations;
CREATE POLICY ugc_invites_creator_update ON public.ugc_creator_invitations
  FOR UPDATE USING (
    invitee_user_id = auth.uid()
    OR influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
  );

-- Favorites
DROP POLICY IF EXISTS ugc_fav_creators_brand ON public.ugc_favorite_creators;
CREATE POLICY ugc_fav_creators_brand ON public.ugc_favorite_creators
  FOR ALL USING (public.ugc_is_brand_owner(brand_id))
  WITH CHECK (public.ugc_is_brand_owner(brand_id));

-- Saved
DROP POLICY IF EXISTS ugc_saved_collections_own ON public.ugc_saved_collections;
CREATE POLICY ugc_saved_collections_own ON public.ugc_saved_collections
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ugc_saved_campaigns_own ON public.ugc_saved_campaigns;
CREATE POLICY ugc_saved_campaigns_own ON public.ugc_saved_campaigns
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Content library
DROP POLICY IF EXISTS ugc_content_library_own ON public.ugc_content_library;
CREATE POLICY ugc_content_library_own ON public.ugc_content_library
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Chat threads: brand or creator participant
DROP POLICY IF EXISTS ugc_chat_threads_access ON public.ugc_campaign_chat_threads;
CREATE POLICY ugc_chat_threads_access ON public.ugc_campaign_chat_threads
  FOR ALL USING (
    public.ugc_is_brand_owner(brand_id)
    OR influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.ugc_is_brand_owner(brand_id)
    OR influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS ugc_chat_messages_access ON public.ugc_campaign_chat_messages;
CREATE POLICY ugc_chat_messages_access ON public.ugc_campaign_chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ugc_campaign_chat_threads t
      WHERE t.id = thread_id
        AND (
          public.ugc_is_brand_owner(t.brand_id)
          OR t.influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid())
        )
    )
  )
  WITH CHECK (sender_user_id = auth.uid());

-- Activity: brand owners + accepted creators
DROP POLICY IF EXISTS ugc_activity_read ON public.ugc_campaign_activity;
CREATE POLICY ugc_activity_read ON public.ugc_campaign_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ugc_campaigns c
      JOIN public.vendors v ON v.id = c.brand_id
      WHERE c.id = campaign_id AND v.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.ugc_campaign_participants p
      JOIN public.influencers i ON i.id = p.influencer_id
      WHERE p.campaign_id = ugc_campaign_activity.campaign_id
        AND i.user_id = auth.uid()
        AND p.status::text IN ('accepted', 'invited', 'pending', 'waitlisted')
    )
  );

DROP POLICY IF EXISTS ugc_activity_insert ON public.ugc_campaign_activity;
CREATE POLICY ugc_activity_insert ON public.ugc_campaign_activity
  FOR INSERT WITH CHECK (actor_user_id = auth.uid() OR actor_user_id IS NULL);

-- Revisions
DROP POLICY IF EXISTS ugc_revisions_access ON public.ugc_submission_revisions;
CREATE POLICY ugc_revisions_access ON public.ugc_submission_revisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ugc_campaigns c
      JOIN public.vendors v ON v.id = c.brand_id
      WHERE c.id = campaign_id AND v.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.ugc_submissions s
      JOIN public.influencers i ON i.id = s.influencer_id
      WHERE s.id = submission_id AND i.user_id = auth.uid()
    )
  );

-- Reputations readable by authenticated
DROP POLICY IF EXISTS ugc_brand_rep_read ON public.ugc_brand_reputation;
CREATE POLICY ugc_brand_rep_read ON public.ugc_brand_reputation
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ugc_creator_rep_read ON public.ugc_creator_reputation;
CREATE POLICY ugc_creator_rep_read ON public.ugc_creator_reputation
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ugc_badges_read ON public.ugc_badges;
CREATE POLICY ugc_badges_read ON public.ugc_badges
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ugc_user_badges_read ON public.ugc_user_badges;
CREATE POLICY ugc_user_badges_read ON public.ugc_user_badges
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ugc_user_badges_own ON public.ugc_user_badges;
CREATE POLICY ugc_user_badges_own ON public.ugc_user_badges
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ugc_achievements_own ON public.ugc_achievements;
CREATE POLICY ugc_achievements_own ON public.ugc_achievements
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ugc_ai_reviews_own ON public.ugc_ai_reviews;
CREATE POLICY ugc_ai_reviews_own ON public.ugc_ai_reviews
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Join engine columns (applied if missing on remote)
ALTER TABLE public.ugc_campaigns
  ADD COLUMN IF NOT EXISTS join_mode text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS join_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_participants integer;

ALTER TABLE public.ugc_campaign_participants
  ADD COLUMN IF NOT EXISTS application_message text,
  ADD COLUMN IF NOT EXISTS application_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS eligibility_score integer,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_feedback text;

CREATE TABLE IF NOT EXISTS public.ugc_join_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  actor_user_id uuid,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
