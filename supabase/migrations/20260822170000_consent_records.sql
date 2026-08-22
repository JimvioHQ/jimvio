-- Legal consent audit trail (GDPR / LGPD / CCPA).
-- Additive + backward compatible: new table only, no changes to existing objects.
-- Consent is written server-side via the service-role client (see /api/consent),
-- so no INSERT policy is granted to end users; RLS only exposes read-your-own.

CREATE TABLE IF NOT EXISTS public.consent_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable: consent may be captured before/without authentication.
  user_id         uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  regime          text NOT NULL CHECK (regime IN ('gdpr', 'lgpd', 'ccpa', 'default')),
  region          text,
  policy_version  text NOT NULL,
  analytics       boolean NOT NULL DEFAULT false,
  personalization boolean NOT NULL DEFAULT false,
  marketing       boolean NOT NULL DEFAULT false,
  action          text NOT NULL CHECK (
    action IN ('accept_all', 'reject_all', 'save', 'withdraw', 'do_not_sell')
  ),
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user
  ON public.consent_records (user_id, created_at DESC);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Users may read only their own consent history (auditability / DSAR support).
DROP POLICY IF EXISTS consent_records_select_own ON public.consent_records;
CREATE POLICY consent_records_select_own
  ON public.consent_records
  FOR SELECT
  USING (auth.uid() = user_id);
