-- Allow everyone to read product_categories (reference data for vendor form, marketplace, etc.)
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product categories are readable by everyone"
  ON public.product_categories
  FOR SELECT
  USING (true);
