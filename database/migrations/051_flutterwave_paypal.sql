-- ============================================================
-- MIGRATION 051: FLUTTERWAVE + PAYPAL INTEGRATION
-- ============================================================
-- Adds payment provider tracking columns for Flutterwave
-- and PayPal to the orders table.
-- ============================================================

-- Flutterwave columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS flutterwave_tx_ref        TEXT,
  ADD COLUMN IF NOT EXISTS flutterwave_transaction_id BIGINT;

-- PayPal columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paypal_order_id   TEXT,
  ADD COLUMN IF NOT EXISTS paypal_capture_id TEXT;

-- Indexes for reconciliation lookups
CREATE INDEX IF NOT EXISTS idx_orders_flutterwave_tx_ref
  ON public.orders(flutterwave_tx_ref)
  WHERE flutterwave_tx_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id
  ON public.orders(paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

COMMENT ON COLUMN public.orders.flutterwave_tx_ref IS
  'Flutterwave tx_ref (our UUID reference) for payment reconciliation';
COMMENT ON COLUMN public.orders.flutterwave_transaction_id IS
  'Flutterwave transaction_id returned after payment';
COMMENT ON COLUMN public.orders.paypal_order_id IS
  'PayPal Order ID created by the PayPal REST API';
COMMENT ON COLUMN public.orders.paypal_capture_id IS
  'PayPal Capture ID after payment authorization is captured';
