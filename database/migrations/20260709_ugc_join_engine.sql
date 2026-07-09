-- UGC Join & Application Engine (backward-compatible extensions)
-- Default join_mode = 'instant' preserves existing campaign behavior.

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

ALTER TABLE public.ugc_campaigns
  ADD COLUMN IF NOT EXISTS join_mode text NOT NULL DEFAULT 'instant'
    CHECK (join_mode IN ('instant', 'application', 'invite_only', 'hybrid')),
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

CREATE INDEX IF NOT EXISTS idx_ugc_join_audit_campaign
  ON public.ugc_join_audit(campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ugc_parts_status
  ON public.ugc_campaign_participants(campaign_id, status);
