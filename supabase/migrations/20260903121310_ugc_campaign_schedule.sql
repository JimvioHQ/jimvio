-- UGC campaign scheduling: production dates + custom campaign events.
-- Additive. Does not mutate existing campaign rows beyond new nullable columns.

ALTER TABLE public.ugc_campaigns
  ADD COLUMN IF NOT EXISTS content_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS live_at timestamptz,
  ADD COLUMN IF NOT EXISTS submission_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS review_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ugc_campaigns_starts_at
  ON public.ugc_campaigns (starts_at)
  WHERE starts_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ugc_campaigns_ends_at
  ON public.ugc_campaigns (ends_at)
  WHERE ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ugc_campaigns_submission_deadline
  ON public.ugc_campaigns (submission_deadline)
  WHERE submission_deadline IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ugc_campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'custom'
    CHECK (event_type IN (
      'campaign_start',
      'campaign_end',
      'content_deadline',
      'live_date',
      'submission_deadline',
      'review_start',
      'review_end',
      'payment',
      'custom'
    )),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_campaign_events_campaign_date
  ON public.ugc_campaign_events (campaign_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_ugc_campaign_events_starts_at
  ON public.ugc_campaign_events (starts_at);

ALTER TABLE public.ugc_campaign_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ugc_campaign_events_select ON public.ugc_campaign_events;
CREATE POLICY ugc_campaign_events_select ON public.ugc_campaign_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ugc_campaigns c
      WHERE c.id = ugc_campaign_events.campaign_id
        AND c.status::text IN ('active', 'paused', 'completed')
    )
    OR EXISTS (
      SELECT 1
      FROM public.ugc_campaigns c
      JOIN public.vendors v ON v.id = c.brand_id
      WHERE c.id = ugc_campaign_events.campaign_id
        AND v.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.ugc_campaign_participants p
      JOIN public.influencers i ON i.id = p.influencer_id
      WHERE p.campaign_id = ugc_campaign_events.campaign_id
        AND i.user_id = auth.uid()
        AND p.status::text IN ('accepted', 'invited', 'pending', 'waitlisted')
    )
  );

DROP POLICY IF EXISTS ugc_campaign_events_write ON public.ugc_campaign_events;
CREATE POLICY ugc_campaign_events_write ON public.ugc_campaign_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ugc_campaigns c
      JOIN public.vendors v ON v.id = c.brand_id
      WHERE c.id = ugc_campaign_events.campaign_id
        AND v.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ugc_campaigns c
      JOIN public.vendors v ON v.id = c.brand_id
      WHERE c.id = ugc_campaign_events.campaign_id
        AND v.user_id = auth.uid()
    )
  );

GRANT SELECT ON TABLE public.ugc_campaign_events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.ugc_campaign_events TO authenticated;
