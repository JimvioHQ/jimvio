-- Atomically reserve a single Jimvio Wallet debit across every unpaid order in a cart.
-- This prevents partial multi-vendor checkout payments and duplicate debits on retries.
CREATE OR REPLACE FUNCTION public.reserve_orders_wallet_payment(
  p_order_ids uuid[],
  p_user_id uuid,
  p_amounts numeric[],
  p_currency text,
  p_reference text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order_id uuid;
  v_order public.orders%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_existing public.transactions%ROWTYPE;
  v_balance numeric(18,2);
  v_total numeric(18,2) := 0;
  v_existing_count integer := 0;
  v_index integer;
  v_has_existing boolean;
BEGIN
  IF p_user_id IS NULL
     OR p_order_ids IS NULL
     OR pg_catalog.cardinality(p_order_ids) < 1
     OR pg_catalog.cardinality(p_order_ids) > 50
     OR p_amounts IS NULL
     OR pg_catalog.cardinality(p_order_ids) <> pg_catalog.cardinality(p_amounts)
     OR p_currency IS NULL
     OR pg_catalog.upper(p_currency) NOT IN ('USD', 'RWF')
     OR p_reference IS NULL
     OR pg_catalog.length(pg_catalog.btrim(p_reference)) < 8
     OR EXISTS (
       SELECT 1
         FROM pg_catalog.unnest(p_amounts) AS amount(value)
        WHERE amount.value IS NULL OR amount.value <= 0
     )
     OR (
       SELECT pg_catalog.count(DISTINCT ids.order_id)
         FROM pg_catalog.unnest(p_order_ids) AS ids(order_id)
     ) <> pg_catalog.cardinality(p_order_ids)
  THEN
    RAISE EXCEPTION 'invalid_wallet_orders_payment_arguments';
  END IF;

  -- Lock orders in deterministic order to avoid deadlocks between overlapping carts.
  FOR v_order_id IN
    SELECT ids.order_id
      FROM pg_catalog.unnest(p_order_ids) AS ids(order_id)
     ORDER BY ids.order_id
  LOOP
    SELECT *
      INTO v_order
      FROM public.orders
     WHERE id = v_order_id
     FOR UPDATE;

    IF NOT FOUND OR v_order.buyer_id IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'order_not_found';
    END IF;
  END LOOP;

  -- Reuse any existing per-order reservation and debit only missing orders.
  -- This also makes retries safe when a single order was reserved separately
  -- before the buyer returns to finish a multi-vendor cart.
  FOR v_index IN 1..pg_catalog.cardinality(p_order_ids)
  LOOP
    SELECT *
      INTO v_order
      FROM public.orders
     WHERE id = p_order_ids[v_index];

    SELECT *
      INTO v_existing
      FROM public.transactions
     WHERE provider = 'wallet'
       AND reference = p_reference || '-' || p_order_ids[v_index]::text
     FOR UPDATE;

    v_has_existing := FOUND;

    IF v_has_existing THEN
      v_existing_count := v_existing_count + 1;
      IF v_existing.user_id IS DISTINCT FROM p_user_id
         OR v_existing.order_id IS DISTINCT FROM p_order_ids[v_index]
         OR v_existing.amount IS DISTINCT FROM p_amounts[v_index]
         OR pg_catalog.upper(COALESCE(v_existing.currency, 'USD')) <> pg_catalog.upper(p_currency)
         OR v_existing.status IN ('refunded', 'cancelled')
      THEN
        RAISE EXCEPTION 'wallet_orders_payment_reference_conflict';
      END IF;
    ELSE
      v_total := v_total + p_amounts[v_index];
    END IF;

    IF v_order.status IN ('cancelled', 'refunded')
       OR v_order.payment_status IN ('refunded', 'cancelled')
    THEN
      RAISE EXCEPTION 'order_not_payable';
    END IF;

    IF NOT v_has_existing AND v_order.payment_status IN ('paid', 'completed') THEN
      RAISE EXCEPTION 'order_already_paid';
    END IF;

    IF NOT v_has_existing AND v_order.status NOT IN ('pending', 'checkout_direct') THEN
      RAISE EXCEPTION 'order_not_payable';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM public.transactions t
       WHERE t.order_id = p_order_ids[v_index]
         AND t.provider IS DISTINCT FROM 'wallet'
         AND t.status IN ('pending', 'processing')
    ) THEN
      RAISE EXCEPTION 'payment_in_progress';
    END IF;
  END LOOP;

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

  IF COALESCE(v_wallet.available_balance, 0) < v_total THEN
    RETURN pg_catalog.jsonb_build_object(
      'ok', false,
      'reason', 'insufficient_balance',
      'available_balance', COALESCE(v_wallet.available_balance, 0),
      'required_amount', v_total,
      'currency', pg_catalog.upper(p_currency)
    );
  END IF;

  v_balance := COALESCE(v_wallet.available_balance, 0) - v_total;

  IF v_total > 0 THEN
    UPDATE public.wallets
       SET available_balance = v_balance,
           updated_at = pg_catalog.now()
     WHERE id = v_wallet.id;
  END IF;

  FOR v_index IN 1..pg_catalog.cardinality(p_order_ids)
  LOOP
    SELECT *
      INTO v_existing
      FROM public.transactions
     WHERE provider = 'wallet'
       AND reference = p_reference || '-' || p_order_ids[v_index]::text
     FOR UPDATE;

    IF NOT FOUND THEN
      SELECT *
        INTO v_order
        FROM public.orders
       WHERE id = p_order_ids[v_index];

      INSERT INTO public.transactions (
        user_id, order_id, type, direction, amount, currency, status,
        provider, provider_transaction_id, reference, description, metadata,
        created_at, updated_at
      ) VALUES (
        p_user_id,
        v_order.id,
        CASE
          WHEN v_order.integration_source = 'community' THEN 'community_subscription'
          ELSE 'marketplace_order'
        END,
        'debit',
        p_amounts[v_index],
        pg_catalog.upper(p_currency),
        'pending',
        'wallet',
        p_reference || '-' || v_order.id::text,
        p_reference || '-' || v_order.id::text,
        CASE
          WHEN v_order.integration_source = 'community' THEN 'Community subscription paid with Jimvio Wallet'
          ELSE 'Marketplace order paid with Jimvio Wallet'
        END,
        pg_catalog.jsonb_build_object(
          'payment_method', 'wallet',
          'order_id', v_order.id,
          'cart_payment_reference', p_reference
        ),
        pg_catalog.now(),
        pg_catalog.now()
      );
    END IF;
  END LOOP;

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'already_reserved', v_existing_count = pg_catalog.cardinality(p_order_ids),
    'balance_after', v_balance,
    'required_amount', v_total,
    'currency', pg_catalog.upper(p_currency)
  );
END;
$function$;

ALTER FUNCTION public.reserve_orders_wallet_payment(uuid[], uuid, numeric[], text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reserve_orders_wallet_payment(uuid[], uuid, numeric[], text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_orders_wallet_payment(uuid[], uuid, numeric[], text, text) TO postgres, service_role;
