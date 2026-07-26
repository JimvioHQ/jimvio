-- Affiliate engine & campaign infrastructure
-- 1) Campaigns (create/pause/resume/archive, budgets, tracking codes)
-- 2) Commission lifecycle statuses + ledger
-- 3) Earnings / clawback RPCs
-- 4) Click recording RPC + uniqueness helpers
-- 5) Attribution window metadata + first-touch cookie support columns
-- 6) Indexes / RLS / constraints

-- ── Commission lifecycle status (independent of payout_status enum) ──────────

ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.affiliate_commissions
  DROP CONSTRAINT IF EXISTS affiliate_commissions_lifecycle_status_check;

ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_lifecycle_status_check
  CHECK (lifecycle_status IN (
    'pending', 'approved', 'rejected', 'refunded', 'cancelled', 'partial_refund'
  ));

ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS original_commission_amount numeric;

ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS refunded_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS campaign_id uuid;

ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS attribution_model text NOT NULL DEFAULT 'last_touch';

ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS attributed_at timestamptz;

ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- One commission row per order item (prevents duplicate attribution)
CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliate_commissions_order_item
  ON public.affiliate_commissions (order_item_id)
  WHERE order_item_id IS NOT NULL;

-- ── Affiliate campaigns ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.affiliate_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  tracking_code text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  attribution_model text NOT NULL DEFAULT 'last_touch'
    CHECK (attribution_model IN ('first_touch', 'last_touch')),
  attribution_window_days integer NOT NULL DEFAULT 30
    CHECK (attribution_window_days > 0 AND attribution_window_days <= 365),
  commission_rate numeric NOT NULL DEFAULT 10
    CHECK (commission_rate >= 0 AND commission_rate <= 100),
  budget_amount numeric,
  budget_spent numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  community_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_campaigns_tracking_code_unique UNIQUE (tracking_code)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_campaigns_status
  ON public.affiliate_campaigns (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_campaigns_vendor
  ON public.affiliate_campaigns (vendor_id, status)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_campaigns_tracking
  ON public.affiliate_campaigns (tracking_code);

ALTER TABLE public.affiliate_campaigns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'affiliate_campaigns'
      AND policyname = 'affiliate_campaigns_select_active'
  ) THEN
    CREATE POLICY affiliate_campaigns_select_active
      ON public.affiliate_campaigns FOR SELECT
      TO authenticated, anon
      USING (status IN ('active', 'paused') OR created_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'affiliate_campaigns'
      AND policyname = 'affiliate_campaigns_manage_own'
  ) THEN
    CREATE POLICY affiliate_campaigns_manage_own
      ON public.affiliate_campaigns FOR ALL
      TO authenticated
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
  END IF;
END $$;

-- FK from commissions → campaigns (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'affiliate_commissions_campaign_id_fkey'
  ) THEN
    ALTER TABLE public.affiliate_commissions
      ADD CONSTRAINT affiliate_commissions_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES public.affiliate_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Affiliate ledger ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.affiliate_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  commission_id uuid REFERENCES public.affiliate_commissions(id) ON DELETE SET NULL,
  entry_type text NOT NULL
    CHECK (entry_type IN (
      'commission_pending', 'commission_approved', 'commission_rejected',
      'commission_refunded', 'commission_cancelled', 'partial_refund',
      'withdrawal_hold', 'withdrawal_paid', 'adjustment'
    )),
  amount numeric NOT NULL,
  balance_pending_after numeric,
  balance_available_after numeric,
  currency text NOT NULL DEFAULT 'USD',
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_ledger_affiliate
  ON public.affiliate_ledger (affiliate_id, created_at DESC);

