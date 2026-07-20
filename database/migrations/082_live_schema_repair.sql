-- Live Studio schema repair (production-compatible, idempotent)
-- Audited against live Supabase OpenAPI + PostgREST.
--
-- Existing production objects (DO NOT recreate / drop):
--   live_sessions, live_session_participants, live_session_messages,
--   live_session_signals, live_recordings (see 083)
--
-- New objects (CREATE IF NOT EXISTS only):
--   live_polls, live_poll_votes
--
-- Safe to run twice. Never DROP TABLE. Never DELETE data.

-- ---------------------------------------------------------------------------
-- 1) live_sessions — add Studio chat room link; keep space_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS room_id UUID;

DO $$
BEGIN
  IF to_regclass('public.rooms') IS NULL THEN
    RAISE NOTICE '082: public.rooms missing — skipping live_sessions.room_id FK';
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'live_sessions_room_id_fkey'
      AND conrelid = 'public.live_sessions'::regclass
  ) THEN
    ALTER TABLE public.live_sessions
      ADD CONSTRAINT live_sessions_room_id_fkey
      FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_live_sessions_community_status
  ON public.live_sessions(community_id, status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_host
  ON public.live_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_room
  ON public.live_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_space
  ON public.live_sessions(space_id);

-- ---------------------------------------------------------------------------
-- 2) live_session_participants — Studio stage columns (no live_participants)
-- ---------------------------------------------------------------------------
ALTER TABLE public.live_session_participants
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.live_session_participants
  ADD COLUMN IF NOT EXISTS mic_on BOOLEAN;

ALTER TABLE public.live_session_participants
  ADD COLUMN IF NOT EXISTS cam_on BOOLEAN;

ALTER TABLE public.live_session_participants
  ADD COLUMN IF NOT EXISTS hand_raised BOOLEAN;

ALTER TABLE public.live_session_participants
  ADD COLUMN IF NOT EXISTS sharing BOOLEAN;

ALTER TABLE public.live_session_participants
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.live_session_participants
SET status = COALESCE(status, CASE WHEN left_at IS NULL THEN 'joined' ELSE 'left' END)
WHERE status IS NULL;

UPDATE public.live_session_participants
SET mic_on = COALESCE(mic_on, false),
    cam_on = COALESCE(cam_on, false),
    hand_raised = COALESCE(hand_raised, false),
    sharing = COALESCE(sharing, false),
    updated_at = COALESCE(updated_at, created_at, now())
WHERE mic_on IS NULL
   OR cam_on IS NULL
   OR hand_raised IS NULL
   OR sharing IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.live_session_participants
  ALTER COLUMN status SET DEFAULT 'joined';
ALTER TABLE public.live_session_participants
  ALTER COLUMN mic_on SET DEFAULT false;
ALTER TABLE public.live_session_participants
  ALTER COLUMN cam_on SET DEFAULT false;
ALTER TABLE public.live_session_participants
  ALTER COLUMN hand_raised SET DEFAULT false;
ALTER TABLE public.live_session_participants
  ALTER COLUMN sharing SET DEFAULT false;
