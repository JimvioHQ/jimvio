-- Speed up internal CJ product resolution without exposing supplier metadata.
CREATE INDEX IF NOT EXISTS idx_products_cj_pid_lookup
  ON public.products USING btree ((source_metadata ->> 'cj_pid'))
  WHERE source = 'cj' AND deleted_at IS NULL;
