-- ============================================================
-- Jimvio Wallet OS — unified financial operating system
-- Additive only. Existing wallets/transactions/payouts remain SoT.
-- ============================================================

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS locked_balance numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escrow_balance numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rewards_balance numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Wallet security (PIN + trusted devices metadata)
CREATE TABLE IF NOT EXISTS public.wallet_security (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_hash text,
  pin_set_at timestamptz,
  pin_failed_attempts integer NOT NULL DEFAULT 0,
  pin_locked_until timestamptz,
  require_2fa_withdraw boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_label text NOT NULL,
  device_fingerprint text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_fingerprint)
);

-- User deposits / funding history (wallet top-ups)
CREATE TABLE IF NOT EXISTS public.wallet_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'RWF',
  method text NOT NULL DEFAULT 'manual'
    CHECK (method IN ('manual','bank','flutterwave','mobile_money','paypal','crypto','other')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  reference text,
  invoice_url text,
  receipt_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS wallet_deposits_user_idx
  ON public.wallet_deposits (user_id, created_at DESC);

-- Rewards ledger (cashback, referrals, bonuses, seasonal)
CREATE TABLE IF NOT EXISTS public.wallet_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'RWF',
  reward_type text NOT NULL
    CHECK (reward_type IN ('cashback','referral','campaign_bonus','xp','seasonal','other')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'credited'
    CHECK (status IN ('pending','credited','expired','revoked')),
  ref_type text,
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_rewards_user_idx
  ON public.wallet_rewards (user_id, created_at DESC);

-- Unified financial activity log (append-only audit)
CREATE TABLE IF NOT EXISTS public.wallet_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  surface text NOT NULL DEFAULT 'system'
    CHECK (surface IN (
      'marketplace','ugc','affiliate','community','orders','escrow',
      'rewards','refunds','fees','withdrawals','deposits','subscriptions','security','system'
    )),
  amount numeric(14,2),
  currency text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_activity_log_user_idx
  ON public.wallet_activity_log (user_id, created_at DESC);

-- Cached AI financial insights
CREATE TABLE IF NOT EXISTS public.wallet_ai_insights (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  revenue_insights text[] NOT NULL DEFAULT '{}',
  savings_recommendations text[] NOT NULL DEFAULT '{}',
  earning_opportunities text[] NOT NULL DEFAULT '{}',
  upcoming_payouts text[] NOT NULL DEFAULT '{}',
  funding_reminders text[] NOT NULL DEFAULT '{}',
  financial_summary text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- Extend payout methods to allow paypal if table uses CHECK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'creator_payout_methods'
  ) THEN
    BEGIN
      ALTER TABLE public.creator_payout_methods DROP CONSTRAINT IF EXISTS creator_payout_methods_method_check;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
    BEGIN
      ALTER TABLE public.creator_payout_methods
        ADD CONSTRAINT creator_payout_methods_method_check
        CHECK (method IN ('flutterwave','bank','mobile_money','crypto','paypal'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.wallet_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallet_security_own ON public.wallet_security;
CREATE POLICY wallet_security_own ON public.wallet_security
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS wallet_devices_own ON public.wallet_trusted_devices;
CREATE POLICY wallet_devices_own ON public.wallet_trusted_devices
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS wallet_deposits_own ON public.wallet_deposits;
CREATE POLICY wallet_deposits_own ON public.wallet_deposits
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS wallet_rewards_own ON public.wallet_rewards;
CREATE POLICY wallet_rewards_own ON public.wallet_rewards
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS wallet_activity_own ON public.wallet_activity_log;
CREATE POLICY wallet_activity_own ON public.wallet_activity_log
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS wallet_ai_own ON public.wallet_ai_insights;
CREATE POLICY wallet_ai_own ON public.wallet_ai_insights
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
