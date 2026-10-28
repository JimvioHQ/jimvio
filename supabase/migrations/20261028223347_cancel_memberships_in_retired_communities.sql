-- Memberships of real accounts in retired (archived / inactive) editorial
-- communities inflated "communities joined" counts and "My communities"
-- lists. They are cancelled; previous status is archived and restorable.
CREATE TABLE IF NOT EXISTS editorial_archive.memberships_retire_20261029 AS
SELECT m.id, m.status
FROM public.community_memberships m
JOIN public.communities c ON c.id = m.community_id
WHERE m.status = 'active'
  AND (c.archived_at IS NOT NULL OR c.is_active = false);

UPDATE public.community_memberships m
SET status = 'cancelled'
WHERE m.id IN (SELECT id FROM editorial_archive.memberships_retire_20261029)
  AND m.status = 'active';
