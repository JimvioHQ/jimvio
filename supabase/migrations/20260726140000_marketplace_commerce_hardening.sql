-- Marketplace & Commerce production hardening
-- 1) Atomic inventory adjustments
-- 2) Review helpful votes (one per user)
-- 3) Promo codes (replace hardcoded API rules)
-- 4) Affiliate click insert lockdown
-- 5) Catalog filter indexes
-- 6) Order affiliate attribution hooks (nullable)

-- ── Inventory RPCs ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.adjust_product_inventory(
  p_product_id uuid,
  p_delta integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_qty integer;
BEGIN
  IF p_product_id IS NULL OR p_delta IS NULL THEN
    RAISE EXCEPTION 'product_id and delta are required';
  END IF;

  UPDATE public.products
  SET inventory_quantity = GREATEST(0, COALESCE(inventory_quantity, 0) + p_delta),
      updated_at = now()
  WHERE id = p_product_id
  RETURNING inventory_quantity INTO new_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product not found';
  END IF;

  RETURN new_qty;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_variant_inventory(
  p_variant_id uuid,
  p_delta integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_qty integer;
BEGIN
  IF p_variant_id IS NULL OR p_delta IS NULL THEN
    RAISE EXCEPTION 'variant_id and delta are required';
  END IF;

  UPDATE public.product_variants
  SET inventory_quantity = GREATEST(0, COALESCE(inventory_quantity, 0) + p_delta),
      updated_at = now()
  WHERE id = p_variant_id
  RETURNING inventory_quantity INTO new_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'variant not found';
  END IF;

  RETURN new_qty;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_product_inventory(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_variant_inventory(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_product_inventory(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.adjust_variant_inventory(uuid, integer) TO service_role;

-- ── Review helpful votes ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.review_helpful_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review
  ON public.review_helpful_votes (review_id, created_at DESC);

ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_helpful_votes'
      AND policyname = 'review_helpful_votes_select'
  ) THEN
    CREATE POLICY review_helpful_votes_select
      ON public.review_helpful_votes
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_helpful_votes'
      AND policyname = 'review_helpful_votes_insert_own'
  ) THEN
    CREATE POLICY review_helpful_votes_insert_own
      ON public.review_helpful_votes
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_helpful_votes'
      AND policyname = 'review_helpful_votes_delete_own'
  ) THEN
    CREATE POLICY review_helpful_votes_delete_own
      ON public.review_helpful_votes
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.vote_review_helpful(p_review_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_count integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.reviews WHERE id = p_review_id) THEN
    RAISE EXCEPTION 'Review not found';
  END IF;

  INSERT INTO public.review_helpful_votes (review_id, user_id)
  VALUES (p_review_id, uid)
  ON CONFLICT (review_id, user_id) DO NOTHING;

  UPDATE public.reviews r
  SET helpful_count = (
    SELECT COUNT(*)::int FROM public.review_helpful_votes v WHERE v.review_id = r.id
  )
  WHERE r.id = p_review_id
  RETURNING helpful_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.vote_review_helpful(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vote_review_helpful(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_review_helpful(uuid) TO service_role;

-- ── Promo codes ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value >= 0),
  max_discount numeric,
  min_subtotal numeric NOT NULL DEFAULT 0,
  currency text,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_codes_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_active_code
  ON public.promo_codes (code)
  WHERE is_active = true;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'promo_codes'
      AND policyname = 'promo_codes_select_active'
  ) THEN
    CREATE POLICY promo_codes_select_active
      ON public.promo_codes
      FOR SELECT
      TO authenticated, anon
      USING (
        is_active = true
        AND (starts_at IS NULL OR starts_at <= now())
        AND (ends_at IS NULL OR ends_at >= now())
      );
  END IF;
END $$;

INSERT INTO public.promo_codes (code, discount_type, discount_value, max_discount, metadata)
VALUES
  ('JIMVIO10', 'percent', 10, NULL, '{"source":"seed"}'::jsonb),
  ('JIMVIO20', 'percent', 20, NULL, '{"source":"seed"}'::jsonb),
  ('JIMVIO50', 'percent', 50, NULL, '{"source":"seed"}'::jsonb),
  ('WELCOME', 'percent', 10, NULL, '{"source":"seed"}'::jsonb),
  ('FREESHIP', 'fixed', 0, NULL, '{"source":"seed","note":"shipping handled separately"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ── Affiliate click insert lockdown ──────────────────────────────────────────

DROP POLICY IF EXISTS affiliate_clicks_insert ON public.affiliate_clicks;

-- Inserts go through service role / SECURITY DEFINER paths only.
-- Keep select for affiliates who own the click.

-- ── Catalog indexes ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_active_rating
  ON public.products (rating DESC)
  WHERE status = 'active' AND is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_active_brand
  ON public.products (brand)
  WHERE status = 'active' AND is_active = true AND deleted_at IS NULL AND brand IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_active_price
  ON public.products (price)
  WHERE status = 'active' AND is_active = true AND deleted_at IS NULL;

-- ── Order attribution hooks (nullable, non-breaking) ─────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS referral_code text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS campaign_attribution jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_referral_code
  ON public.orders (referral_code)
  WHERE referral_code IS NOT NULL;

COMMENT ON COLUMN public.orders.referral_code IS 'Affiliate / referral code captured at checkout (jimvio_ref).';
COMMENT ON COLUMN public.orders.campaign_attribution IS 'Campaign attribution payload for future affiliate engine.';
