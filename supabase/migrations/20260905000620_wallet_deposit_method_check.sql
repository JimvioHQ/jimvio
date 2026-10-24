-- Expand wallet_deposits.method CHECK to match platform payment provider IDs.
-- Preserve all historical rows (manual, bank, flutterwave, mobile_money, paypal, crypto, other).
-- Add: nowpayments, binancepay, pesapal, pawapay (checkout MethodIds used by Wallet Deposits UI).
--
-- Also expand creator_payout_methods to support binance_id and bank_transfer aliases.
-- Keep paypal in creator_payout_methods CHECK so historical saved methods remain valid;
-- UI no longer offers PayPal for new withdrawals.

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

-- Helpful lookup for Binance Pay deposit webhooks (merchantTradeNo in metadata / reference)
CREATE INDEX IF NOT EXISTS wallet_deposits_reference_idx
  ON public.wallet_deposits (reference)
  WHERE reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS wallet_deposits_binance_trade_idx
  ON public.wallet_deposits ((metadata->>'binance_merchant_trade_no'))
  WHERE metadata ? 'binance_merchant_trade_no';
