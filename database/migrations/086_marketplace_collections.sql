-- Marketplace v2: Collections (additive, production-safe)
-- Does NOT touch Community, Live Studio, Wallet, Affiliate, or Payments.

CREATE TABLE IF NOT EXISTS public.marketplace_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  badge TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_collection_products (
  collection_id UUID NOT NULL REFERENCES public.marketplace_collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_collections_featured
  ON public.marketplace_collections(is_featured, sort_order, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_marketplace_collection_products_product
  ON public.marketplace_collection_products(product_id);

ALTER TABLE public.marketplace_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_collection_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketplace_collections_public_select ON public.marketplace_collections;
CREATE POLICY marketplace_collections_public_select ON public.marketplace_collections
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS marketplace_collection_products_public_select ON public.marketplace_collection_products;
CREATE POLICY marketplace_collection_products_public_select ON public.marketplace_collection_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_collections c
      WHERE c.id = marketplace_collection_products.collection_id
        AND c.is_active = true
    )
  );

-- Seed curated starter collections (idempotent by slug)
INSERT INTO public.marketplace_collections (slug, title, description, badge, sort_order, is_featured)
VALUES
  ('creator-essentials', 'Creator Essentials', 'Gear and tools creators actually use.', 'Curated', 1, true),
  ('under-50', 'Under $50', 'High-value picks that stay affordable.', 'Value', 2, true),
  ('verified-sellers', 'From Verified Sellers', 'Products from Jimvio-verified vendors.', 'Verified', 3, true),
  ('trending-now', 'Trending Now', 'What shoppers are viewing and buying.', 'Hot', 4, true)
ON CONFLICT (slug) DO NOTHING;
