-- Mirror: expand wallet_deposits + creator_payout_methods method CHECKs.
-- See supabase/migrations/20260905020000_wallet_deposit_method_check.sql

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wallet_deposits'
  ) THEN
    ALTER TABLE public.wallet_deposits
      DROP CONSTRAINT IF EXISTS wallet_deposits_method_check;

    ALTER TABLE public.wallet_deposits
      ADD CONSTRAINT wallet_deposits_method_check
      CHECK (
        method = ANY (
          ARRAY[
            'manual'::text,
            'bank'::text,
            'flutterwave'::text,
            'mobile_money'::text,
            'paypal'::text,
            'crypto'::text,
            'nowpayments'::text,
            'binancepay'::text,
            'pesapal'::text,
            'pawapay'::text,
            'other'::text
          ]
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'creator_payout_methods'
  ) THEN
    ALTER TABLE public.creator_payout_methods
      DROP CONSTRAINT IF EXISTS creator_payout_methods_method_check;

    ALTER TABLE public.creator_payout_methods
      ADD CONSTRAINT creator_payout_methods_method_check
      CHECK (
        method = ANY (
          ARRAY[
            'flutterwave'::text,
            'bank'::text,
            'bank_transfer'::text,
            'mobile_money'::text,
            'crypto'::text,
            'binance_id'::text,
            'paypal'::text
          ]
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS wallet_deposits_reference_idx
  ON public.wallet_deposits (reference)
  WHERE reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS wallet_deposits_binance_trade_idx
  ON public.wallet_deposits ((metadata->>'binance_merchant_trade_no'))
  WHERE metadata ? 'binance_merchant_trade_no';
