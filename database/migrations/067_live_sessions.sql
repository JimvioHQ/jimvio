-- Live Sessions for Community Hubs
-- Supports multi-party WebRTC live streaming with space-based access control

CREATE TABLE IF NOT EXISTS public.live_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id            UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    community_id        UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    host_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    description         TEXT,
    status              TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'live' | 'ended' | 'cancelled'
    privacy             TEXT NOT NULL DEFAULT 'public',    -- 'public' | 'private' | 'members_only'
    scheduled_at        TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    ended_at            TIMESTAMPTZ,
    max_viewers         INT NOT NULL DEFAULT 100,
    viewer_count        INT NOT NULL DEFAULT 0,
    peak_viewers        INT NOT NULL DEFAULT 0,
    stream_key          TEXT,
    playback_url        TEXT,
    recording_url       TEXT,
    recording_started_at TIMESTAMPTZ,
    recording_ended_at   TIMESTAMPTZ,
    settings            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_space ON public.live_sessions(space_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_community ON public.live_sessions(community_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_host ON public.live_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON public.live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled ON public.live_sessions(scheduled_at);

-- Participants in a live session
CREATE TABLE IF NOT EXISTS public.live_session_participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'viewer', -- 'viewer' | 'cohost' | 'moderator'
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at         TIMESTAMPTZ,
    connection_id   TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_live_participants_session_user ON public.live_session_participants(session_id, user_id);
CREATE INDEX IF NOT EXISTS idx_live_participants_session ON public.live_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_live_participants_user ON public.live_session_participants(user_id);

-- Chat messages during live session
CREATE TABLE IF NOT EXISTS public.live_session_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body          TEXT NOT NULL,
    message_type  TEXT NOT NULL DEFAULT 'chat', -- 'chat' | 'system' | 'reaction' | 'poll'
    metadata      JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_messages_session ON public.live_session_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_live_messages_user ON public.live_session_messages(user_id);

-- WebRTC signaling messages for multi-party connections
CREATE TABLE IF NOT EXISTS public.live_session_signals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    from_user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    signal_type   TEXT NOT NULL, -- 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'renegotiate'
    payload       JSONB NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_signals_session ON public.live_session_signals(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_live_signals_from ON public.live_session_signals(from_user_id);
CREATE INDEX IF NOT EXISTS idx_live_signals_to ON public.live_session_signals(to_user_id);

-- Enable RLS
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_sessions
DROP POLICY IF EXISTS "live_sessions_visible_to_space_members" ON public.live_sessions;
CREATE POLICY "live_sessions_visible_to_space_members"
    ON public.live_sessions FOR SELECT
    USING (
        privacy = 'public'
        OR (
            privacy IN ('private', 'members_only')
            AND community_id IN (
                SELECT community_id FROM public.community_memberships
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
        OR host_id = auth.uid()
    );

DROP POLICY IF EXISTS "hosts_manage_own_sessions" ON public.live_sessions;
CREATE POLICY "hosts_manage_own_sessions"
    ON public.live_sessions FOR ALL
    USING (host_id = auth.uid())
    WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "community_admins_manage_sessions" ON public.live_sessions;
CREATE POLICY "community_admins_manage_sessions"
    ON public.live_sessions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.communities c
            JOIN public.community_memberships cm ON cm.community_id = c.id
            WHERE c.id = live_sessions.community_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.communities c
            JOIN public.community_memberships cm ON cm.community_id = c.id
            WHERE c.id = live_sessions.community_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
    );

-- RLS Policies for live_session_participants
DROP POLICY IF EXISTS "participants_visible_to_session_members" ON public.live_session_participants;
CREATE POLICY "participants_visible_to_session_members"
    ON public.live_session_participants FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_session_participants.session_id
            AND (
                ls.host_id = auth.uid()
                OR ls.privacy = 'public'
                OR (ls.privacy IN ('private', 'members_only') AND ls.community_id IN (
                    SELECT community_id FROM public.community_memberships
                    WHERE user_id = auth.uid() AND status = 'active'
                ))
            )
        )
    );

DROP POLICY IF EXISTS "users_manage_own_participation" ON public.live_session_participants;
CREATE POLICY "users_manage_own_participation"
    ON public.live_session_participants FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "hosts_manage_participants" ON public.live_session_participants;
CREATE POLICY "hosts_manage_participants"
    ON public.live_session_participants FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_session_participants.session_id
            AND ls.host_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_session_participants.session_id
            AND ls.host_id = auth.uid()
        )
    );

-- RLS Policies for live_session_messages
DROP POLICY IF EXISTS "messages_visible_to_session_members" ON public.live_session_messages;
CREATE POLICY "messages_visible_to_session_members"
    ON public.live_session_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_session_messages.session_id
            AND (
                ls.privacy = 'public'
                OR ls.host_id = auth.uid()
                OR (ls.privacy IN ('private', 'members_only') AND ls.community_id IN (
                    SELECT community_id FROM public.community_memberships
                    WHERE user_id = auth.uid() AND status = 'active'
                ))
            )
        )
    );

DROP POLICY IF EXISTS "participants_send_messages" ON public.live_session_messages;
CREATE POLICY "participants_send_messages"
    ON public.live_session_messages FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.live_session_participants p
            WHERE p.session_id = live_session_messages.session_id
            AND p.user_id = auth.uid()
            AND p.left_at IS NULL
        )
    );

-- RLS Policies for live_session_signals
DROP POLICY IF EXISTS "signals_visible_to_participants" ON public.live_session_signals;
CREATE POLICY "signals_visible_to_participants"
    ON public.live_session_signals FOR SELECT
    USING (
        from_user_id = auth.uid()
        OR to_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.live_session_participants p
            WHERE p.session_id = live_session_signals.session_id
            AND p.user_id = auth.uid()
            AND p.left_at IS NULL
        )
    );

DROP POLICY IF EXISTS "participants_send_signals" ON public.live_session_signals;
CREATE POLICY "participants_send_signals"
    ON public.live_session_signals FOR INSERT
    WITH CHECK (
        from_user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.live_session_participants p
            WHERE p.session_id = live_session_signals.session_id
            AND p.user_id = auth.uid()
            AND p.left_at IS NULL
        )
    );

-- Updated at trigger
DROP TRIGGER IF EXISTS update_live_sessions_updated_at ON public.live_sessions;
CREATE TRIGGER update_live_sessions_updated_at
    BEFORE UPDATE ON public.live_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC functions for atomic viewer count updates
CREATE OR REPLACE FUNCTION public.increment_viewer_count(session_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE public.live_sessions
  SET viewer_count = viewer_count + 1,
      peak_viewers = GREATEST(peak_viewers, viewer_count + 1)
  WHERE id = session_id
  RETURNING viewer_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END $$;

CREATE OR REPLACE FUNCTION public.decrement_viewer_count(session_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE public.live_sessions
  SET viewer_count = GREATEST(0, viewer_count - 1)
  WHERE id = session_id
  RETURNING viewer_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END $$;