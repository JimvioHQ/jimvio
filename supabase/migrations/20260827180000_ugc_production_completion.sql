-- UGC production completion: automation run log + persistent campaign notes.
-- Additive. Does not weaken existing RLS.

CREATE TABLE IF NOT EXISTS public.ugc_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.ugc_automations(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  trigger_event text NOT NULL,
  entity_id text NOT NULL,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'failed', 'skipped')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (automation_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_ugc_automation_runs_brand
  ON public.ugc_automation_runs (brand_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ugc_campaign_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'brand'
    CHECK (scope IN ('brand', 'creator', 'submission')),
  submission_id uuid REFERENCES public.ugc_submissions(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_campaign_notes_campaign
  ON public.ugc_campaign_notes (campaign_id, scope, created_at DESC);

ALTER TABLE public.ugc_automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_campaign_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ugc_automation_runs_select ON public.ugc_automation_runs;
CREATE POLICY ugc_automation_runs_select ON public.ugc_automation_runs
  FOR SELECT TO authenticated
  USING (public.ugc_is_brand_member(brand_id));

DROP POLICY IF EXISTS ugc_campaign_notes_brand_read ON public.ugc_campaign_notes;
CREATE POLICY ugc_campaign_notes_brand_read ON public.ugc_campaign_notes
  FOR SELECT TO authenticated
  USING (
    (scope IN ('brand', 'submission') AND public.ugc_is_brand_member(brand_id))
    OR (scope = 'creator' AND author_user_id = auth.uid())
  );

DROP POLICY IF EXISTS ugc_campaign_notes_insert ON public.ugc_campaign_notes;
CREATE POLICY ugc_campaign_notes_insert ON public.ugc_campaign_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND (
      (scope IN ('brand', 'submission') AND public.ugc_is_brand_member(brand_id))
      OR (
        scope = 'creator'
        AND EXISTS (
          SELECT 1
          FROM public.ugc_campaign_participants p
          JOIN public.influencers i ON i.id = p.influencer_id
          WHERE p.campaign_id = ugc_campaign_notes.campaign_id
            AND i.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS ugc_campaign_notes_update ON public.ugc_campaign_notes;
CREATE POLICY ugc_campaign_notes_update ON public.ugc_campaign_notes
  FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

DROP POLICY IF EXISTS ugc_campaign_notes_delete ON public.ugc_campaign_notes;
CREATE POLICY ugc_campaign_notes_delete ON public.ugc_campaign_notes
  FOR DELETE TO authenticated
  USING (author_user_id = auth.uid() OR public.ugc_is_brand_member(brand_id));

REVOKE ALL ON TABLE public.ugc_automation_runs FROM PUBLIC;
REVOKE ALL ON TABLE public.ugc_automation_runs FROM anon;
GRANT SELECT ON TABLE public.ugc_automation_runs TO authenticated;

REVOKE ALL ON TABLE public.ugc_campaign_notes FROM PUBLIC;
REVOKE ALL ON TABLE public.ugc_campaign_notes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ugc_campaign_notes TO authenticated;
