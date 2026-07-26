-- Sprint 8: Notification platform hardening (additive).
-- Unified delivery metadata, preferences, analytics, grouping, and indexes.

-- ---------------------------------------------------------------------------
-- notifications columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS group_key text,
  ADD COLUMN IF NOT EXISTS event_key text,
  ADD COLUMN IF NOT EXISTS delivery_channel text NOT NULL DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

COMMENT ON COLUMN public.notifications.category IS
  'Fine-grained event category (mention, live_started, order_update, …)';
COMMENT ON COLUMN public.notifications.group_key IS
  'Grouping key for duplicate collapse within a short window';
COMMENT ON COLUMN public.notifications.event_key IS
  'Idempotency key; unique per user when set';

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_event_key
  ON public.notifications (user_id, event_key)
  WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_active
  ON public.notifications (user_id, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_group
  ON public.notifications (user_id, group_key, created_at DESC)
  WHERE group_key IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_category
  ON public.notifications (user_id, category, created_at DESC)
  WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- notification_preferences extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start time,
  ADD COLUMN IF NOT EXISTS quiet_hours_end time,
  ADD COLUMN IF NOT EXISTS quiet_hours_timezone text DEFAULT 'UTC';

COMMENT ON COLUMN public.notification_preferences.categories IS
  'Per-category enable map, e.g. {"mention":true,"affiliate_commission":false}';
COMMENT ON COLUMN public.notification_preferences.sms_enabled IS
  'Future-ready SMS channel flag (no provider wired yet)';

-- ---------------------------------------------------------------------------
-- notification_events (analytics lifecycle)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_name text NOT NULL
    CHECK (event_name IN (
      'sent', 'delivered', 'read', 'click', 'archived', 'deleted',
      'email_queued', 'email_suppressed', 'push_ready', 'grouped', 'rate_limited', 'skipped'
    )),
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_user_created
  ON public.notification_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_name_created
  ON public.notification_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_notification
  ON public.notification_events (notification_id, created_at DESC);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_events_select_own ON public.notification_events;
CREATE POLICY notification_events_select_own ON public.notification_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role inserts analytics; authenticated users never write events directly.
DROP POLICY IF EXISTS notification_events_insert_service ON public.notification_events;
CREATE POLICY notification_events_insert_service ON public.notification_events
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Unread counter RPC (badge performance)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.notifications
  WHERE user_id = p_user_id
    AND coalesce(is_read, false) = false
    AND archived_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.get_unread_notification_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Recent-send rate helper (spam prevention)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_recent_notifications(
  p_user_id uuid,
  p_window_seconds integer DEFAULT 3600
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.notifications
  WHERE user_id = p_user_id
    AND created_at > now() - make_interval(secs => greatest(p_window_seconds, 60));
$$;

REVOKE ALL ON FUNCTION public.count_recent_notifications(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_recent_notifications(uuid, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- Realtime publication (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;
