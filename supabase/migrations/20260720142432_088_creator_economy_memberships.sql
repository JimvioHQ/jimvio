-- Creator Economy v1 — Phase 1: Memberships (additive)
-- Extends communities / community_memberships without altering core payment paths.

-- Named membership tiers per community
CREATE TABLE IF NOT EXISTS public.community_membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'monthly', 'yearly', 'lifetime')),
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  trial_days INTEGER NOT NULL DEFAULT 0 CHECK (trial_days >= 0 AND trial_days <= 365),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  space_access UUID[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_membership_tiers_community
  ON public.community_membership_tiers(community_id, sort_order ASC);

-- Lifecycle / billing events (upgrade, downgrade, cancel, trial, renew)
CREATE TABLE IF NOT EXISTS public.community_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.community_memberships(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'joined_free',
    'trial_started',
    'trial_converted',
    'trial_expired',
    'subscribed',
    'renewed',
    'upgraded',
    'downgraded',
    'cancelled',
    'reactivated',
    'expired',
    'payment_failed'
  )),
  from_plan TEXT,
  to_plan TEXT,
  from_tier_id UUID REFERENCES public.community_membership_tiers(id) ON DELETE SET NULL,
  to_tier_id UUID REFERENCES public.community_membership_tiers(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2),
  currency TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_community
  ON public.community_subscription_events(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user
  ON public.community_subscription_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_membership
  ON public.community_subscription_events(membership_id, created_at DESC);

-- Extend memberships with tier + trial tracking (nullable additive columns)
ALTER TABLE public.community_memberships
  ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.community_membership_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_interval TEXT CHECK (billing_interval IS NULL OR billing_interval IN ('monthly', 'yearly', 'lifetime', 'free'));

CREATE INDEX IF NOT EXISTS idx_memberships_tier
  ON public.community_memberships(tier_id)
  WHERE tier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_trial_ends
  ON public.community_memberships(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

-- Buyer-facing billing history view helper (materialized via events + payments)
CREATE OR REPLACE VIEW public.community_billing_history
WITH (security_invoker = true) AS
SELECT
  cp.id,
  cp.community_id,
  cp.user_id,
  cp.membership_id,
  cp.amount,
  cp.currency,
  cp.payment_provider,
  cp.payment_reference,
  cp.status AS payment_status,
  cp.platform_commission,
  cp.creator_earnings,
  cp.created_at,
  c.slug AS community_slug,
  c.name AS community_name,
  cm.plan_type,
  cm.tier_id
FROM public.community_payments cp
JOIN public.communities c ON c.id = cp.community_id
LEFT JOIN public.community_memberships cm ON cm.id = cp.membership_id;

ALTER TABLE public.community_membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membership_tiers_select ON public.community_membership_tiers;
CREATE POLICY membership_tiers_select ON public.community_membership_tiers
  FOR SELECT USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = community_id AND c.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS membership_tiers_owner_write ON public.community_membership_tiers;
CREATE POLICY membership_tiers_owner_write ON public.community_membership_tiers
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = community_id AND c.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = community_id AND c.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS subscription_events_select ON public.community_subscription_events;
CREATE POLICY subscription_events_select ON public.community_subscription_events
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND c.owner_id = auth.uid()
    )
  );
