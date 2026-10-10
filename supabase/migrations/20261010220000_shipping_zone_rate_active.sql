-- Optional activation flags for merchant shipping zones and rates.
-- Existing rows stay active. Checkout ignores inactive rows.

ALTER TABLE public.jimvio_shipping_zones
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.jimvio_shipping_rates
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
