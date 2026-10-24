-- Read-only inventory for digital verification backfill.
-- Do not run the commented updates until a reviewer is ready to take each row.
-- Nothing here marks a listing verified, clean, licensed, or approved.
-- Existing digital_access rows are not modified.
-- New purchases of these rows are refused by the application until a reviewer
-- publishes them through apply_digital_product_decision. Already-granted
-- digital_access rows keep working unless enforcement, takedown, or a failed
-- scan blocks delivery. Do not bulk-revoke them.

-- 1. Digital listings with no verification state.
SELECT id, name, slug, status, is_active, vendor_id, digital_file_url IS NOT NULL AS has_file, published_at, created_at
FROM public.products
WHERE is_digital IS TRUE
  AND digital_verification_state IS NULL
  AND deleted_at IS NULL
ORDER BY status, created_at;

-- 2. Already-public legacy listings. Leave them public until each is reviewed.
--    New activation of a null-state digital row is rejected by the trigger.
SELECT id, slug, status
FROM public.products
WHERE is_digital IS TRUE
  AND digital_verification_state IS NULL
  AND status = 'active';

-- 3. Entitlements that would remain after a listing leaves the public catalog.
SELECT a.id, a.user_id, a.product_id, a.revoked_at, a.expires_at
FROM public.digital_access a
JOIN public.products p ON p.id = a.product_id
WHERE p.is_digital IS TRUE
  AND p.digital_verification_state IS NULL
  AND a.revoked_at IS NULL;

-- 4. Optional, per-product, reversible move into review. Run only for a chosen id.
--    This does not approve the product. It unpublishes that one listing.
--    Customers who already have digital_access keep it unless a scan or enforcement block applies.
-- UPDATE public.products
-- SET digital_verification_state = 'submitted',
--     status = 'pending_review',
--     published_at = NULL,
--     updated_at = now()
-- WHERE id = '00000000-0000-0000-0000-000000000000'
--   AND is_digital IS TRUE
--   AND digital_verification_state IS NULL;
--
-- Reverse that one row only if it had been active and still has no review decision:
-- UPDATE public.products
-- SET digital_verification_state = NULL,
--     status = 'active',
--     updated_at = now()
-- WHERE id = '00000000-0000-0000-0000-000000000000'
--   AND digital_verification_state = 'submitted'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.product_review_decisions d WHERE d.product_id = products.id
--   );
