-- Extended Live Streaming Tables for Community Hubs
-- Supports RTMP ingest, HLS playback, recordings, clips, scheduling, categories, follows, moderation, analytics

-- Stream Keys for RTMP/SRT Ingestion
CREATE TABLE IF NOT EXISTS public.live_stream_keys (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    stream_key          TEXT NOT NULL UNIQUE,
    rtmp_url            TEXT,
    srt_url             TEXT,
    whip_url            TEXT,
    whep_url            TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_stream_keys_session ON public.live_stream_keys(session_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_keys_key ON public.live_stream_keys(stream_key);

-- Recordings (VOD)
CREATE TABLE IF NOT EXISTS public.live_recordings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    space_id            UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    community_id        UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    host_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    description         TEXT,
    status              TEXT NOT NULL DEFAULT 'processing', -- 'processing' | 'ready' | 'failed' | 'deleted'
    hls_url             TEXT,
    mp4_url             TEXT,
    thumbnail_url       TEXT,
    duration_seconds    INT NOT NULL DEFAULT 0,
    file_size_bytes     BIGINT NOT NULL DEFAULT 0,
    peak_viewers        INT NOT NULL DEFAULT 0,
    avg_viewers         INT NOT NULL DEFAULT 0,
    started_at          TIMESTAMPTZ NOT NULL,
    ended_at            TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    error_message       TEXT,
    settings            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_recordings_session ON public.live_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_live_recordings_space ON public.live_recordings(space_id);
CREATE INDEX IF NOT EXISTS idx_live_recordings_community ON public.live_recordings(community_id);
CREATE INDEX IF NOT EXISTS idx_live_recordings_host ON public.live_recordings(host_id);
CREATE INDEX IF NOT EXISTS idx_live_recordings_status ON public.live_recordings(status);
CREATE INDEX IF NOT EXISTS idx_live_recordings_created ON public.live_recordings(created_at DESC);

-- Clips/Highlights
CREATE TABLE IF NOT EXISTS public.live_clips (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    recording_id        UUID REFERENCES public.live_recordings(id) ON DELETE SET NULL,
    creator_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    description         TEXT,
    start_time_seconds  INT NOT NULL,
    end_time_seconds    INT NOT NULL,
    duration_seconds    INT NOT NULL,
    hls_url             TEXT,
    mp4_url             TEXT,
    thumbnail_url       TEXT,
    view_count          INT NOT NULL DEFAULT 0,
    like_count          INT NOT NULL DEFAULT 0,
    is_published        BOOLEAN NOT NULL DEFAULT true,
    tags                TEXT[] DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_clips_session ON public.live_clips(session_id);
CREATE INDEX IF NOT EXISTS idx_live_clips_recording ON public.live_clips(recording_id);
CREATE INDEX IF NOT EXISTS idx_live_clips_creator ON public.live_clips(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_clips_published ON public.live_clips(is_published, created_at DESC);

-- Scheduled Sessions
CREATE TABLE IF NOT EXISTS public.live_schedules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id            UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    community_id        UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    host_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    description         TEXT,
    scheduled_at        TIMESTAMPTZ NOT NULL,
    duration_minutes    INT NOT NULL DEFAULT 60,
    privacy             TEXT NOT NULL DEFAULT 'public', -- 'public' | 'private' | 'members_only'
    max_viewers         INT NOT NULL DEFAULT 100,
    recurrence          TEXT, -- 'none' | 'daily' | 'weekly' | 'monthly' | cron expression
    recurrence_end      TIMESTAMPTZ,
    reminder_sent       BOOLEAN NOT NULL DEFAULT false,
    reminder_sent_at    TIMESTAMPTZ,
    status              TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'live' | 'ended' | 'cancelled'
    session_id          UUID REFERENCES public.live_sessions(id) ON DELETE SET NULL,
    settings            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_schedules_space ON public.live_schedules(space_id);
CREATE INDEX IF NOT EXISTS idx_live_schedules_community ON public.live_schedules(community_id);
CREATE INDEX IF NOT EXISTS idx_live_schedules_host ON public.live_schedules(host_id);
CREATE INDEX IF NOT EXISTS idx_live_schedules_scheduled ON public.live_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_schedules_status ON public.live_schedules(status);
CREATE INDEX IF NOT EXISTS idx_live_schedules_recurrence ON public.live_schedules(recurrence) WHERE recurrence IS NOT NULL AND recurrence != 'none';

-- Categories
CREATE TABLE IF NOT EXISTS public.live_categories (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL UNIQUE,
    slug                TEXT NOT NULL UNIQUE,
    description         TEXT,
    icon                TEXT,
    color               TEXT,
    sort_order          INT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session Categories (many-to-many)
CREATE TABLE IF NOT EXISTS public.live_session_categories (
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    category_id         UUID NOT NULL REFERENCES public.live_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_live_session_categories_category ON public.live_session_categories(category_id);

-- Default Categories
INSERT INTO public.live_categories (name, slug, description, icon, color, sort_order) VALUES
    ('Gaming', 'gaming', 'Video game streaming', '🎮', '#6366f1', 1),
    ('Education', 'education', 'Tutorials, courses, workshops', '📚', '#10b981', 2),
    ('Business', 'business', 'Professional, entrepreneurship', '💼', '#f59e0b', 3),
    ('Music', 'music', 'Live performances, production', '🎵', '#ec4899', 4),
    ('Art & Design', 'art-design', 'Creative process, design', '🎨', '#8b5cf6', 5),
    ('Tech & Coding', 'tech-coding', 'Programming, development', '💻', '#06b6d4', 6),
    ('Finance & Trading', 'finance-trading', 'Markets, crypto, investing', '📈', '#22c55e', 7),
    ('Health & Fitness', 'health-fitness', 'Workouts, wellness', '💪', '#ef4444', 8),
    ('Just Chatting', 'just-chatting', 'Casual conversation', '💬', '#64748b', 9),
    ('Events', 'events', 'Conferences, meetups, panels', '🎪', '#f97316', 10)
ON CONFLICT (slug) DO NOTHING;

-- Follows/Subscriptions for Live Notifications
CREATE TABLE IF NOT EXISTS public.live_follows (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    host_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notify_live         BOOLEAN NOT NULL DEFAULT true,
    notify_scheduled    BOOLEAN NOT NULL DEFAULT true,
    notify_clips        BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, host_id)
);

CREATE INDEX IF NOT EXISTS idx_live_follows_user ON public.live_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_live_follows_host ON public.live_follows(host_id);

-- Moderators
CREATE TABLE IF NOT EXISTS public.live_moderators (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role                TEXT NOT NULL DEFAULT 'moderator', -- 'moderator' | 'cohost'
    permissions         JSONB NOT NULL DEFAULT '{"timeout": true, "ban": true, "delete_messages": true, "manage_polls": true}',
    added_by            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    added_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_moderators_session ON public.live_moderators(session_id);
CREATE INDEX IF NOT EXISTS idx_live_moderators_user ON public.live_moderators(user_id);

-- Chat Settings per Session
CREATE TABLE IF NOT EXISTS public.live_chat_settings (
    session_id          UUID PRIMARY KEY REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    slow_mode_seconds   INT NOT NULL DEFAULT 0,
    followers_only      BOOLEAN NOT NULL DEFAULT false,
    subscribers_only    BOOLEAN NOT NULL DEFAULT false,
    emote_only          BOOLEAN NOT NULL DEFAULT false,
    blocked_words       TEXT[] DEFAULT '{}',
    blocked_domains     TEXT[] DEFAULT '{}',
    max_message_length  INT NOT NULL DEFAULT 500,
    auto_mod_level      INT NOT NULL DEFAULT 1, -- 1=low, 2=medium, 3=high
    allow_links         BOOLEAN NOT NULL DEFAULT true,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Analytics Events (for real-time dashboards)
CREATE TABLE IF NOT EXISTS public.live_analytics_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    event_type          TEXT NOT NULL, -- 'viewer_join' | 'viewer_leave' | 'chat_message' | 'reaction' | 'poll_vote' | 'tip' | 'subscribe' | 'follow' | 'share' | 'clip_created'
    user_id             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    data                JSONB NOT NULL DEFAULT '{}',
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_analytics_session_time ON public.live_analytics_events(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_live_analytics_type ON public.live_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_live_analytics_user ON public.live_analytics_events(user_id);

-- Partition by month for performance (optional, for high volume)
-- CREATE TABLE public.live_analytics_events_y2025m01 PARTITION OF public.live_analytics_events FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- RLS Policies

-- live_stream_keys
ALTER TABLE public.live_stream_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hosts_view_own_stream_keys" ON public.live_stream_keys;
CREATE POLICY "hosts_view_own_stream_keys"
    ON public.live_stream_keys FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_stream_keys.session_id
            AND ls.host_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "hosts_manage_own_stream_keys" ON public.live_stream_keys;
CREATE POLICY "hosts_manage_own_stream_keys"
    ON public.live_stream_keys FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_stream_keys.session_id
            AND ls.host_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_stream_keys.session_id
            AND ls.host_id = auth.uid()
        )
    );

-- live_recordings
ALTER TABLE public.live_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recordings_visible_to_space_members" ON public.live_recordings;
CREATE POLICY "recordings_visible_to_space_members"
    ON public.live_recordings FOR SELECT
    USING (
        community_id IN (
            SELECT community_id FROM public.community_memberships
            WHERE user_id = auth.uid() AND status = 'active'
        )
        OR host_id = auth.uid()
    );

DROP POLICY IF EXISTS "hosts_manage_own_recordings" ON public.live_recordings;
CREATE POLICY "hosts_manage_own_recordings"
    ON public.live_recordings FOR ALL
    USING (host_id = auth.uid())
    WITH CHECK (host_id = auth.uid());

-- live_clips
ALTER TABLE public.live_clips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clips_visible_to_community" ON public.live_clips;
CREATE POLICY "clips_visible_to_community"
    ON public.live_clips FOR SELECT
    USING (
        is_published = true
        AND EXISTS (
            SELECT 1 FROM public.live_sessions ls
            JOIN public.community_memberships cm ON cm.community_id = ls.community_id
            WHERE ls.id = live_clips.session_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
        )
        OR creator_id = auth.uid()
    );

DROP POLICY IF EXISTS "creators_manage_own_clips" ON public.live_clips;
CREATE POLICY "creators_manage_own_clips"
    ON public.live_clips FOR ALL
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

-- live_schedules
ALTER TABLE public.live_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_visible_to_space_members" ON public.live_schedules;
CREATE POLICY "schedules_visible_to_space_members"
    ON public.live_schedules FOR SELECT
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

DROP POLICY IF EXISTS "hosts_manage_own_schedules" ON public.live_schedules;
CREATE POLICY "hosts_manage_own_schedules"
    ON public.live_schedules FOR ALL
    USING (host_id = auth.uid())
    WITH CHECK (host_id = auth.uid());

-- live_categories (public read)
ALTER TABLE public.live_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_public_read" ON public.live_categories;
CREATE POLICY "categories_public_read"
    ON public.live_categories FOR SELECT
    USING (is_active = true);

-- live_session_categories
ALTER TABLE public.live_session_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_categories_visible_with_session" ON public.live_session_categories;
CREATE POLICY "session_categories_visible_with_session"
    ON public.live_session_categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_session_categories.session_id
            AND (
                ls.privacy = 'public'
                OR ls.host_id = auth.uid()
                OR ls.community_id IN (
                    SELECT community_id FROM public.community_memberships
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            )
        )
    );

DROP POLICY IF EXISTS "hosts_manage_session_categories" ON public.live_session_categories;
CREATE POLICY "hosts_manage_session_categories"
    ON public.live_session_categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_session_categories.session_id
            AND ls.host_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_session_categories.session_id
            AND ls.host_id = auth.uid()
        )
    );

-- live_follows
ALTER TABLE public.live_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_follows" ON public.live_follows;
CREATE POLICY "users_manage_own_follows"
    ON public.live_follows FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "hosts_view_followers" ON public.live_follows;
CREATE POLICY "hosts_view_followers"
    ON public.live_follows FOR SELECT
    USING (host_id = auth.uid());

-- live_moderators
ALTER TABLE public.live_moderators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "moderators_view_own" ON public.live_moderators;
CREATE POLICY "moderators_view_own"
    ON public.live_moderators FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "hosts_manage_moderators" ON public.live_moderators;
CREATE POLICY "hosts_manage_moderators"
    ON public.live_moderators FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_moderators.session_id
            AND ls.host_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_moderators.session_id
            AND ls.host_id = auth.uid()
        )
    );

-- live_chat_settings
ALTER TABLE public.live_chat_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_settings_visible_to_participants" ON public.live_chat_settings;
CREATE POLICY "chat_settings_visible_to_participants"
    ON public.live_chat_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_chat_settings.session_id
            AND (
                ls.privacy = 'public'
                OR ls.host_id = auth.uid()
                OR ls.community_id IN (
                    SELECT community_id FROM public.community_memberships
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            )
        )
    );

