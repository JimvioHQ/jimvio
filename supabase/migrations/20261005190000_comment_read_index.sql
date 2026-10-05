-- Speed published comment reads by post (hub feed + post detail).
-- Authz is enforced in the API; this index supports the service-role list path.

CREATE INDEX IF NOT EXISTS idx_community_post_comments_post_published_created
  ON public.community_post_comments (post_id, created_at DESC)
  WHERE is_published IS TRUE;

-- Destinations / "my memberships" lookups.
CREATE INDEX IF NOT EXISTS idx_community_memberships_user_status_created
  ON public.community_memberships (user_id, status, created_at DESC);
