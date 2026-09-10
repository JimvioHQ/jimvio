-- Multistream live destinations: encrypted credentials, per-session fan-out, events.
-- Extends Jimvio Live / LiveKit; does not replace live_sessions or recording egress.

CREATE TABLE IF NOT EXISTS public.live_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  platform text NOT NULL
    CHECK (platform IN (
      'jimvio',
      'youtube',
      'twitch',
      'facebook',
      'instagram',
      'tiktok',
      'custom_rtmp'
    )),
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected'
    CHECK (status IN (
      'supported',
      'ready',
      'requires_approval',
      'unsupported',
      'disconnected',
      'error',
      'reconnecting',
      'connected'
    )),
  provider_account_id text,
  provider_channel_id text,
  provider_page_id text,
  avatar_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  encrypted_credentials text,
  last_connected_at timestamptz,
  last_used_at timestamptz,
  last_error text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_destinations_display_name_len CHECK (char_length(display_name) BETWEEN 1 AND 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS live_destinations_user_platform_account_uidx
  ON public.live_destinations (user_id, platform, COALESCE(provider_account_id, id::text))
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS live_destinations_user_id_idx
  ON public.live_destinations (user_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.live_destination_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id uuid NOT NULL REFERENCES public.live_sessions (id) ON DELETE CASCADE,
  destination_id uuid NOT NULL REFERENCES public.live_destinations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'preparing',
      'ready',
      'connecting',
      'live',
      'reconnecting',
      'failed',
      'stopped',
      'skipped'
    )),
  provider_broadcast_id text,
  provider_stream_id text,
  egress_id text,
  ingest_url_fingerprint text,
  health jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  last_health_at timestamptz,
  last_error text,
  reconnect_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_destination_sessions_unique_active
    UNIQUE (live_session_id, destination_id)
);

CREATE INDEX IF NOT EXISTS live_destination_sessions_live_session_idx
  ON public.live_destination_sessions (live_session_id);

CREATE INDEX IF NOT EXISTS live_destination_sessions_egress_idx
  ON public.live_destination_sessions (egress_id)
  WHERE egress_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.live_destination_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_session_id uuid NOT NULL REFERENCES public.live_destination_sessions (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS live_destination_events_provider_event_uidx
  ON public.live_destination_events (destination_session_id, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS live_destination_events_session_idx
  ON public.live_destination_events (destination_session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.live_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  platform text NOT NULL,
  state_hash text NOT NULL UNIQUE,
  return_path text NOT NULL DEFAULT '/communities/live',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_oauth_states_expires_idx
  ON public.live_oauth_states (expires_at);

ALTER TABLE public.live_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_destination_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_destination_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_destinations_select_own ON public.live_destinations;
CREATE POLICY live_destinations_select_own
  ON public.live_destinations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND revoked_at IS NULL);

DROP POLICY IF EXISTS live_destinations_insert_own ON public.live_destinations;
CREATE POLICY live_destinations_insert_own
  ON public.live_destinations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS live_destinations_update_own ON public.live_destinations;
CREATE POLICY live_destinations_update_own
  ON public.live_destinations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS live_destinations_delete_own ON public.live_destinations;
CREATE POLICY live_destinations_delete_own
  ON public.live_destinations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS live_destination_sessions_select_own ON public.live_destination_sessions;
CREATE POLICY live_destination_sessions_select_own
  ON public.live_destination_sessions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.live_sessions s
      WHERE s.id = live_destination_sessions.live_session_id
        AND s.host_id = auth.uid()
    )
  );

-- Mutations go through service role (destination manager). Authenticated users read only.
DROP POLICY IF EXISTS live_destination_events_select_own ON public.live_destination_events;
CREATE POLICY live_destination_events_select_own
  ON public.live_destination_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_destination_sessions ds
      WHERE ds.id = live_destination_events.destination_session_id
        AND ds.user_id = auth.uid()
    )
  );

-- OAuth states: no client access (service_role only)
REVOKE ALL ON TABLE public.live_oauth_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.live_oauth_states TO service_role;

REVOKE ALL ON TABLE public.live_destinations FROM PUBLIC;
GRANT SELECT ON TABLE public.live_destinations TO authenticated;
GRANT ALL ON TABLE public.live_destinations TO service_role;

-- Writes go through service_role API (encryption + ownership checks). Keep RLS SELECT for owners.
DROP POLICY IF EXISTS live_destinations_insert_own ON public.live_destinations;
DROP POLICY IF EXISTS live_destinations_update_own ON public.live_destinations;
DROP POLICY IF EXISTS live_destinations_delete_own ON public.live_destinations;

REVOKE ALL ON TABLE public.live_destination_sessions FROM PUBLIC;
GRANT SELECT ON TABLE public.live_destination_sessions TO authenticated;
GRANT ALL ON TABLE public.live_destination_sessions TO service_role;

REVOKE ALL ON TABLE public.live_destination_events FROM PUBLIC;
GRANT SELECT ON TABLE public.live_destination_events TO authenticated;
GRANT ALL ON TABLE public.live_destination_events TO service_role;

-- Never expose encrypted_credentials via PostgREST to anon; column still selected by owner
-- but API layer must strip it. Defense: revoke direct column not possible easily; app strips.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_destination_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_destination_sessions;
  END IF;
END $$;

COMMENT ON TABLE public.live_destinations IS 'User-connected multistream destinations (OAuth / custom RTMP). Credentials encrypted at rest.';
COMMENT ON COLUMN public.live_destinations.encrypted_credentials IS 'AES-GCM ciphertext of OAuth tokens / stream keys. Never return to browser.';
COMMENT ON TABLE public.live_destination_sessions IS 'Per Jimvio Live fan-out status for each destination.';
COMMENT ON TABLE public.live_destination_events IS 'Audit / health events for destination sessions.';
