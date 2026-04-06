-- ============================================================
-- MIGRATION 044: UGC CAMPAIGN PARTICIPANTS
-- ============================================================
-- Enables creators to join specific UGC/Clipping campaigns.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ugc_campaign_participants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  influencer_id  uuid NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'accepted'
                 CHECK (status IN ('invited','accepted','rejected','banned')),
  joined_at      timestamptz DEFAULT now(),
  UNIQUE(campaign_id, influencer_id)
);

-- RLS
ALTER TABLE public.ugc_campaign_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_select" ON public.ugc_campaign_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "participants_insert_influencer" ON public.ugc_campaign_participants
  FOR INSERT TO authenticated
  WITH CHECK (influencer_id = (SELECT id FROM public.influencers WHERE user_id = auth.uid() LIMIT 1));

-- Permissions
GRANT ALL ON public.ugc_campaign_participants TO service_role;
GRANT ALL ON public.ugc_campaign_participants TO authenticated;