ALTER TABLE public.affiliate_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'affiliate_ledger'
      AND policyname = 'affiliate_ledger_select_own'
  ) THEN
    CREATE POLICY affiliate_ledger_select_own
      ON public.affiliate_ledger FOR SELECT
      TO authenticated
      USING (
        affiliate_id IN (
          SELECT id FROM public.affiliates WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── Link → campaign optional ─────────────────────────────────────────────────

ALTER TABLE public.affiliate_links
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.affiliate_campaigns(id) ON DELETE SET NULL;

ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.affiliate_campaigns(id) ON DELETE SET NULL;

ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS is_unique boolean NOT NULL DEFAULT false;

ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS session_key text;

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_session
  ON public.affiliate_clicks (link_id, session_key, created_at DESC)
  WHERE session_key IS NOT NULL;

-- Attribution captured timestamp on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS affiliate_attributed_at timestamptz;

-- ── Earnings RPCs ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_affiliate_earnings(
  p_affiliate_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_affiliate_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  UPDATE public.affiliates
  SET
    pending_earnings = COALESCE(pending_earnings, 0) + p_amount,
    total_earnings = COALESCE(total_earnings, 0) + p_amount,
    total_conversions = COALESCE(total_conversions, 0) + 1,
    conversion_rate = CASE
      WHEN COALESCE(total_clicks, 0) > 0
      THEN ROUND(
        ((COALESCE(total_conversions, 0) + 1)::numeric / total_clicks::numeric) * 100,
        2
      )
      ELSE conversion_rate
    END,
    updated_at = now()
  WHERE id = p_affiliate_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_affiliate_commission(p_commission_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.affiliate_commissions%ROWTYPE;
  aff public.affiliates%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.affiliate_commissions WHERE id = p_commission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission not found';
  END IF;
  IF c.lifecycle_status <> 'pending' THEN
    RETURN false;
  END IF;

  UPDATE public.affiliate_commissions
  SET lifecycle_status = 'approved',
      status = 'processing',
      updated_at = now()
  WHERE id = p_commission_id;

  UPDATE public.affiliates
  SET
    pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - c.commission_amount),
    available_balance = COALESCE(available_balance, 0) + c.commission_amount,
    updated_at = now()
  WHERE id = c.affiliate_id
  RETURNING * INTO aff;

  INSERT INTO public.affiliate_ledger (
    affiliate_id, commission_id, entry_type, amount,
    balance_pending_after, balance_available_after, currency, note
  ) VALUES (
    c.affiliate_id, c.id, 'commission_approved', c.commission_amount,
    aff.pending_earnings, aff.available_balance, 'USD', 'Commission approved'
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_affiliate_commission(
  p_commission_id uuid,
  p_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.affiliate_commissions%ROWTYPE;
  aff public.affiliates%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.affiliate_commissions WHERE id = p_commission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commission not found'; END IF;
  IF c.lifecycle_status <> 'pending' THEN RETURN false; END IF;

  UPDATE public.affiliate_commissions
  SET lifecycle_status = 'rejected',
      status = 'failed',
      notes = COALESCE(p_note, notes),
      updated_at = now()
  WHERE id = p_commission_id;

  UPDATE public.affiliates
  SET
    pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - c.commission_amount),
    total_earnings = GREATEST(0, COALESCE(total_earnings, 0) - c.commission_amount),
    total_conversions = GREATEST(0, COALESCE(total_conversions, 0) - 1),
    updated_at = now()
  WHERE id = c.affiliate_id
  RETURNING * INTO aff;

  INSERT INTO public.affiliate_ledger (
    affiliate_id, commission_id, entry_type, amount,
    balance_pending_after, balance_available_after, note
  ) VALUES (
    c.affiliate_id, c.id, 'commission_rejected', -c.commission_amount,
    aff.pending_earnings, aff.available_balance, COALESCE(p_note, 'Commission rejected')
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.clawback_affiliate_commission(
  p_commission_id uuid,
  p_refund_amount numeric DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.affiliate_commissions%ROWTYPE;
  aff public.affiliates%ROWTYPE;
  claw numeric;
  is_partial boolean := false;
  avail numeric;
  pend numeric;
  from_avail numeric;
  from_pend numeric;
BEGIN
  SELECT * INTO c FROM public.affiliate_commissions WHERE id = p_commission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commission not found'; END IF;
  IF c.lifecycle_status IN ('refunded', 'cancelled', 'rejected') THEN
    RETURN false;
  END IF;

  claw := COALESCE(p_refund_amount, c.commission_amount);
  IF claw <= 0 THEN RETURN false; END IF;
  claw := LEAST(claw, c.commission_amount - COALESCE(c.refunded_amount, 0));
  IF claw <= 0 THEN RETURN false; END IF;

  is_partial := (COALESCE(c.refunded_amount, 0) + claw) < c.commission_amount;

  UPDATE public.affiliate_commissions
  SET
    original_commission_amount = COALESCE(original_commission_amount, commission_amount),
    refunded_amount = COALESCE(refunded_amount, 0) + claw,
    commission_amount = GREATEST(0, commission_amount - claw),
    lifecycle_status = CASE
      WHEN NOT is_partial AND c.lifecycle_status = 'pending' THEN 'cancelled'
      WHEN NOT is_partial THEN 'refunded'
      ELSE 'partial_refund'
    END,
    status = CASE WHEN is_partial THEN status ELSE 'failed' END,
    notes = COALESCE(p_note, notes),
    updated_at = now()
  WHERE id = p_commission_id;

  SELECT COALESCE(available_balance, 0), COALESCE(pending_earnings, 0)
  INTO avail, pend
  FROM public.affiliates
  WHERE id = c.affiliate_id
  FOR UPDATE;

  IF c.lifecycle_status = 'pending' THEN
    from_pend := claw;
    from_avail := 0;
  ELSIF avail >= claw THEN
    from_avail := claw;
    from_pend := 0;
  ELSE
    from_avail := avail;
    from_pend := claw - avail;
  END IF;

  UPDATE public.affiliates
  SET
    available_balance = GREATEST(0, avail - from_avail),
    pending_earnings = GREATEST(0, pend - from_pend),
    total_earnings = GREATEST(0, COALESCE(total_earnings, 0) - claw),
    updated_at = now()
  WHERE id = c.affiliate_id
  RETURNING * INTO aff;

  INSERT INTO public.affiliate_ledger (
    affiliate_id, commission_id, entry_type, amount,
    balance_pending_after, balance_available_after, note
  ) VALUES (
    c.affiliate_id, c.id,
    CASE
      WHEN c.lifecycle_status = 'pending' AND NOT is_partial THEN 'commission_cancelled'
      WHEN is_partial THEN 'partial_refund'
      ELSE 'commission_refunded'
    END,
    -claw,
    aff.pending_earnings, aff.available_balance,
    COALESCE(p_note, 'Commission clawback')
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_affiliate_commission(
  p_commission_id uuid,
  p_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.clawback_affiliate_commission(p_commission_id, NULL, COALESCE(p_note, 'Cancelled'));
END;
$$;

REVOKE ALL ON FUNCTION public.increment_affiliate_earnings(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_affiliate_commission(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_affiliate_commission(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clawback_affiliate_commission(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_affiliate_commission(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.increment_affiliate_earnings(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_affiliate_commission(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_affiliate_commission(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.clawback_affiliate_commission(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_affiliate_commission(uuid, text) TO service_role;

-- Secure click recorder (service role)
CREATE OR REPLACE FUNCTION public.record_affiliate_click(
  p_link_id uuid,
  p_affiliate_id uuid,
  p_campaign_id uuid DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_session_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  click_id uuid;
  is_uniq boolean := true;
BEGIN
  IF p_session_key IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.affiliate_clicks
      WHERE link_id = p_link_id
        AND session_key = p_session_key
        AND created_at > now() - interval '24 hours'
    ) INTO is_uniq;
  END IF;

  INSERT INTO public.affiliate_clicks (
    link_id, affiliate_id, campaign_id, ip_address, user_agent,
    referrer, device_type, session_key, is_unique
  ) VALUES (
    p_link_id, p_affiliate_id, p_campaign_id, p_ip, p_user_agent,
    p_referrer, p_device_type, p_session_key, is_uniq
  )
  RETURNING id INTO click_id;

  UPDATE public.affiliate_links
  SET
    total_clicks = COALESCE(total_clicks, 0) + 1,
    unique_clicks = COALESCE(unique_clicks, 0) + CASE WHEN is_uniq THEN 1 ELSE 0 END
  WHERE id = p_link_id;

  UPDATE public.affiliates
  SET total_clicks = COALESCE(total_clicks, 0) + 1,
      updated_at = now()
  WHERE id = p_affiliate_id;

  IF p_campaign_id IS NOT NULL THEN
    -- no-op budget on click; conversions update budget_spent
    NULL;
  END IF;

  RETURN click_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_affiliate_click(uuid, uuid, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(uuid, uuid, uuid, text, text, text, text, text) TO service_role;

COMMENT ON TABLE public.affiliate_campaigns IS 'Affiliate / performance campaigns with budgets and tracking codes.';
COMMENT ON TABLE public.affiliate_ledger IS 'Immutable-style ledger for affiliate balance movements.';
COMMENT ON COLUMN public.affiliate_commissions.lifecycle_status IS 'Affiliate commission lifecycle: pending|approved|rejected|refunded|cancelled|partial_refund';
