-- Ensure product view logging works for anonymous and authenticated visitors.
-- INSERT must be open; SELECT stays restricted to vendors / row owners.

BEGIN;

DROP POLICY IF EXISTS "anyone_can_log_product_view" ON public.product_views;
DROP POLICY IF EXISTS "product_views_insert" ON public.product_views;

CREATE POLICY "product_views_insert"
  ON public.product_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

COMMIT;
