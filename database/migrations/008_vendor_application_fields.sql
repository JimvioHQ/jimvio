-- Optional fields for vendor application (Become a Vendor form)
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS product_categories text;
