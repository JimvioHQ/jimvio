-- Creator Economy v1 — Phase 5: Creator payout methods (additive)
CREATE TABLE IF NOT EXISTS public.creator_payout_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('flutterwave', 'bank_transfer', 'mobile_money', 'crypto')),
  account_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_payout_methods_user
  ON public.creator_payout_methods(user_id, is_default DESC, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_payout_methods_default
  ON public.creator_payout_methods(user_id) WHERE is_default AND is_active;

ALTER TABLE public.creator_payout_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creator_payout_methods_own ON public.creator_payout_methods;
CREATE POLICY creator_payout_methods_own ON public.creator_payout_methods
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
