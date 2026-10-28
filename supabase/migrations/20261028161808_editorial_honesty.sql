-- P0-3: Editorial honesty for Communities.
--
-- Jimvio-managed editorial programming was published under ~860 internal
-- persona profiles (editorial+*@jimvio.com) with seeded memberships,
-- comments and like counts. Members saw these as real people and real
-- engagement. This migration keeps the editorial content but:
--   1. Publishes every editorial post as its community (not a persona).
--   2. Unpublishes persona comments (seeded conversations).
--   3. Recomputes post like/comment counts from real member rows only.
--   4. Recomputes community member_count from real memberships only.
--   5. Removes the hidden targetMemberCount inflation setting.
--
-- Non-destructive: no rows are deleted. Every changed value is copied to
-- the private schema editorial_archive first. Reverse by restoring from it.

CREATE SCHEMA IF NOT EXISTS editorial_archive;
REVOKE ALL ON SCHEMA editorial_archive FROM PUBLIC;
REVOKE ALL ON SCHEMA editorial_archive FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS editorial_archive.persona_ids AS
SELECT id FROM public.profiles WHERE email ILIKE 'editorial+%@jimvio.com';
CREATE UNIQUE INDEX IF NOT EXISTS persona_ids_id_idx ON editorial_archive.persona_ids (id);

CREATE TABLE IF NOT EXISTS editorial_archive.community_posts_20261028 AS
SELECT id, like_count, comment_count, attachments
FROM public.community_posts
WHERE author_id IN (SELECT id FROM editorial_archive.persona_ids)
   OR attachments::text ~ '"origin": ?"editorial"';

CREATE TABLE IF NOT EXISTS editorial_archive.comments_20261028 AS
SELECT id, is_published
FROM public.community_post_comments
WHERE author_id IN (SELECT id FROM editorial_archive.persona_ids);

CREATE TABLE IF NOT EXISTS editorial_archive.communities_20261028 AS
SELECT id, member_count, settings FROM public.communities;

-- 1. Editorial posts are published as their community.
UPDATE public.community_posts p
SET attachments = jsonb_set(
      COALESCE(p.attachments, '{}'::jsonb),
      '{jimvio}',
      COALESCE(p.attachments->'jimvio', '{}'::jsonb) || '{"published_as":"community"}'::jsonb,
      true)
WHERE p.id IN (SELECT id FROM editorial_archive.community_posts_20261028)
  AND p.community_id IS NOT NULL
  AND jsonb_typeof(COALESCE(p.attachments, '{}'::jsonb)) = 'object';

-- 2. Persona comments are unpublished (kept for audit).
UPDATE public.community_post_comments c
SET is_published = false
WHERE c.id IN (SELECT id FROM editorial_archive.comments_20261028)
  AND c.is_published IS DISTINCT FROM false;

-- 3. Real engagement counts on every post that had persona engagement.
WITH affected AS (
  SELECT DISTINCT post_id AS id FROM public.community_post_likes
  WHERE user_id IN (SELECT id FROM editorial_archive.persona_ids)
  UNION
  SELECT DISTINCT post_id FROM public.community_post_comments
  WHERE author_id IN (SELECT id FROM editorial_archive.persona_ids)
  UNION
  SELECT id FROM editorial_archive.community_posts_20261028
)
INSERT INTO editorial_archive.community_posts_20261028 (id, like_count, comment_count, attachments)
SELECT p.id, p.like_count, p.comment_count, p.attachments
FROM public.community_posts p
JOIN affected a ON a.id = p.id
WHERE NOT EXISTS (SELECT 1 FROM editorial_archive.community_posts_20261028 x WHERE x.id = p.id);

UPDATE public.community_posts p
SET like_count = (
      SELECT count(*) FROM public.community_post_likes l
      WHERE l.post_id = p.id
        AND l.user_id NOT IN (SELECT id FROM editorial_archive.persona_ids)),
    comment_count = (
      SELECT count(*) FROM public.community_post_comments c
      WHERE c.post_id = p.id
        AND c.is_published IS NOT FALSE
        AND c.deleted_at IS NULL
        AND c.author_id NOT IN (SELECT id FROM editorial_archive.persona_ids))
WHERE p.id IN (SELECT id FROM editorial_archive.community_posts_20261028);

-- 4 + 5. Real member counts; drop the inflation setting.
UPDATE public.communities c
SET member_count = (
      SELECT count(*) FROM public.community_memberships m
      WHERE m.community_id = c.id
        AND COALESCE(m.status, 'active') = 'active'
        AND m.user_id NOT IN (SELECT id FROM editorial_archive.persona_ids)),
    settings = CASE
      WHEN jsonb_typeof(c.settings->'jimvio') = 'object'
        THEN jsonb_set(c.settings, '{jimvio}', (c.settings->'jimvio') - 'targetMemberCount')
      ELSE c.settings
    END;
