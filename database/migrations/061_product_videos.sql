-- Product videos (CJ and other sources)
CREATE TABLE IF NOT EXISTS public.product_videos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  video_url   TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_videos_product_id
  ON public.product_videos(product_id);

CREATE INDEX IF NOT EXISTS idx_product_videos_sort
  ON public.product_videos(product_id, sort_order);

ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Product videos are publicly viewable" ON public.product_videos;
DROP POLICY IF EXISTS "Vendors can manage own product videos" ON public.product_videos;

CREATE POLICY "Product videos are publicly viewable"
  ON public.product_videos FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM public.products
      WHERE status = 'active' AND is_active = true
    )
  );

CREATE POLICY "Vendors can manage own product videos"
  ON public.product_videos FOR ALL
  USING (
    product_id IN (
      SELECT id FROM public.products
      WHERE vendor_id IN (
        SELECT id FROM public.vendors WHERE user_id = auth.uid()
      )
    )
  );
