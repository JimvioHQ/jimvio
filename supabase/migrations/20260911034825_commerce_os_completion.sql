-- Commerce OS completion: cart isolation, published theme, domains lookup, returns, inventory holds
-- Additive only. Does not destroy Marketplace carts or existing orders.

ALTER TABLE public.jimvio_stores
  ADD COLUMN IF NOT EXISTS published_theme jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.jimvio_stores
SET published_theme = COALESCE(theme_draft, '{}'::jsonb)
WHERE status = 'published'
  AND (published_theme IS NULL OR published_theme = '{}'::jsonb)
  AND theme_draft IS NOT NULL
  AND theme_draft <> '{}'::jsonb;

ALTER TABLE public.carts
  ADD COLUMN IF NOT EXISTS jimvio_store_id uuid REFERENCES public.jimvio_stores(id) ON DELETE SET NULL;

ALTER TABLE public.carts DROP CONSTRAINT IF EXISTS carts_user_id_key;
DROP INDEX IF EXISTS carts_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS carts_user_marketplace_uidx
  ON public.carts (user_id)
  WHERE jimvio_store_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS carts_user_store_uidx
  ON public.carts (user_id, jimvio_store_id)
  WHERE jimvio_store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_carts_jimvio_store
  ON public.carts (jimvio_store_id)
  WHERE jimvio_store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jimvio_store_domains_hostname_lower
  ON public.jimvio_store_domains (lower(hostname));

CREATE TABLE IF NOT EXISTS public.jimvio_store_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'rejected', 'received', 'refunded', 'closed')),
  reason text,
  notes text,
  refund_amount numeric(12,2),
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jimvio_store_returns_store
  ON public.jimvio_store_returns (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jimvio_store_returns_order
  ON public.jimvio_store_returns (order_id);

CREATE TABLE IF NOT EXISTS public.jimvio_store_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.jimvio_store_returns(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  product_id uuid,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jimvio_inventory_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'committed', 'released', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jimvio_inventory_holds_product
  ON public.jimvio_inventory_holds (product_id, status)
  WHERE status = 'reserved';

ALTER TABLE public.jimvio_store_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_store_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jimvio_inventory_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jimvio_store_returns_owner ON public.jimvio_store_returns;
CREATE POLICY jimvio_store_returns_owner ON public.jimvio_store_returns
  FOR ALL TO authenticated
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  )
  WITH CHECK (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS jimvio_store_return_items_owner ON public.jimvio_store_return_items;
CREATE POLICY jimvio_store_return_items_owner ON public.jimvio_store_return_items
  FOR ALL TO authenticated
  USING (
    return_id IN (
      SELECT r.id FROM public.jimvio_store_returns r
      WHERE r.vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    return_id IN (
      SELECT r.id FROM public.jimvio_store_returns r
      WHERE r.vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS jimvio_inventory_holds_vendor_read ON public.jimvio_inventory_holds;
CREATE POLICY jimvio_inventory_holds_vendor_read ON public.jimvio_inventory_holds
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM public.jimvio_stores s
      WHERE s.vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    )
  );

ALTER TABLE public.jimvio_abandoned_carts
  ADD COLUMN IF NOT EXISTS cart_id uuid REFERENCES public.carts(id) ON DELETE SET NULL;