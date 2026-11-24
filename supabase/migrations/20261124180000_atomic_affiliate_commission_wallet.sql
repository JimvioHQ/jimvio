-- Make commission approval, wallet credit, clawback and wallet debit atomic.
-- Also fix cumulative partial-refund accounting and add stable refund-event idempotency.

CREATE TABLE IF NOT EXISTS public.affiliate_commission_refund_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.affiliate_commissions(id) ON DELETE RESTRICT,
  refund_key text NOT NULL,
  requested_amount numeric(18,2),
  applied_amount numeric(18,2),
  wallet_debited boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT affiliate_commission_refund_events_commission_key UNIQUE (commission_id, refund_key)
);

ALTER TABLE public.affiliate_commission_refund_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.affiliate_commission_refund_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.affiliate_commission_refund_events TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.create_pending_affiliate_commission_atomic(
  p_affiliate_id uuid,
  p_order_id uuid,
  p_order_item_id uuid,
  p_product_id uuid,
  p_vendor_id uuid,
  p_link_id uuid,
  p_campaign_id uuid,
  p_commission_rate numeric,
  p_order_amount numeric,
  p_commission_amount numeric,
  p_attribution_model text DEFAULT 'last_touch',
  p_attributed_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid;
  v_commission_id uuid;
  v_now timestamptz := pg_catalog.now();
BEGIN
  IF p_commission_amount IS NULL OR p_commission_amount <= 0
     OR p_order_amount IS NULL OR p_order_amount < 0
     OR p_commission_rate IS NULL OR p_commission_rate < 0 OR p_commission_rate > 100 THEN
    RETURN pg_catalog.jsonb_build_object('created', false, 'reason', 'invalid_commission_values');
  END IF;

  SELECT user_id
    INTO v_user_id
    FROM public.affiliates
   WHERE id = p_affiliate_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Affiliate not found';
  END IF;

  INSERT INTO public.affiliate_commissions (
    affiliate_id, link_id, order_id, order_item_id, product_id, vendor_id, campaign_id,
    commission_rate, order_amount, commission_amount, original_commission_amount,
    status, lifecycle_status, attribution_model, attributed_at, created_at, updated_at
  ) VALUES (
    p_affiliate_id, p_link_id, p_order_id, p_order_item_id, p_product_id, p_vendor_id, p_campaign_id,
    p_commission_rate, p_order_amount, p_commission_amount, p_commission_amount,
    'pending', 'pending', COALESCE(p_attribution_model, 'last_touch'),
    COALESCE(p_attributed_at, v_now), v_now, v_now
  )
  ON CONFLICT (order_item_id) WHERE order_item_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_commission_id;

  IF v_commission_id IS NULL THEN
    SELECT id INTO v_commission_id
      FROM public.affiliate_commissions
     WHERE order_item_id = p_order_item_id;
    RETURN pg_catalog.jsonb_build_object(
      'created', false,
      'commission_id', v_commission_id,
      'user_id', v_user_id,
      'reason', 'already_exists'
    );
  END IF;

  PERFORM public.increment_affiliate_earnings(p_affiliate_id, p_commission_amount);

  INSERT INTO public.affiliate_ledger (
    affiliate_id, commission_id, entry_type, amount, note
  ) VALUES (
    p_affiliate_id, v_commission_id, 'commission_pending',
    p_commission_amount, 'Commission pending approval'
  );

  IF p_campaign_id IS NOT NULL THEN
    UPDATE public.affiliate_campaigns
       SET budget_spent = COALESCE(budget_spent, 0) + p_commission_amount,
           updated_at = v_now
     WHERE id = p_campaign_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Affiliate campaign not found';
    END IF;
  END IF;

  IF p_link_id IS NOT NULL THEN
    UPDATE public.affiliate_links
       SET total_conversions = COALESCE(total_conversions, 0) + 1,
           total_earnings = COALESCE(total_earnings, 0) + p_commission_amount,
           updated_at = v_now
     WHERE id = p_link_id
       AND affiliate_id = p_affiliate_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Affiliate link not found or does not belong to affiliate';
    END IF;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'created', true,
    'commission_id', v_commission_id,
    'user_id', v_user_id
  );
END;
$function$;

