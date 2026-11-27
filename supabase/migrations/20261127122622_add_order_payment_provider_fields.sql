-- Restore the order payment-provider metadata expected by checkout and payment flows.
-- Additive only: existing order/payment data is untouched.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS gateway_used text;

COMMENT ON COLUMN public.orders.payment_provider IS
  'Payment provider selected for this order; contains a provider name only, never credentials.';
COMMENT ON COLUMN public.orders.gateway_used IS
  'Legacy-compatible payment gateway identifier for checkout recovery; contains no credentials.';

-- orders already has buyer-scoped RLS and column-level SELECT grants.
-- Grant only these two non-secret fields to authenticated buyers.
GRANT SELECT (payment_provider, gateway_used) ON public.orders TO authenticated;
