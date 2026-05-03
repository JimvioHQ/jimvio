-- Step 1: multi-currency support (additive only)
-- products.price and products.currency are unchanged

-- 1. Add price_usd to products (keep existing price column untouched)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 2. Add currency tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS base_amount_usd DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS charged_amount DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS charged_currency TEXT,
  ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(14,6),
  ADD COLUMN IF NOT EXISTS gateway_used TEXT;

-- 3. Exchange rate audit log (new table)
CREATE TABLE IF NOT EXISTS public.exchange_rate_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(14,6) NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  recorded_at TIMESTAMPTZ DEFAULT now()
);
