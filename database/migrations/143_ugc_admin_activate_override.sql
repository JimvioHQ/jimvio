-- Admin may mark a UGC/Clipping campaign Active without creating funding.
-- Additive. Does not invent escrow, payments, or spent_budget changes.
-- Brand UPDATE RLS is unchanged; only service-role writes these columns after
-- platform-admin authorization.

ALTER TABLE public.ugc_campaigns
  ADD COLUMN IF NOT EXISTS activated_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_activated_by uuid,
  ADD COLUMN IF NOT EXISTS admin_activation_reason text;

CREATE INDEX IF NOT EXISTS idx_ugc_campaigns_activated_by_admin
  ON public.ugc_campaigns (activated_by_admin)
  WHERE activated_by_admin = true;

COMMENT ON COLUMN public.ugc_campaigns.activated_by_admin IS
  'True when a platform admin activated the campaign without the funding/escrow path. Funding columns remain truthful.';
