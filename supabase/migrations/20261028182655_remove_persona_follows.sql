-- Remove follow rows created by retired editorial personas so follower
-- lists show real people only. Rows are copied to editorial_archive first.
CREATE TABLE IF NOT EXISTS editorial_archive.user_follows_retire_20261028 AS
SELECT * FROM public.user_follows
WHERE follower_id IN (SELECT id FROM editorial_archive.persona_ids)
   OR following_id IN (SELECT id FROM editorial_archive.persona_ids);

DELETE FROM public.user_follows f
WHERE f.follower_id IN (SELECT id FROM editorial_archive.persona_ids)
   OR f.following_id IN (SELECT id FROM editorial_archive.persona_ids);
