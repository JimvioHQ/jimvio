-- Community join + announcement posting hardening (additive, backward compatible).
-- Canonical copy: supabase/migrations/20260826160000_community_join_announcement_rls.sql
-- Twin: database/migrations/132_community_join_announcement_rls.sql
--
-- Does NOT:
--   drop tables, delete community rows, mutate auth.users
--   re-enable legacy anon / service_role JWT
--   change wallet / payments / CJ / Shopify
--
-- Adds:
--   1. Self-join INSERT only for public, free, active, non-archived communities as role=member
--   2. Privilege-escalation guard on membership INSERT/UPDATE (service_role bypass)
--   3. Join-request self INSERT (pending only)
--   4. Announcement-only room write restriction for posts + messages (RLS)
--   5. Posts INSERT must target a room that belongs to the same community

-- ── helpers: discussion vs announcement (matches app isGroupDiscussionRoom / announcement) ─

CREATE OR REPLACE FUNCTION public.community_room_is_open_discussion(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rooms r
    WHERE r.id = p_room_id
      AND (
        r.channel_kind = 'discussion'
        OR (
          lower(coalesce(r.room_type, '')) = 'chat'
          AND lower(coalesce(r.slug, '')) IN ('discussion', 'general', 'chat', 'lounge')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.community_room_is_announcement_only(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rooms r
    WHERE r.id = p_room_id
      AND NOT public.community_room_is_open_discussion(p_room_id)
      AND (
        r.channel_kind = 'announcement'
        OR lower(coalesce(r.slug, '')) IN ('announcement', 'announcements')
        OR coalesce(r.permission_config->>'postingMode', '') IN ('admins_only', 'admins_moderators')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.community_room_allows_member_write(
  p_community_id uuid,
  p_room_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = p_community_id
        AND c.is_active IS TRUE
        AND c.archived_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = p_room_id
        AND r.community_id = p_community_id
        AND coalesce(r.is_active, true) = true
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.communities c
        WHERE c.id = p_community_id AND c.owner_id = p_user_id
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.community_memberships m
          WHERE m.community_id = p_community_id
            AND m.user_id = p_user_id
            AND m.status = 'active'
            AND (m.muted_until IS NULL OR m.muted_until < now())
            AND (m.timeout_until IS NULL OR m.timeout_until < now())
            AND (m.suspended_until IS NULL OR m.suspended_until < now())
        )
        AND (
          public.community_room_is_open_discussion(p_room_id)
          OR (
            public.community_room_is_announcement_only(p_room_id)
            AND (
              EXISTS (
                SELECT 1 FROM public.communities c
                WHERE c.id = p_community_id AND c.owner_id = p_user_id
              )
              OR EXISTS (
                SELECT 1 FROM public.community_memberships m
                WHERE m.community_id = p_community_id
                  AND m.user_id = p_user_id
                  AND m.status = 'active'
                  AND lower(m.role) IN ('owner', 'admin', 'moderator')
              )
            )
          )
          OR (
            NOT public.community_room_is_announcement_only(p_room_id)
          )
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.community_room_is_open_discussion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.community_room_is_announcement_only(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.community_room_allows_member_write(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_room_is_open_discussion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_room_is_announcement_only(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_room_allows_member_write(uuid, uuid, uuid) TO authenticated;

-- ── membership self-join: public + free + member role only ───────────────────

DROP POLICY IF EXISTS memberships_insert_self ON public.community_memberships;
DROP POLICY IF EXISTS memberships_insert_self_free_only ON public.community_memberships;

CREATE POLICY memberships_insert_self_public_free_only
  ON public.community_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND lower(coalesce(role, 'member')) = 'member'
    AND coalesce(plan_type, 'free') = 'free'
    AND status = 'active'
    AND community_id IN (
      SELECT c.id
      FROM public.communities c
      WHERE c.is_active IS TRUE
        AND c.archived_at IS NULL
        AND c.is_free IS TRUE
        AND coalesce(c.is_private, false) = false
        AND lower(coalesce(c.visibility_mode, c.visibility, 'public')) = 'public'
    )
  );

-- Paid memberships continue to be written by service_role after payment confirmation.

CREATE OR REPLACE FUNCTION public.guard_membership_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.role(), '');
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id = auth.uid() AND lower(coalesce(NEW.role, 'member')) <> 'member' THEN
      RAISE EXCEPTION 'cannot self-assign a privileged membership role';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = NEW.community_id AND c.owner_id = auth.uid()
    ) THEN
      RETURN NEW;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = NEW.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND lower(m.role) IN ('owner', 'admin')
        AND m.user_id IS DISTINCT FROM NEW.user_id
    ) THEN
      RETURN NEW;
    END IF;

    IF NEW.user_id = auth.uid() THEN
      IF OLD.status = 'banned' THEN
        RAISE EXCEPTION 'banned members cannot update membership';
      END IF;
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'cannot change membership role';
      END IF;
      IF NEW.status IS DISTINCT FROM OLD.status
         AND NOT (OLD.status = 'active' AND NEW.status = 'cancelled') THEN
        RAISE EXCEPTION 'cannot change membership status';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_guard_membership_privilege ON public.community_memberships;
CREATE TRIGGER tr_guard_membership_privilege
  BEFORE INSERT OR UPDATE ON public.community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_membership_privilege_escalation();

REVOKE ALL ON FUNCTION public.guard_membership_privilege_escalation() FROM PUBLIC;

-- ── join requests: requester may insert pending rows for themselves ──────────

DROP POLICY IF EXISTS community_join_requests_insert_self ON public.community_join_requests;
CREATE POLICY community_join_requests_insert_self
  ON public.community_join_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
  );

DROP POLICY IF EXISTS community_join_requests_update_self_cancel ON public.community_join_requests;
CREATE POLICY community_join_requests_update_self_cancel
  ON public.community_join_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('pending', 'cancelled')
    AND reviewed_by IS NULL
  );

-- ── posts: room must belong to community; announcement-only staff write ──────

DROP POLICY IF EXISTS community_posts_insert ON public.community_posts;
CREATE POLICY community_posts_insert ON public.community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND public.community_room_allows_member_write(community_id, room_id, auth.uid())
  );

DROP POLICY IF EXISTS community_messages_insert ON public.community_messages;
CREATE POLICY community_messages_insert ON public.community_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.community_room_allows_member_write(community_id, room_id, auth.uid())
  );
