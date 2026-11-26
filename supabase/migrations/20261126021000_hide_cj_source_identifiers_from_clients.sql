-- Prevent direct PostgREST reads of supplier/CJ identifiers and internal moderation flags.
-- Public product APIs continue to use the server-side sanitizer, which replaces
-- the raw CJ source with a neutral fulfillment label and strips supplier IDs.

REVOKE SELECT (
  source,
  cj_last_synced_at,
  published_by_admin_override,
  auto_unpublished,
  auto_unpublished_at
) ON TABLE public.products FROM anon, authenticated;

REVOKE SELECT (
  source,
  cj_pid,
  cj_vid
) ON TABLE public.product_variants FROM anon, authenticated;
