-- Inventory adjustment history for Jimvio Commerce OS.
-- Append-only audit of merchant stock changes (manual + order-related when recorded).

CREATE TABLE IF NOT EXISTS public.jimvio_inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.jimvio_stores(id) ON DELETE SET NULL,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  previous_quantity integer NOT NULL,
  delta integer NOT NULL,
  new_quantity integer NOT NULL,
  reason text NOT NULL DEFAULT 'manual'
    CHECK (reason IN (
      'received',
      'damaged',
      'correction',
      'return',
      'manual',
      'other',
      'order',
      'order_cancelled',
      'refund'
    )),
  notes text,
  reference text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jimvio_inventory_adjustments_store
  ON public.jimvio_inventory_adjustments (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jimvio_inventory_adjustments_product
  ON public.jimvio_inventory_adjustments (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jimvio_inventory_adjustments_vendor
  ON public.jimvio_inventory_adjustments (vendor_id, created_at DESC);

ALTER TABLE public.jimvio_inventory_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jimvio_inventory_adjustments_vendor_read
  ON public.jimvio_inventory_adjustments;
CREATE POLICY jimvio_inventory_adjustments_vendor_read
  ON public.jimvio_inventory_adjustments
  FOR SELECT TO authenticated
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- Inserts are service-role / authorized server routes only.
REVOKE INSERT, UPDATE, DELETE ON public.jimvio_inventory_adjustments FROM anon, authenticated;
GRANT SELECT ON public.jimvio_inventory_adjustments TO authenticated;
GRANT ALL ON public.jimvio_inventory_adjustments TO service_role;
