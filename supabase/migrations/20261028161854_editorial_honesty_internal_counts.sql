-- P0-3 follow-up: posts by internal @jimvio.com accounts carried seeded
-- like/comment counts with no matching rows. Recompute from real rows.
-- Previous values are archived in editorial_archive.internal_posts_20261028.

CREATE TABLE IF NOT EXISTS editorial_archive.internal_posts_20261028 AS
SELECT p.id, p.like_count, p.comment_count
FROM public.community_posts p
JOIN public.profiles pr ON pr.id = p.author_id
WHERE pr.email ILIKE '%@jimvio.com'
  AND p.id NOT IN (SELECT id FROM editorial_archive.community_posts_20261028);

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
WHERE p.id IN (SELECT id FROM editorial_archive.internal_posts_20261028);
