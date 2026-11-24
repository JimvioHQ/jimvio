-- Atomic wallet deposit completion: wallet balance, ledger, transaction and
-- deposit status commit or roll back together. Prevents concurrent webhook double-credit.
CREATE OR REPLACE FUNCTION public.complete_wallet_deposit_atomic(
  p_deposit_id uuid,
  p_provider_reference text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_verified_amount numeric DEFAULT NULL,
  p_verified_currency text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_deposit public.wallet_deposits%ROWTYPE;
  v_amount numeric(18,2);
  v_reference text;
  v_provider_reference text;
  v_provider text;
  v_expected_currency text;
  v_received_currency text;
  v_now timestamptz := pg_catalog.now();
  v_existing_tx uuid;
BEGIN
  SELECT *
    INTO v_deposit
    FROM public.wallet_deposits
   WHERE id = p_deposit_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('credited', false, 'amount', 0, 'reason', 'deposit_not_found');
  END IF;

  IF v_deposit.status = 'completed' THEN
    RETURN pg_catalog.jsonb_build_object(
      'credited', false,
      'amount', pg_catalog.round(COALESCE(v_deposit.amount, 0), 2),
      'reason', 'already_completed'
    );
  END IF;

  IF v_deposit.status NOT IN ('pending', 'processing') THEN
    RETURN pg_catalog.jsonb_build_object('credited', false, 'amount', 0, 'reason', 'deposit_not_payable');
  END IF;

  v_amount := pg_catalog.round(COALESCE(v_deposit.amount, 0), 2);
  IF v_amount <= 0 THEN
    RETURN pg_catalog.jsonb_build_object('credited', false, 'amount', 0, 'reason', 'invalid_amount');
  END IF;

  IF p_verified_amount IS NOT NULL THEN
    IF p_verified_amount::text IN ('NaN', 'Infinity', '-Infinity') THEN
      RETURN pg_catalog.jsonb_build_object('credited', false, 'amount', 0, 'reason', 'invalid_verified_amount');
    END IF;

    v_expected_currency := pg_catalog.upper(COALESCE(v_deposit.currency, 'USD'));
    v_received_currency := pg_catalog.upper(COALESCE(p_verified_currency, 'USD'));
    IF v_received_currency <> v_expected_currency
       OR pg_catalog.abs(pg_catalog.round(p_verified_amount, 2) - v_amount) > 0.05 THEN
      RETURN pg_catalog.jsonb_build_object('credited', false, 'amount', 0, 'reason', 'amount_currency_mismatch');
    END IF;
  END IF;

  v_reference := 'WDEP-' || v_deposit.id::text;
  v_provider_reference := NULLIF(pg_catalog.btrim(p_provider_reference), '');
  v_provider := NULLIF(pg_catalog.btrim(p_provider), '');

  -- Repair a deposit whose idempotency transaction already exists without
  -- applying a second balance credit.
  SELECT id INTO v_existing_tx
    FROM public.transactions
   WHERE reference = v_reference
   LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    UPDATE public.wallet_deposits
       SET status = 'completed',
           completed_at = v_now,
           reference = COALESCE(v_provider_reference, reference),
           currency = 'USD'
     WHERE id = v_deposit.id;

    RETURN pg_catalog.jsonb_build_object(
      'credited', false,
      'amount', v_amount,
      'reason', 'already_credited'
    );
  END IF;

  INSERT INTO public.wallets (user_id)
  VALUES (v_deposit.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM 1
    FROM public.wallets
   WHERE user_id = v_deposit.user_id
   FOR UPDATE;

  UPDATE public.wallets
     SET available_balance = COALESCE(available_balance, 0) + v_amount,
         total_earned = COALESCE(total_earned, 0) + v_amount,
         currency = 'USD',
         updated_at = v_now
   WHERE user_id = v_deposit.user_id;

  INSERT INTO public.transactions (
    user_id,
    type,
    direction,
    amount,
    currency,
    status,
    provider,
    provider_transaction_id,
    description,
    metadata,
    reference,
    created_at,
    updated_at
  ) VALUES (
    v_deposit.user_id,
    'wallet_deposit',
    'credit',
    v_amount,
    'USD',
    'completed',
    v_provider,
    v_provider_reference,
    'Wallet deposit',
    pg_catalog.jsonb_build_object('deposit_id', v_deposit.id),
    v_reference,
    v_now,
    v_now
  );

  UPDATE public.wallet_deposits
     SET status = 'completed',
         completed_at = v_now,
         reference = COALESCE(v_provider_reference, reference),
         currency = 'USD'
   WHERE id = v_deposit.id;

  RETURN pg_catalog.jsonb_build_object('credited', true, 'amount', v_amount, 'reason', 'credited', 'user_id', v_deposit.user_id);
END;
$function$;

ALTER FUNCTION public.complete_wallet_deposit_atomic(uuid, text, text, numeric, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.complete_wallet_deposit_atomic(uuid, text, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_wallet_deposit_atomic(uuid, text, text, numeric, text) TO postgres, service_role;
