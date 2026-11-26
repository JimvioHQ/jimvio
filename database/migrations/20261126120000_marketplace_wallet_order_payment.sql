-- Atomic reservation for Marketplace orders paid from Jimvio Wallet.
-- Service-role only. The wallet debit and transaction reservation commit together,
-- so retries cannot debit twice even if order finalization needs to be retried.
CREATE OR REPLACE FUNCTION public.reserve_order_wallet_payment(
  p_order_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_reference text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_existing public.transactions%ROWTYPE;
  v_balance numeric(18,2);
  v_now timestamptz := pg_catalog.now();
BEGIN
  IF p_order_id IS NULL OR p_user_id IS NULL
     OR p_amount IS NULL OR p_amount <= 0
     OR p_currency IS NULL OR pg_catalog.upper(p_currency) NOT IN ('USD', 'RWF')
     OR p_reference IS NULL OR pg_catalog.length(pg_catalog.btrim(p_reference)) < 8 THEN
    RAISE EXCEPTION 'invalid_wallet_order_payment_arguments';
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND OR v_order.buyer_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.payment_status IN ('paid', 'completed') THEN
    RETURN pg_catalog.jsonb_build_object('ok', true, 'already_paid', true);
  END IF;

  IF v_order.status IN ('cancelled', 'refunded')
     OR v_order.payment_status IN ('refunded', 'cancelled')
     OR v_order.status NOT IN ('pending', 'checkout_direct') THEN
    RAISE EXCEPTION 'order_not_payable';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.transactions
   WHERE provider = 'wallet'
     AND (provider_transaction_id = p_reference OR reference = p_reference)
   LIMIT 1
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing.user_id IS DISTINCT FROM p_user_id
       OR v_existing.order_id IS DISTINCT FROM p_order_id THEN
      RAISE EXCEPTION 'wallet_payment_reference_conflict';
    END IF;
    IF v_existing.status IN ('refunded', 'cancelled') THEN
      RAISE EXCEPTION 'order_not_payable';
    END IF;
    RETURN pg_catalog.jsonb_build_object(
      'ok', true,
      'already_reserved', true,
      'transaction_id', v_existing.id,
      'balance_after', NULL
    );
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.transactions t
     WHERE t.order_id = p_order_id
       AND t.provider IS DISTINCT FROM 'wallet'
       AND t.status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'payment_in_progress';
  END IF;

  SELECT *
    INTO v_wallet
    FROM public.wallets
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  IF pg_catalog.upper(COALESCE(v_wallet.currency, 'USD')) <> pg_catalog.upper(p_currency) THEN
    RAISE EXCEPTION 'wallet_currency_mismatch';
  END IF;

  IF COALESCE(v_wallet.available_balance, 0) < p_amount THEN
    RETURN pg_catalog.jsonb_build_object(
      'ok', false,
      'reason', 'insufficient_balance',
      'available_balance', COALESCE(v_wallet.available_balance, 0),
      'required_amount', p_amount,
      'currency', pg_catalog.upper(p_currency)
    );
  END IF;

  v_balance := COALESCE(v_wallet.available_balance, 0) - p_amount;

  UPDATE public.wallets
     SET available_balance = v_balance,
         updated_at = v_now
   WHERE id = v_wallet.id;

  INSERT INTO public.transactions (
    user_id, order_id, type, direction, amount, currency, status,
    provider, provider_transaction_id, reference, description, metadata,
    created_at, updated_at
  ) VALUES (
    p_user_id, p_order_id,
    CASE WHEN v_order.integration_source = 'community' THEN 'community_subscription' ELSE 'marketplace_order' END,
    'debit', p_amount, pg_catalog.upper(p_currency), 'pending', 'wallet', p_reference,
    p_reference,
    CASE WHEN v_order.integration_source = 'community' THEN 'Community subscription paid with Jimvio Wallet' ELSE 'Marketplace order paid with Jimvio Wallet' END,
    pg_catalog.jsonb_build_object('payment_method', 'wallet', 'order_id', p_order_id),
    v_now, v_now
  )
  RETURNING * INTO v_existing;

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'already_reserved', false,
    'transaction_id', v_existing.id,
    'balance_after', v_balance,
    'currency', pg_catalog.upper(p_currency)
  );
END;
$function$;

ALTER FUNCTION public.reserve_order_wallet_payment(uuid, uuid, numeric, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reserve_order_wallet_payment(uuid, uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_order_wallet_payment(uuid, uuid, numeric, text, text) TO postgres, service_role;