ALTER TABLE public.live_session_participants
  ALTER COLUMN updated_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'live_session_participants_status_check'
      AND conrelid = 'public.live_session_participants'::regclass
  ) THEN
    -- Only add CHECK when all non-null values are valid (never fail mid-repair)
    IF NOT EXISTS (
      SELECT 1 FROM public.live_session_participants
      WHERE status IS NOT NULL
        AND status NOT IN ('joined', 'requested', 'invited', 'rejected', 'left', 'removed')
    ) THEN
      ALTER TABLE public.live_session_participants
        ADD CONSTRAINT live_session_participants_status_check
        CHECK (status IN ('joined', 'requested', 'invited', 'rejected', 'left', 'removed'));
    ELSE
      RAISE NOTICE '082: skipped status CHECK — unexpected status values present';
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  -- Skip if any unique constraint OR unique index already covers (session_id, user_id)
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.live_session_participants'::regclass
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname::text ORDER BY u.ord)
        FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord)
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = u.attnum
      ) = ARRAY['session_id', 'user_id']
  ) THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'live_session_participants'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(session_id%'
      AND indexdef ILIKE '%user_id%'
  ) THEN
    NULL;
  ELSE
    ALTER TABLE public.live_session_participants
      ADD CONSTRAINT live_session_participants_session_user_key
      UNIQUE (session_id, user_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
  WHEN unique_violation THEN
    RAISE NOTICE '082: skipped unique(session_id,user_id) — duplicate rows exist';
END $$;

CREATE INDEX IF NOT EXISTS idx_live_session_participants_session
  ON public.live_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_live_session_participants_user
  ON public.live_session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_live_session_participants_role_status
  ON public.live_session_participants(session_id, role, status);

-- ---------------------------------------------------------------------------
-- 3) Polls (new tables only if absent)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_live_polls_session
  ON public.live_polls(session_id);

CREATE TABLE IF NOT EXISTS public.live_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.live_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_poll_votes_poll
  ON public.live_poll_votes(poll_id);

-- ---------------------------------------------------------------------------
-- 4) RLS (ENABLE is idempotent; policies use DROP IF EXISTS + CREATE)
-- ---------------------------------------------------------------------------
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_sessions_select_members ON public.live_sessions;
CREATE POLICY live_sessions_select_members ON public.live_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = live_sessions.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR host_id = auth.uid()
  );

DROP POLICY IF EXISTS live_sessions_insert_staff ON public.live_sessions;
CREATE POLICY live_sessions_insert_staff ON public.live_sessions
  FOR INSERT WITH CHECK (
    host_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.communities c
        WHERE c.id = live_sessions.community_id AND c.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.community_memberships m
        WHERE m.community_id = live_sessions.community_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
          AND m.role IN ('owner', 'admin', 'moderator')
      )
    )
  );

DROP POLICY IF EXISTS live_sessions_update_host ON public.live_sessions;
CREATE POLICY live_sessions_update_host ON public.live_sessions
  FOR UPDATE USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS live_session_participants_select_members ON public.live_session_participants;
CREATE POLICY live_session_participants_select_members ON public.live_session_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions s
      JOIN public.community_memberships m ON m.community_id = s.community_id
      WHERE s.id = live_session_participants.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS live_session_participants_insert_self ON public.live_session_participants;
CREATE POLICY live_session_participants_insert_self ON public.live_session_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS live_session_participants_update_self_or_host ON public.live_session_participants;
CREATE POLICY live_session_participants_update_self_or_host ON public.live_session_participants
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.live_sessions s
      WHERE s.id = live_session_participants.session_id AND s.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS live_polls_select_members ON public.live_polls;
CREATE POLICY live_polls_select_members ON public.live_polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions s
      JOIN public.community_memberships m ON m.community_id = s.community_id
      WHERE s.id = live_polls.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS live_polls_insert_staff ON public.live_polls;
CREATE POLICY live_polls_insert_staff ON public.live_polls
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS live_poll_votes_select ON public.live_poll_votes;
CREATE POLICY live_poll_votes_select ON public.live_poll_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.live_polls p
      JOIN public.live_sessions s ON s.id = p.session_id
      JOIN public.community_memberships m ON m.community_id = s.community_id
      WHERE p.id = live_poll_votes.poll_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS live_poll_votes_insert_self ON public.live_poll_votes;
CREATE POLICY live_poll_votes_insert_self ON public.live_poll_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5) Realtime — add only when not already published
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE '082: supabase_realtime publication missing — skipping';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'live_sessions',
    'live_session_participants',
    'live_polls',
    'live_poll_votes'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      CONTINUE;
    END IF;
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END LOOP;
END $$;
