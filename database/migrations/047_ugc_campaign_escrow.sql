-- ============================================================
-- MIGRATION 047: UGC CAMPAIGN ESCROW
-- ============================================================
-- Holds funds locked for a UGC campaign. Required before a 
-- campaign can transition to the "active" state.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ugc_campaign_escrow (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    uuid NOT NULL REFERENCES public.ugc_campaigns(id) ON DELETE CASCADE,
  deposited_by   uuid NOT NULL REFERENCES public.profiles(id),
  amount         numeric NOT NULL,
  currency       text    NOT NULL DEFAULT 'RWF',
  status         text    NOT NULL DEFAULT 'held'
                 CHECK (status IN ('held','partially_released','fully_released','refunded')),
  payment_method text,
  payment_ref    text,
  deposited_at   timestamptz DEFAULT now(),
  released_at    timestamptz,
  UNIQUE(campaign_id)
);

-- RLS
ALTER TABLE public.ugc_campaign_escrow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escrow_select_all" ON public.ugc_campaign_escrow
  FOR SELECT TO authenticated USING (true);

-- Vendor can insert their own escrow rows (typically done securely via Server action/API)
-- For maximum safety, insert is restricted to server-side via service role in the API, 
-- but we enable select for authenticated users.

GRANT ALL ON public.ugc_campaign_escrow TO service_role;
GRANT ALL ON public.ugc_campaign_escrow TO authenticated;
