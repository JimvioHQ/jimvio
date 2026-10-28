-- P0-3b: Internal editorial personas present as what they are.
-- ~860 accounts (editorial+*@jimvio.com) had human names, stock photos and
-- person-like usernames. They now show as "Jimvio Editorial" with the
-- Jimvio mark. Their plain member rows are cancelled so member lists only
-- show real people; owner rows stay active so community ownership works.
-- Non-destructive: previous values archived in editorial_archive.

CREATE TABLE IF NOT EXISTS editorial_archive.persona_profiles_20261028 AS
SELECT id, username, full_name, avatar_url, bio
FROM public.profiles
WHERE id IN (SELECT id FROM editorial_archive.persona_ids);

CREATE TABLE IF NOT EXISTS editorial_archive.persona_memberships_20261028 AS
SELECT id, status, cancelled_at
FROM public.community_memberships
WHERE user_id IN (SELECT id FROM editorial_archive.persona_ids)
  AND lower(coalesce(role, 'member')) = 'member';

UPDATE public.profiles p
SET full_name = 'Jimvio Editorial',
    username = 'jimvio_editorial_' || left(replace(p.id::text, '-', ''), 12),
    avatar_url = 'https://www.jimvio.com/jimvio-logo-mark.png',
    bio = 'Official Jimvio editorial account. Posts from this account are written by the Jimvio team.'
WHERE p.id IN (SELECT id FROM editorial_archive.persona_ids);

UPDATE public.community_memberships m
SET status = 'cancelled',
    cancelled_at = COALESCE(m.cancelled_at, now())
WHERE m.id IN (SELECT id FROM editorial_archive.persona_memberships_20261028)
  AND m.status = 'active';
