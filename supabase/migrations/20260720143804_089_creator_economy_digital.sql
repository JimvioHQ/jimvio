DO $$
BEGIN
  IF to_regclass('public.digital_access') IS NULL THEN
    RAISE NOTICE 'Skipping 20260720143804_089_creator_economy_digital.sql: required base relation public.digital_access is absent on this preview database.';
    RETURN;
  END IF;

  -- Creator Economy v1 — Phase 2: Digital products (additive)
  ALTER TABLE public.digital_access
    ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0),
    ADD COLUMN IF NOT EXISTS download_limit INTEGER CHECK (download_limit IS NULL OR download_limit >= 0),
    ADD COLUMN IF NOT EXISTS license_key TEXT,
    ADD COLUMN IF NOT EXISTS last_download_at TIMESTAMPTZ;
  
  CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_access_license_key
    ON public.digital_access(license_key) WHERE license_key IS NOT NULL;
  
  CREATE TABLE IF NOT EXISTS public.digital_product_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    checksum TEXT,
    changelog TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, version)
  );
  
  CREATE TABLE IF NOT EXISTS public.digital_download_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_id UUID NOT NULL REFERENCES public.digital_access(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  
  CREATE INDEX IF NOT EXISTS idx_digital_versions_product
    ON public.digital_product_versions(product_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_digital_download_events_access
    ON public.digital_download_events(access_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_digital_download_events_product
    ON public.digital_download_events(product_id, created_at DESC);
  
  ALTER TABLE public.digital_product_versions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.digital_download_events ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS digital_versions_select ON public.digital_product_versions;
  CREATE POLICY digital_versions_select ON public.digital_product_versions
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.digital_access da
        WHERE da.product_id = digital_product_versions.product_id
          AND da.user_id = auth.uid()
          AND da.revoked_at IS NULL
          AND (da.expires_at IS NULL OR da.expires_at > now())
      )
      OR EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.vendors v ON v.id = p.vendor_id
        WHERE p.id = digital_product_versions.product_id AND v.user_id = auth.uid()
      )
    );
  
  DROP POLICY IF EXISTS digital_versions_owner_write ON public.digital_product_versions;
  CREATE POLICY digital_versions_owner_write ON public.digital_product_versions
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.vendors v ON v.id = p.vendor_id
        WHERE p.id = digital_product_versions.product_id AND v.user_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.vendors v ON v.id = p.vendor_id
        WHERE p.id = digital_product_versions.product_id AND v.user_id = auth.uid()
      )
    );
  
  DROP POLICY IF EXISTS digital_download_events_select ON public.digital_download_events;
  CREATE POLICY digital_download_events_select ON public.digital_download_events
    FOR SELECT USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.vendors v ON v.id = p.vendor_id
        WHERE p.id = digital_download_events.product_id AND v.user_id = auth.uid()
      )
    );
  
END $$;
