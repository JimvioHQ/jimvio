-- Backfill legacy provider / payout labels; align defaults with current product (MTN / Jimvio).

UPDATE public.vendors
SET payout_method = 'mtn'
WHERE lower(trim(coalesce(payout_method, ''))) = 'irembopay';

UPDATE public.payouts
SET payout_method = 'mtn'
WHERE lower(trim(coalesce(payout_method, ''))) = 'irembopay';

UPDATE public.transactions
SET provider = 'jimvio'
WHERE lower(trim(coalesce(provider, ''))) = 'irembopay';

ALTER TABLE public.vendors ALTER COLUMN payout_method SET DEFAULT 'mtn';
ALTER TABLE public.payouts ALTER COLUMN payout_method SET DEFAULT 'mtn';
ALTER TABLE public.transactions ALTER COLUMN provider SET DEFAULT 'jimvio';

-- Neutral column names on orders (no third-party brand in schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'irembopay_reference'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN irembopay_reference TO payment_external_reference;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'irembopay_transaction_id'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN irembopay_transaction_id TO payment_external_id;
  END IF;
END $$;
