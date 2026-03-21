-- Additive: Pesapal + generic payment provider fields on orders (migration 025).
-- Does not alter existing columns.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pesapal_tracking_id text,
  ADD COLUMN IF NOT EXISTS pesapal_merchant_ref text,
  ADD COLUMN IF NOT EXISTS payment_provider text;

CREATE INDEX IF NOT EXISTS idx_orders_pesapal
  ON public.orders(pesapal_tracking_id)
  WHERE pesapal_tracking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_nowpayments
  ON public.orders(nowpayments_payment_id)
  WHERE nowpayments_payment_id IS NOT NULL;