DROP POLICY IF EXISTS "hosts_manage_chat_settings" ON public.live_chat_settings;
CREATE POLICY "hosts_manage_chat_settings"
    ON public.live_chat_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_chat_settings.session_id
            AND ls.host_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_chat_settings.session_id
            AND ls.host_id = auth.uid()
        )
    );

-- live_analytics_events
ALTER TABLE public.live_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_visible_to_host" ON public.live_analytics_events;
CREATE POLICY "analytics_visible_to_host"
    ON public.live_analytics_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_analytics_events.session_id
            AND ls.host_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "participants_insert_analytics" ON public.live_analytics_events;
CREATE POLICY "participants_insert_analytics"
    ON public.live_analytics_events FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.live_session_participants p
            WHERE p.session_id = live_analytics_events.session_id
            AND p.user_id = auth.uid()
            AND p.left_at IS NULL
        )
    );

-- Updated at triggers
DROP TRIGGER IF EXISTS update_live_stream_keys_updated_at ON public.live_stream_keys;
CREATE TRIGGER update_live_stream_keys_updated_at
    BEFORE UPDATE ON public.live_stream_keys
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_recordings_updated_at ON public.live_recordings;
CREATE TRIGGER update_live_recordings_updated_at
    BEFORE UPDATE ON public.live_recordings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_clips_updated_at ON public.live_clips;
