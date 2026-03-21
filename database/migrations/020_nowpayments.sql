-- NowPayments crypto payment integration
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS nowpayments_payment_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_orders_nowpayments_payment_id
  ON public.orders(nowpayments_payment_id);

COMMENT ON COLUMN public.orders.nowpayments_payment_id IS 'NowPayments payment ID for crypto payments';
