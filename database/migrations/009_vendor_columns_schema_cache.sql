-- Ensure vendor application columns exist (fixes "column not in schema cache" if 008 was run before these were added)
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS product_categories text;