CREATE TRIGGER update_live_clips_updated_at
    BEFORE UPDATE ON public.live_clips
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_schedules_updated_at ON public.live_schedules;
CREATE TRIGGER update_live_schedules_updated_at
    BEFORE UPDATE ON public.live_schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_categories_updated_at ON public.live_categories;
CREATE TRIGGER update_live_categories_updated_at
    BEFORE UPDATE ON public.live_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_chat_settings_updated_at ON public.live_chat_settings;
CREATE TRIGGER update_live_chat_settings_updated_at
    BEFORE UPDATE ON public.live_chat_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC Functions

-- Create stream key for session
CREATE OR REPLACE FUNCTION public.create_live_stream_key(session_id UUID)
RETURNS TABLE (stream_key TEXT, rtmp_url TEXT, srt_url TEXT, whip_url TEXT, whep_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_stream_key TEXT;
    v_rtmp_url TEXT;
    v_srt_url TEXT;
    v_whip_url TEXT;
    v_whep_url TEXT;
    v_media_server TEXT := 'rtmp://localhost:1935/live'; -- Configure via env
BEGIN
    v_stream_key := 'live_' || encode(gen_random_bytes(16), 'hex');
    v_rtmp_url := v_media_server;
    v_srt_url := replace(v_media_server, 'rtmp://', 'srt://') || '?streamid=' || v_stream_key;
    v_whip_url := replace(v_media_server, 'rtmp://', 'https://') || '/whip/' || v_stream_key;
    v_whep_url := replace(v_media_server, 'rtmp://', 'https://') || '/whep/' || v_stream_key;

    INSERT INTO public.live_stream_keys (session_id, stream_key, rtmp_url, srt_url, whip_url, whep_url)
    VALUES (session_id, v_stream_key, v_rtmp_url, v_srt_url, v_whip_url, v_whep_url)
    ON CONFLICT (session_id) DO UPDATE SET
        stream_key = EXCLUDED.stream_key,
        rtmp_url = EXCLUDED.rtmp_url,
        srt_url = EXCLUDED.srt_url,
        whip_url = EXCLUDED.whip_url,
        whep_url = EXCLUDED.whep_url,
        is_active = true,
        updated_at = now()
    RETURNING stream_key, rtmp_url, srt_url, whip_url, whep_url
    INTO v_stream_key, v_rtmp_url, v_srt_url, v_whip_url, v_whep_url;

    RETURN QUERY SELECT v_stream_key, v_rtmp_url, v_srt_url, v_whip_url, v_whep_url;
END $$;

-- Get stream key for playback (WHIP/WHEP)
CREATE OR REPLACE FUNCTION public.get_live_stream_playback(session_id UUID)
RETURNS TABLE (whip_url TEXT, whep_url TEXT, hls_url TEXT, dash_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_whip TEXT;
    v_whep TEXT;
    v_hls TEXT;
    v_dash TEXT;
    v_media_server TEXT := 'https://live.example.com'; -- Configure via env
BEGIN
    SELECT whip_url, whep_url INTO v_whip, v_whep
    FROM public.live_stream_keys
    WHERE session_id = $1 AND is_active = true;

    v_hls := v_media_server || '/hls/' || (SELECT stream_key FROM public.live_stream_keys WHERE session_id = $1 AND is_active = true) || '.m3u8';
    v_dash := v_media_server || '/dash/' || (SELECT stream_key FROM public.live_stream_keys WHERE session_id = $1 AND is_active = true) || '.mpd';

    RETURN QUERY SELECT v_whip, v_whep, v_hls, v_dash;
END $$;

-- Record analytics event
CREATE OR REPLACE FUNCTION public.record_live_analytics(
    p_session_id UUID,
    p_event_type TEXT,
    p_data JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.live_analytics_events (session_id, event_type, user_id, data)
    VALUES (p_session_id, p_event_type, auth.uid(), p_data);
END $$;

-- Ticket Purchases
CREATE TABLE IF NOT EXISTS public.live_ticket_purchases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    tier_id             UUID NOT NULL REFERENCES public.live_ticket_tiers(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quantity            INT NOT NULL DEFAULT 1,
    unit_price_usd      NUMERIC(10, 2) NOT NULL,
    total_price_usd     NUMERIC(10, 2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'USD',
    status              TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
    payment_provider    TEXT, -- 'pesapal' | 'nowpayments' | 'afripay' | 'paypal' | 'binancepay' | 'pawapay'
    payment_intent_id   TEXT,
    refunded_at         TIMESTAMPTZ,
    refund_reason       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_ticket_purchases_session ON public.live_ticket_purchases(session_id);
CREATE INDEX IF NOT EXISTS idx_live_ticket_purchases_user ON public.live_ticket_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_live_ticket_purchases_tier ON public.live_ticket_purchases(tier_id);
CREATE INDEX IF NOT EXISTS idx_live_ticket_purchases_status ON public.live_ticket_purchases(status);

-- Tips/Donations
CREATE TABLE IF NOT EXISTS public.live_tips (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    from_user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_usd          NUMERIC(10, 2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'USD',
    message             TEXT,
    is_anonymous        BOOLEAN NOT NULL DEFAULT false,
    status              TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed' | 'refunded'
    payment_provider    TEXT,
    payment_intent_id   TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_live_tips_session ON public.live_tips(session_id);
CREATE INDEX IF NOT EXISTS idx_live_tips_from_user ON public.live_tips(from_user_id);
CREATE INDEX IF NOT EXISTS idx_live_tips_to_user ON public.live_tips(to_user_id);
CREATE INDEX IF NOT EXISTS idx_live_tips_status ON public.live_tips(status);

-- Sponsorships
CREATE TABLE IF NOT EXISTS public.live_sponsorships (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    sponsor_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    description         TEXT,
    image_url           TEXT,
    link_url            TEXT,
    amount_usd          NUMERIC(10, 2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'USD',
    placement           TEXT NOT NULL DEFAULT 'overlay', -- 'overlay' | 'chat_banner' | 'pre_roll' | 'mid_roll' | 'post_roll'
    starts_at           TIMESTAMPTZ,
    ends_at             TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_sponsorships_session ON public.live_sponsorships(session_id);
CREATE INDEX IF NOT EXISTS idx_live_sponsorships_sponsor ON public.live_sponsorships(sponsor_id);

-- Updated at triggers
DROP TRIGGER IF EXISTS update_live_ticket_tiers_updated_at ON public.live_ticket_tiers;
CREATE TRIGGER update_live_ticket_tiers_updated_at
    BEFORE UPDATE ON public.live_ticket_tiers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_ticket_purchases_updated_at ON public.live_ticket_purchases;
CREATE TRIGGER update_live_ticket_purchases_updated_at
    BEFORE UPDATE ON public.live_ticket_purchases
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_sponsorships_updated_at ON public.live_sponsorships;
CREATE TRIGGER update_live_sponsorships_updated_at
    BEFORE UPDATE ON public.live_sponsorships
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- live_ticket_tiers
ALTER TABLE public.live_ticket_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_tiers_visible_to_session_members" ON public.live_ticket_tiers;
CREATE POLICY "ticket_tiers_visible_to_session_members"
    ON public.live_ticket_tiers FOR SELECT
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_ticket_tiers.session_id
            AND (
                ls.privacy = 'public'
                OR ls.host_id = auth.uid()
                OR ls.community_id IN (
                    SELECT community_id FROM public.community_memberships
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            )
        )
    );

DROP POLICY IF EXISTS "hosts_manage_ticket_tiers" ON public.live_ticket_tiers;
CREATE POLICY "hosts_manage_ticket_tiers"
    ON public.live_ticket_tiers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_ticket_tiers.session_id
            AND ls.host_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_ticket_tiers.session_id
            AND ls.host_id = auth.uid()
        )
    );

-- live_ticket_purchases
ALTER TABLE public.live_ticket_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_purchases" ON public.live_ticket_purchases;
CREATE POLICY "users_view_own_purchases"
    ON public.live_ticket_purchases FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "hosts_view_session_purchases" ON public.live_ticket_purchases;
CREATE POLICY "hosts_view_session_purchases"
    ON public.live_ticket_purchases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_ticket_purchases.session_id
            AND ls.host_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "users_create_purchases" ON public.live_ticket_purchases;
CREATE POLICY "users_create_purchases"
    ON public.live_ticket_purchases FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "hosts_update_purchases" ON public.live_ticket_purchases;
CREATE POLICY "hosts_update_purchases"
    ON public.live_ticket_purchases FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_ticket_purchases.session_id
            AND ls.host_id = auth.uid()
        )
    );

-- live_tips
ALTER TABLE public.live_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tips_visible_to_session_members" ON public.live_tips;
CREATE POLICY "tips_visible_to_session_members"
    ON public.live_tips FOR SELECT
    USING (
        status = 'completed'
        AND EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_tips.session_id
            AND (
                ls.privacy = 'public'
                OR ls.host_id = auth.uid()
                OR ls.community_id IN (
                    SELECT community_id FROM public.community_memberships
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            )
        )
    );

DROP POLICY IF EXISTS "senders_view_own_tips" ON public.live_tips;
CREATE POLICY "senders_view_own_tips"
    ON public.live_tips FOR SELECT
    USING (from_user_id = auth.uid());

DROP POLICY IF EXISTS "recipients_view_tips" ON public.live_tips;
CREATE POLICY "recipients_view_tips"
    ON public.live_tips FOR SELECT
    USING (to_user_id = auth.uid());

DROP POLICY IF EXISTS "users_create_tips" ON public.live_tips;
CREATE POLICY "users_create_tips"
    ON public.live_tips FOR INSERT
    WITH CHECK (from_user_id = auth.uid());

DROP POLICY IF EXISTS "hosts_view_all_tips" ON public.live_tips;
CREATE POLICY "hosts_view_all_tips"
    ON public.live_tips FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_tips.session_id
            AND ls.host_id = auth.uid()
        )
    );

-- live_sponsorships
ALTER TABLE public.live_sponsorships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsorships_visible_to_session" ON public.live_sponsorships;
CREATE POLICY "sponsorships_visible_to_session"
    ON public.live_sponsorships FOR SELECT
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_sponsorships.session_id
            AND (
                ls.privacy = 'public'
                OR ls.host_id = auth.uid()
                OR ls.community_id IN (
                    SELECT community_id FROM public.community_memberships
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            )
        )
    );

DROP POLICY IF EXISTS "hosts_manage_sponsorships" ON public.live_sponsorships;
CREATE POLICY "hosts_manage_sponsorships"
    ON public.live_sponsorships FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_sponsorships.session_id
            AND ls.host_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_sponsorships.session_id
            AND ls.host_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "sponsors_view_own" ON public.live_sponsorships;
CREATE POLICY "sponsors_view_own"
    ON public.live_sponsorships FOR SELECT
    USING (sponsor_id = auth.uid());

-- ============================================
-- PAYMENT WEBHOOK HANDLERS
-- ============================================

-- Function to complete ticket purchase
CREATE OR REPLACE FUNCTION public.complete_ticket_purchase(p_purchase_id UUID, p_payment_intent_id TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.live_ticket_purchases
    SET 
        status = 'completed',
        payment_intent_id = COALESCE(p_payment_intent_id, payment_intent_id),
        updated_at = now()
    WHERE id = p_purchase_id AND status = 'pending';

    -- Increment sold quantity
    UPDATE public.live_ticket_tiers
    SET sold_quantity = sold_quantity + (
        SELECT quantity FROM public.live_ticket_purchases WHERE id = p_purchase_id
    )
    WHERE id = (SELECT tier_id FROM public.live_ticket_purchases WHERE id = p_purchase_id);

    -- Record analytics
    INSERT INTO public.live_analytics_events (session_id, event_type, user_id, data)
    SELECT 
        session_id, 'ticket_purchase', user_id,
        jsonb_build_object('purchase_id', id, 'amount', total_price_usd, 'tier_id', tier_id)
    FROM public.live_ticket_purchases
    WHERE id = p_purchase_id;
END $$;

-- Function to complete tip
CREATE OR REPLACE FUNCTION public.complete_tip(p_tip_id UUID, p_payment_intent_id TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.live_tips
    SET 
        status = 'completed',
        payment_intent_id = COALESCE(p_payment_intent_id, payment_intent_id),
        completed_at = now()
    WHERE id = p_tip_id AND status = 'pending';

    -- Record analytics
    INSERT INTO public.live_analytics_events (session_id, event_type, user_id, data)
    SELECT 
        session_id, 'tip', from_user_id,
        jsonb_build_object('tip_id', id, 'amount', amount_usd, 'currency', currency)
    FROM public.live_tips
    WHERE id = p_tip_id;
END $$;

-- ============================================
-- MONETIZATION TABLES
-- ============================================

-- Ticket Tiers for Paid Sessions
CREATE TABLE IF NOT EXISTS public.live_ticket_tiers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    name                TEXT NOT NULL, -- 'General Admission', 'VIP', 'Early Bird'
    description         TEXT,
    price_usd           NUMERIC(10, 2) NOT NULL DEFAULT 0,
    price_currency      TEXT NOT NULL DEFAULT 'USD',
    max_quantity        INT,
    sold_quantity       INT NOT NULL DEFAULT 0,
    perks               JSONB NOT NULL DEFAULT '[]', -- ['priority_chat', 'exclusive_qa', 'recording_access']
    sale_starts_at      TIMESTAMPTZ,
    sale_ends_at        TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_ticket_tiers_session ON public.live_ticket_tiers(session_id);
CREATE INDEX IF NOT EXISTS idx_live_ticket_tiers_active ON public.live_ticket_tiers(is_active) WHERE is_active = true;

-- Ticket Purchases
CREATE TABLE IF NOT EXISTS public.live_ticket_purchases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    tier_id             UUID NOT NULL REFERENCES public.live_ticket_tiers(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quantity            INT NOT NULL DEFAULT 1,
    unit_price_usd      NUMERIC(10, 2) NOT NULL,
    total_price_usd     NUMERIC(10, 2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'USD',
    status              TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'refunded' | 'cancelled'
    payment_provider    TEXT, -- 'stripe' | 'paypal' | 'pesapal' | 'nowpayments' | 'afripay' | 'binancepay'
    payment_intent_id   TEXT, -- Provider's payment intent ID
    payment_data        JSONB NOT NULL DEFAULT '{}',
    purchased_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    refunded_at         TIMESTAMPTZ,
    refund_reason       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_ticket_purchases_session ON public.live_ticket_purchases(session_id);
CREATE INDEX IF NOT EXISTS idx_live_ticket_purchases_user ON public.live_ticket_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_live_ticket_purchases_status ON public.live_ticket_purchases(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_live_ticket_purchase_user_tier ON public.live_ticket_purchases(user_id, tier_id) WHERE status = 'completed';

-- Tips/Donations during Live Sessions
CREATE TABLE IF NOT EXISTS public.live_tips (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    sender_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_usd          NUMERIC(10, 2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'USD',
    message             TEXT,
    is_anonymous        BOOLEAN NOT NULL DEFAULT false,
    payment_provider    TEXT,
    payment_intent_id   TEXT,
    payment_data        JSONB NOT NULL DEFAULT '{}',
    status              TEXT NOT NULL DEFAULT 'completed', -- 'pending' | 'completed' | 'failed' | 'refunded'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_tips_session ON public.live_tips(session_id);
CREATE INDEX IF NOT EXISTS idx_live_tips_sender ON public.live_tips(sender_id);
CREATE INDEX IF NOT EXISTS idx_live_tips_recipient ON public.live_tips(recipient_id);
CREATE INDEX IF NOT EXISTS idx_live_tips_created ON public.live_tips(created_at DESC);

-- Subscriptions to Creators (Recurring Support)
CREATE TABLE IF NOT EXISTS public.live_subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier_name           TEXT NOT NULL, -- 'Supporter', 'Super Fan', 'VIP'
    price_usd           NUMERIC(10, 2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'USD',
    billing_cycle       TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'yearly'
    status              TEXT NOT NULL DEFAULT 'active', -- 'active' | 'cancelled' | 'past_due' | 'paused'
    payment_provider    TEXT,
    provider_subscription_id TEXT,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end   TIMESTAMPTZ NOT NULL,
    cancelled_at        TIMESTAMPTZ,
    perks               JSONB NOT NULL DEFAULT '[]',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (subscriber_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_live_subscriptions_subscriber ON public.live_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_live_subscriptions_creator ON public.live_subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_subscriptions_status ON public.live_subscriptions(status);

-- Sponsorships/Ad Slots
CREATE TABLE IF NOT EXISTS public.live_sponsorships (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    sponsor_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    description         TEXT,
    image_url           TEXT,
    link_url            TEXT,
    price_usd           NUMERIC(10, 2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'USD',
    slot_type           TEXT NOT NULL DEFAULT 'overlay', -- 'overlay' | 'pre_roll' | 'mid_roll' | 'post_roll' | 'chat_banner'
    start_time_seconds  INT, -- For mid-roll
    duration_seconds    INT,
    status              TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'completed' | 'cancelled'
    payment_status      TEXT NOT NULL DEFAULT 'pending',
    payment_intent_id   TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_sponsorships_session ON public.live_sponsorships(session_id);
CREATE INDEX IF NOT EXISTS idx_live_sponsorships_sponsor ON public.live_sponsorships(sponsor_id);

-- RLS Policies for Monetization

-- live_ticket_tiers
ALTER TABLE public.live_ticket_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_tiers_visible_to_space_members" ON public.live_ticket_tiers;
CREATE POLICY "ticket_tiers_visible_to_space_members"
    ON public.live_ticket_tiers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            JOIN public.spaces s ON s.id = ls.space_id
            WHERE ls.id = live_ticket_tiers.session_id
            AND (
                s.access_type = 'free'
                OR ls.host_id = auth.uid()
                OR s.community_id IN (
                    SELECT community_id FROM public.community_memberships
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            )
        )
    );

DROP POLICY IF EXISTS "hosts_manage_ticket_tiers" ON public.live_ticket_tiers;
CREATE POLICY "hosts_manage_ticket_tiers"
    ON public.live_ticket_tiers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_ticket_tiers.session_id
            AND ls.host_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_ticket_tiers.session_id
            AND ls.host_id = auth.uid()
        )
    );

-- live_ticket_purchases
ALTER TABLE public.live_ticket_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_purchases" ON public.live_ticket_purchases;
CREATE POLICY "users_view_own_purchases"
    ON public.live_ticket_purchases FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "hosts_view_session_purchases" ON public.live_ticket_purchases;
CREATE POLICY "hosts_view_session_purchases"
    ON public.live_ticket_purchases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_ticket_purchases.session_id
            AND ls.host_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "users_create_purchases" ON public.live_ticket_purchases;
CREATE POLICY "users_create_purchases"
    ON public.live_ticket_purchases FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- live_tips
ALTER TABLE public.live_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tips_visible_to_session_participants" ON public.live_tips;
CREATE POLICY "tips_visible_to_session_participants"
    ON public.live_tips FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_tips.session_id
            AND (
                ls.host_id = auth.uid()
                OR ls.privacy = 'public'
                OR ls.community_id IN (
                    SELECT community_id FROM public.community_memberships
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            )
        )
        OR sender_id = auth.uid()
        OR recipient_id = auth.uid()
    );

DROP POLICY IF EXISTS "users_send_tips" ON public.live_tips;
CREATE POLICY "users_send_tips"
    ON public.live_tips FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.live_session_participants p
            WHERE p.session_id = live_tips.session_id
            AND p.user_id = auth.uid()
            AND p.left_at IS NULL
        )
    );

-- live_subscriptions
ALTER TABLE public.live_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriber_view_own" ON public.live_subscriptions;
CREATE POLICY "subscriber_view_own"
    ON public.live_subscriptions FOR SELECT
    USING (subscriber_id = auth.uid());

DROP POLICY IF EXISTS "creator_view_subscriptions" ON public.live_subscriptions;
CREATE POLICY "creator_view_subscriptions"
    ON public.live_subscriptions FOR SELECT
    USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "subscriber_manage_own" ON public.live_subscriptions;
CREATE POLICY "subscriber_manage_own"
    ON public.live_subscriptions FOR ALL
    USING (subscriber_id = auth.uid())
    WITH CHECK (subscriber_id = auth.uid());

-- live_sponsorships
ALTER TABLE public.live_sponsorships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsorships_visible_to_host" ON public.live_sponsorships;
CREATE POLICY "sponsorships_visible_to_host"
    ON public.live_sponsorships FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_sponsorships.session_id
            AND ls.host_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "sponsor_view_own" ON public.live_sponsorships;
CREATE POLICY "sponsor_view_own"
    ON public.live_sponsorships FOR SELECT
    USING (sponsor_id = auth.uid());

DROP POLICY IF EXISTS "host_manage_sponsorships" ON public.live_sponsorships;
CREATE POLICY "host_manage_sponsorships"
    ON public.live_sponsorships FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_sponsorships.session_id
            AND ls.host_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls
            WHERE ls.id = live_sponsorships.session_id
            AND ls.host_id = auth.uid()
        )
    );

-- Updated at triggers
DROP TRIGGER IF EXISTS update_live_ticket_tiers_updated_at ON public.live_ticket_tiers;
CREATE TRIGGER update_live_ticket_tiers_updated_at
    BEFORE UPDATE ON public.live_ticket_tiers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_ticket_purchases_updated_at ON public.live_ticket_purchases;
CREATE TRIGGER update_live_ticket_purchases_updated_at
    BEFORE UPDATE ON public.live_ticket_purchases
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_subscriptions_updated_at ON public.live_subscriptions;
CREATE TRIGGER update_live_subscriptions_updated_at
    BEFORE UPDATE ON public.live_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_sponsorships_updated_at ON public.live_sponsorships;
CREATE TRIGGER update_live_sponsorships_updated_at
    BEFORE UPDATE ON public.live_sponsorships
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();