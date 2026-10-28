-- P0-3 follow-up: seeded space member counts and persona followers.
-- spaces.member_count may never exceed the community's real member count
-- (no separate space roster exists). follower_count excludes personas.
-- Previous values archived in editorial_archive.

CREATE TABLE IF NOT EXISTS editorial_archive.spaces_20261028 AS
SELECT id, member_count FROM public.spaces;

CREATE TABLE IF NOT EXISTS editorial_archive.profile_follow_counts_20261028 AS
SELECT id, follower_count, following_count FROM public.profiles
WHERE follower_count > 0 OR following_count > 0;

UPDATE public.spaces s
SET member_count = LEAST(COALESCE(s.member_count, 0), COALESCE(c.member_count, 0))
FROM public.communities c
WHERE c.id = s.community_id
  AND COALESCE(s.member_count, 0) > COALESCE(c.member_count, 0);

UPDATE public.profiles p
SET follower_count = (
      SELECT count(*) FROM public.user_follows f
      WHERE f.following_id = p.id
        AND f.follower_id NOT IN (SELECT id FROM editorial_archive.persona_ids)),
    following_count = (
      SELECT count(*) FROM public.user_follows f
      WHERE f.follower_id = p.id
        AND f.following_id NOT IN (SELECT id FROM editorial_archive.persona_ids))
WHERE p.id IN (SELECT id FROM editorial_archive.profile_follow_counts_20261028)
  AND p.id NOT IN (SELECT id FROM editorial_archive.persona_ids);
