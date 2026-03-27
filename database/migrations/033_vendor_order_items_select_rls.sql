-- Vendors could already SELECT orders ("Vendors can view their orders") but order_items only allowed
-- buyer-side reads ("Users can view own order items"). Vendor "Orders Received" queries order_items
-- by vendor_id — RLS returned zero rows. Add vendor read for their line items.
--
-- Run ONLY this file in Supabase SQL Editor. Do NOT re-run 001_initial_schema policy
-- `Users can view own order items` — it already exists; duplicating it causes ERROR 42710.

DROP POLICY IF EXISTS "Vendors can view order items for their products" ON public.order_items;

CREATE POLICY "Vendors can view order items for their products"
  ON public.order_items
  FOR SELECT
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

COMMENT ON POLICY "Vendors can view order items for their products" ON public.order_items IS
  'Lets sellers see line items on orders that include their products (dashboard vendor orders).';
