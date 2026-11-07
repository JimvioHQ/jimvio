-- Identity 2.2: verified social accounts are automatically public.
-- Additive data correction only — no schema drop. Preserves unverified rows.

UPDATE public.jip_social_accounts
SET is_public = true,
    updated_at = now()
WHERE is_verified = true
  AND coalesce(is_public, false) = false;

UPDATE public.jip_social_accounts
SET is_public = false,
    updated_at = now()
WHERE coalesce(is_verified, false) = false
  AND platform IS DISTINCT FROM 'website'
  AND coalesce(is_public, false) = true
  AND coalesce(verify_status, '') NOT IN ('verified');
