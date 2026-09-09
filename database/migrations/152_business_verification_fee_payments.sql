-- Business verification fee payments ($5.65 USD before Didit KYB)
-- Additive; service-role writes only for payment confirmation.

CREATE TABLE IF NOT EXISTS public.business_verification_fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors (id) ON DELETE CASCADE,
  amount_usd numeric(10, 2) NOT NULL DEFAULT 5.65,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'consumed')),
  method text NOT NULL DEFAULT 'flutterwave'
    CHECK (method IN ('wallet', 'flutterwave')),
  provider_ref text,
  idempotency_key text,
  transaction_id uuid,
  didit_session_id text,
  paid_at timestamptz,
  consumed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS business_verification_fee_payments_idempotency_uidx
  ON public.business_verification_fee_payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS business_verification_fee_payments_provider_ref_uidx
  ON public.business_verification_fee_payments (provider_ref)
  WHERE provider_ref IS NOT NULL;

-- One unused paid fee per vendor (consumed fees allow a new paid attempt after decline)
CREATE UNIQUE INDEX IF NOT EXISTS business_verification_fee_payments_vendor_paid_open_uidx
  ON public.business_verification_fee_payments (vendor_id)
  WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS business_verification_fee_payments_user_idx
  ON public.business_verification_fee_payments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS business_verification_fee_payments_vendor_idx
  ON public.business_verification_fee_payments (vendor_id, created_at DESC);

ALTER TABLE public.business_verification_fee_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'business_verification_fee_payments'
      AND policyname = 'business_verification_fee_payments_select_own'
  ) THEN
    CREATE POLICY business_verification_fee_payments_select_own
      ON public.business_verification_fee_payments
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

REVOKE ALL ON public.business_verification_fee_payments FROM anon;
GRANT SELECT ON public.business_verification_fee_payments TO authenticated;
