-- Security hardening: restrict blog reads to published posts and close public-schema DDL to users.
-- The separate blog_posts_select_published policy remains the public read path.
DROP POLICY IF EXISTS "blog_posts_select" ON public.blog_posts;

-- Authenticated clients must never create objects in the exposed public API schema.
-- Keep USAGE and existing table/function grants unchanged.
REVOKE CREATE ON SCHEMA public FROM authenticated;

-- Backfill legacy QuantForg webhook metadata: all processed events have matching
-- published community messages, but the old processor left processing_status at received.
UPDATE public.webhook_events
SET processing_status = 'processed',
    processed_at = COALESCE(processed_at, updated_at)
WHERE status = 'processed'
  AND processing_status = 'received'
  AND processed_at IS NULL;

-- Avoid re-evaluating auth.uid() once per row in these membership-aware course policies.
ALTER POLICY "courses_visible_to_members" ON public.community_courses
USING (
  is_published = true
  AND archived_at IS NULL
  AND (
    creator_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_courses.community_id
        AND c.owner_id = (SELECT auth.uid())
    )
    OR access_mode = 'public'
    OR (
      COALESCE(access_mode, 'members') <> 'private'
      AND EXISTS (
        SELECT 1 FROM public.community_memberships cm
        WHERE cm.community_id = community_courses.community_id
          AND cm.user_id = (SELECT auth.uid())
          AND cm.status = 'active'
      )
    )
  )
);

ALTER POLICY "modules_follow_course_access" ON public.course_modules
USING (
  EXISTS (
    SELECT 1
    FROM public.community_courses cc
    WHERE cc.id = course_modules.course_id
      AND cc.is_published = true
      AND cc.archived_at IS NULL
      AND (
        cc.creator_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.communities c
          WHERE c.id = cc.community_id
            AND c.owner_id = (SELECT auth.uid())
        )
        OR cc.access_mode = 'public'
        OR (
          COALESCE(cc.access_mode, 'members') <> 'private'
          AND EXISTS (
            SELECT 1 FROM public.community_memberships cm
            WHERE cm.community_id = cc.community_id
              AND cm.user_id = (SELECT auth.uid())
              AND cm.status = 'active'
          )
        )
      )
  )
);