ALTER FUNCTION public.create_pending_affiliate_commission_atomic(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, text, timestamptz
) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_pending_affiliate_commission_atomic(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_affiliate_commission_atomic(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, text, timestamptz
) TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.approve_affiliate_commission_atomic(p_commission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_commission public.affiliate_commissions%ROWTYPE;
  v_user_id uuid;
  v_amount numeric(18,2);
  v_reference text;
  v_existing_tx uuid;
  v_now timestamptz := pg_catalog.now();
BEGIN
  SELECT *
    INTO v_commission
    FROM public.affiliate_commissions
   WHERE id = p_commission_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission not found';
  END IF;

  IF v_commission.lifecycle_status = 'pending' THEN
    PERFORM public.approve_affiliate_commission(p_commission_id);
    SELECT *
      INTO v_commission
      FROM public.affiliate_commissions
     WHERE id = p_commission_id
     FOR UPDATE;
  END IF;

  IF v_commission.lifecycle_status <> 'approved' THEN
    RETURN pg_catalog.jsonb_build_object(
      'approved', false,
      'credited', false,
      'reason', 'commission_not_approvable'
    );
  END IF;

  v_amount := pg_catalog.round(COALESCE(v_commission.commission_amount, 0), 2);
  IF v_amount <= 0 THEN
    RETURN pg_catalog.jsonb_build_object('approved', false, 'credited', false, 'reason', 'invalid_amount');
  END IF;

  SELECT user_id
    INTO v_user_id
    FROM public.affiliates
   WHERE id = v_commission.affiliate_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Affiliate account not found for commission %', p_commission_id;
  END IF;

  v_reference := 'AFF-COMM-' || v_commission.id::text;
  SELECT id INTO v_existing_tx
    FROM public.transactions
   WHERE reference = v_reference
   LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'approved', true,
      'credited', false,
      'already_credited', true,
      'amount', v_amount,
      'user_id', v_user_id
    );
  END IF;

  INSERT INTO public.wallets(user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM 1
    FROM public.wallets
   WHERE user_id = v_user_id
   FOR UPDATE;

  UPDATE public.wallets
     SET available_balance = COALESCE(available_balance, 0) + v_amount,
         total_earned = COALESCE(total_earned, 0) + v_amount,
         currency = 'USD',
         updated_at = v_now
   WHERE user_id = v_user_id;

  INSERT INTO public.transactions (
    user_id, order_id, type, amount, currency, status, reference, description, metadata, created_at, updated_at
  ) VALUES (
    v_user_id,
    v_commission.order_id,
    'affiliate_commission',
    v_amount,
    'USD',
    'completed',
    v_reference,
    'Affiliate commission approved',
    pg_catalog.jsonb_build_object('commission_id', v_commission.id),
    v_now,
    v_now
  );

  RETURN pg_catalog.jsonb_build_object(
    'approved', true,
    'credited', true,
    'amount', v_amount,
    'user_id', v_user_id
  );
END;
$function$;

-- Correct cumulative partial-refund math. commission_amount is the remaining
-- amount; refunded_amount is cumulative, so remaining = original - refunded.
CREATE OR REPLACE FUNCTION public.clawback_affiliate_commission(
  p_commission_id uuid,
  p_refund_amount numeric DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  c public.affiliate_commissions%ROWTYPE;
  aff public.affiliates%ROWTYPE;
  original_amount numeric;
  remaining_amount numeric;
  claw numeric;
  new_refunded numeric;
  is_partial boolean := false;
  avail numeric;
  pend numeric;
  from_avail numeric;
  from_pend numeric;
BEGIN
  SELECT * INTO c
    FROM public.affiliate_commissions
   WHERE id = p_commission_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission not found';
  END IF;

  IF c.lifecycle_status IN ('refunded', 'cancelled', 'rejected') THEN
    RETURN false;
  END IF;

  original_amount := COALESCE(
    c.original_commission_amount,
    COALESCE(c.commission_amount, 0) + COALESCE(c.refunded_amount, 0)
  );
  remaining_amount := GREATEST(0, original_amount - COALESCE(c.refunded_amount, 0));
  claw := LEAST(COALESCE(p_refund_amount, remaining_amount), remaining_amount);

  IF claw <= 0 THEN
    RETURN false;
  END IF;

  new_refunded := COALESCE(c.refunded_amount, 0) + claw;
  is_partial := new_refunded < original_amount;

  UPDATE public.affiliate_commissions
     SET original_commission_amount = original_amount,
         refunded_amount = new_refunded,
         commission_amount = GREATEST(0, original_amount - new_refunded),
         lifecycle_status = CASE
           WHEN NOT is_partial AND c.status::text = 'pending' THEN 'cancelled'
           WHEN NOT is_partial THEN 'refunded'
           ELSE 'partial_refund'
         END,
         status = CASE WHEN NOT is_partial THEN 'failed'::public.payout_status ELSE c.status END,
         notes = COALESCE(p_note, notes),
         updated_at = pg_catalog.now()
   WHERE id = p_commission_id;

  SELECT COALESCE(available_balance, 0), COALESCE(pending_earnings, 0)
    INTO avail, pend
    FROM public.affiliates
   WHERE id = c.affiliate_id
   FOR UPDATE;

  IF c.status::text = 'pending' THEN
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
     SET available_balance = GREATEST(0, avail - from_avail),
         pending_earnings = GREATEST(0, pend - from_pend),
         total_earnings = GREATEST(0, COALESCE(total_earnings, 0) - claw),
         updated_at = pg_catalog.now()
   WHERE id = c.affiliate_id
   RETURNING * INTO aff;

  INSERT INTO public.affiliate_ledger (
    affiliate_id, commission_id, entry_type, amount,
    balance_pending_after, balance_available_after, currency, note
  ) VALUES (
    c.affiliate_id,
    c.id,
    CASE
      WHEN c.status::text = 'pending' AND NOT is_partial THEN 'commission_cancelled'
      WHEN is_partial THEN 'partial_refund'
      ELSE 'commission_refunded'
    END,
    -claw,
    aff.pending_earnings,
    aff.available_balance,
    'USD',
    COALESCE(p_note, 'Commission clawback')
  );

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clawback_affiliate_commission_atomic(
  p_commission_id uuid,
  p_refund_key text,
  p_refund_amount numeric DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_commission public.affiliate_commissions%ROWTYPE;
  v_after public.affiliate_commissions%ROWTYPE;
  v_user_id uuid;
  v_old_refunded numeric;
  v_original numeric;
  v_remaining numeric;
  v_requested numeric;
  v_applied numeric;
  v_refund_event_id uuid;
  v_wallet_credit_exists boolean;
  v_wallet_available numeric;
  v_wallet_total_earned numeric;
  v_reference text;
  v_now timestamptz := pg_catalog.now();
BEGIN
  IF p_refund_key IS NULL OR pg_catalog.btrim(p_refund_key) = '' THEN
    RAISE EXCEPTION 'A stable refund key is required';
  END IF;

  SELECT *
    INTO v_commission
    FROM public.affiliate_commissions
   WHERE id = p_commission_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission not found';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.affiliate_commission_refund_events
     WHERE commission_id = p_commission_id
       AND refund_key = p_refund_key
  ) THEN
    RETURN pg_catalog.jsonb_build_object('processed', false, 'already_processed', true, 'amount', 0);
  END IF;

  IF v_commission.lifecycle_status IN ('refunded', 'cancelled', 'rejected') THEN
    RETURN pg_catalog.jsonb_build_object('processed', false, 'reason', 'commission_terminal');
  END IF;

  v_old_refunded := COALESCE(v_commission.refunded_amount, 0);
  v_original := COALESCE(
    v_commission.original_commission_amount,
    COALESCE(v_commission.commission_amount, 0) + v_old_refunded
  );
  v_remaining := GREATEST(0, v_original - v_old_refunded);
  v_requested := LEAST(COALESCE(p_refund_amount, v_remaining), v_remaining);

  IF v_requested <= 0 THEN
    RETURN pg_catalog.jsonb_build_object('processed', false, 'reason', 'no_remaining_commission');
  END IF;

  INSERT INTO public.affiliate_commission_refund_events (
    commission_id, refund_key, requested_amount, note
  ) VALUES (
    p_commission_id, p_refund_key, v_requested, p_note
  )
  ON CONFLICT (commission_id, refund_key) DO NOTHING
  RETURNING id INTO v_refund_event_id;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('processed', false, 'already_processed', true, 'amount', 0);
  END IF;

  v_reference := 'AFF-CLAW-' || p_commission_id::text || '-' || pg_catalog.md5(p_refund_key);
  SELECT user_id
    INTO v_user_id
    FROM public.affiliates
   WHERE id = v_commission.affiliate_id
   FOR UPDATE;

  v_wallet_credit_exists := EXISTS (
    SELECT 1 FROM public.transactions
     WHERE reference = 'AFF-COMM-' || p_commission_id::text
  );

  PERFORM public.clawback_affiliate_commission(p_commission_id, v_requested, p_note);

  SELECT *
    INTO v_after
    FROM public.affiliate_commissions
   WHERE id = p_commission_id;

  v_applied := GREATEST(0, COALESCE(v_after.refunded_amount, 0) - v_old_refunded);
  IF v_applied <= 0 THEN
    UPDATE public.affiliate_commission_refund_events
       SET applied_amount = 0, processed_at = v_now
     WHERE id = v_refund_event_id;
    RETURN pg_catalog.jsonb_build_object('processed', false, 'amount', 0, 'reason', 'nothing_applied');
  END IF;

  IF v_wallet_credit_exists THEN
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Affiliate user not found for commission %', p_commission_id;
    END IF;

    INSERT INTO public.wallets(user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT COALESCE(available_balance, 0), COALESCE(total_earned, 0)
      INTO v_wallet_available, v_wallet_total_earned
      FROM public.wallets
     WHERE user_id = v_user_id
     FOR UPDATE;

    UPDATE public.wallets
       SET available_balance = GREATEST(0, v_wallet_available - v_applied),
           total_earned = GREATEST(0, v_wallet_total_earned - v_applied),
           updated_at = v_now
     WHERE user_id = v_user_id;

    INSERT INTO public.transactions (
      user_id, order_id, type, amount, currency, status, reference, description, metadata, created_at, updated_at
    ) VALUES (
      v_user_id,
      v_commission.order_id,
      'affiliate_commission_clawback',
      -v_applied,
      'USD',
      'completed',
      v_reference,
      'Affiliate commission clawback',
      pg_catalog.jsonb_build_object(
        'commission_id', p_commission_id,
        'refund_event_id', v_refund_event_id,
        'refund_key_hash', pg_catalog.md5(p_refund_key)
      ),
      v_now,
      v_now
    );
  END IF;

  UPDATE public.affiliate_commission_refund_events
     SET applied_amount = v_applied,
         wallet_debited = v_wallet_credit_exists,
         processed_at = v_now
   WHERE id = v_refund_event_id;

  RETURN pg_catalog.jsonb_build_object(
    'processed', true,
    'already_processed', false,
    'amount', v_applied,
    'wallet_debited', v_wallet_credit_exists,
    'user_id', v_user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_affiliate_commission(
  p_commission_id uuid,
  p_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.clawback_affiliate_commission_atomic(
    p_commission_id,
    'cancel:' || p_commission_id::text,
    NULL,
    COALESCE(p_note, 'Cancelled')
  );
  RETURN COALESCE((v_result->>'processed')::boolean, false)
      OR COALESCE((v_result->>'already_processed')::boolean, false);
END;
$function$;

ALTER FUNCTION public.approve_affiliate_commission_atomic(uuid) OWNER TO postgres;
ALTER FUNCTION public.clawback_affiliate_commission(uuid, numeric, text) OWNER TO postgres;
ALTER FUNCTION public.clawback_affiliate_commission_atomic(uuid, text, numeric, text) OWNER TO postgres;
ALTER FUNCTION public.cancel_affiliate_commission(uuid, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.approve_affiliate_commission(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.clawback_affiliate_commission(uuid, numeric, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_affiliate_commission(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.clawback_affiliate_commission(uuid, numeric, text) TO postgres;

REVOKE ALL ON FUNCTION public.approve_affiliate_commission_atomic(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_affiliate_commission_atomic(uuid) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.clawback_affiliate_commission_atomic(uuid, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clawback_affiliate_commission_atomic(uuid, text, numeric, text) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.cancel_affiliate_commission(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_affiliate_commission(uuid, text) TO postgres, service_role;
