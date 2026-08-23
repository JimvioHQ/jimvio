-- Public community read access (SELECT only).
-- Canonical copy: supabase/migrations/20260821120000_public_community_read_rls.sql

DROP POLICY IF EXISTS community_posts_select_public ON public.community_posts;
CREATE POLICY community_posts_select_public ON public.community_posts
  FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(is_published, false) = true
    AND archived_at IS NULL
    AND (audience IS NULL OR audience = 'public')
    AND EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.id = community_posts.community_id
        AND c.is_active IS TRUE
        AND COALESCE(c.is_private, false) = false
    )
  );

DROP POLICY IF EXISTS community_messages_select_public ON public.community_messages;
CREATE POLICY community_messages_select_public ON public.community_messages
  FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(is_deleted, false) = false
    AND EXISTS (
      SELECT 1
      FROM public.communities c
      JOIN public.rooms r
        ON r.id = community_messages.room_id
       AND r.community_id = c.id
      JOIN public.spaces s
        ON s.id = r.space_id
      WHERE c.is_active IS TRUE
        AND COALESCE(c.is_private, false) = false
        AND COALESCE(r.is_active, true) = true
        AND COALESCE(r.is_locked, false) = false
        AND COALESCE(r.access_type, 'inherit') NOT IN ('private', 'paid', 'premium')
        AND COALESCE(s.access_type, 'free') NOT IN ('private', 'paid', 'premium')
        AND COALESCE(s.is_active, true) = true
    )
  );
