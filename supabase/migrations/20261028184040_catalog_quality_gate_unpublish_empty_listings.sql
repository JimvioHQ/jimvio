-- M-1: catalog quality gate. Supplier listings with no description are
-- moved to draft until they are completed. Previous state is archived.
CREATE TABLE IF NOT EXISTS catalog_archive.quality_gate_20261028 AS
SELECT id, status, auto_unpublished, auto_unpublish_reason, auto_unpublished_at
FROM public.products
WHERE status = 'active'
  AND length(coalesce(btrim(description), '')) < 40
  AND coalesce(published_by_admin_override, false) = false;

UPDATE public.products p
SET status = 'draft',
    auto_unpublished = true,
    auto_unpublish_reason = 'Quality gate: listing has no product description',
    auto_unpublished_at = now()
WHERE p.id IN (SELECT id FROM catalog_archive.quality_gate_20261028)
  AND p.status = 'active';
