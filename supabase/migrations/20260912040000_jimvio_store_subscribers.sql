-- Additive newsletter capture for Jimvio storefronts.
-- Service-role writes from API; merchants read own rows via ownership.

CREATE TABLE IF NOT EXISTS public.jimvio_store_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.jimvio_stores(id) ON DELETE CASCADE,
  email text NOT NULL,
  source text,
  section_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jimvio_store_subscribers_email_check
    CHECK (char_length(email) >= 3 AND char_length(email) <= 320),
  CONSTRAINT jimvio_store_subscribers_store_email_unique UNIQUE (store_id, email)
);

CREATE INDEX IF NOT EXISTS jimvio_store_subscribers_store_idx
  ON public.jimvio_store_subscribers (store_id, created_at DESC);

ALTER TABLE public.jimvio_store_subscribers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY jimvio_store_subscribers_owner ON public.jimvio_store_subscribers
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.jimvio_stores s
        WHERE s.id = store_id
          AND s.vendor_id IN (
            SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid()
          )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.jimvio_stores s
        WHERE s.id = store_id
          AND s.vendor_id IN (
            SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid()
          )
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
