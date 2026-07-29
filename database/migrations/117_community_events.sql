-- Community 2.0: first-class events + RSVP + community visibility modes

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private', 'invite_only'));

UPDATE public.communities
SET visibility = CASE
  WHEN COALESCE(is_private, false) THEN 'invite_only'
  ELSE 'public'
END
WHERE visibility = 'public' OR visibility IS NULL;

CREATE TABLE IF NOT EXISTS public.community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'meetup'
    CHECK (kind IN ('workshop', 'webinar', 'ama', 'meetup', 'launch', 'other')),
  location TEXT,
  is_online BOOLEAN NOT NULL DEFAULT true,
  meeting_url TEXT,
  image_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  capacity INT,
  rsvp_count INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_events_community_starts
  ON public.community_events (community_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_events_starts
  ON public.community_events (starts_at);

CREATE TABLE IF NOT EXISTS public.community_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going'
    CHECK (status IN ('going', 'interested', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_event_rsvps_user
  ON public.community_event_rsvps (user_id, created_at DESC);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read published community events" ON public.community_events;
CREATE POLICY "Members can read published community events"
  ON public.community_events FOR SELECT
  USING (
    is_published = true
    AND (
      EXISTS (
        SELECT 1 FROM public.community_memberships m
        WHERE m.community_id = community_events.community_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.communities c
        WHERE c.id = community_events.community_id
          AND c.visibility = 'public'
          AND COALESCE(c.is_active, true)
      )
    )
  );

DROP POLICY IF EXISTS "Owners can manage community events" ON public.community_events;
CREATE POLICY "Owners can manage community events"
  ON public.community_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_events.community_id
        AND c.owner_id = auth.uid()
    )
    OR created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_events.community_id
        AND c.owner_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users manage own event RSVPs" ON public.community_event_rsvps;
CREATE POLICY "Users manage own event RSVPs"
  ON public.community_event_rsvps FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can read event RSVPs" ON public.community_event_rsvps;
CREATE POLICY "Members can read event RSVPs"
  ON public.community_event_rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_events e
      JOIN public.community_memberships m ON m.community_id = e.community_id
      WHERE e.id = community_event_rsvps.event_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION public.bump_community_event_rsvp_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('going', 'interested') THEN
    UPDATE public.community_events
    SET rsvp_count = rsvp_count + 1, updated_at = NOW()
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('going', 'interested') AND NEW.status = 'declined' THEN
      UPDATE public.community_events
      SET rsvp_count = GREATEST(rsvp_count - 1, 0), updated_at = NOW()
      WHERE id = NEW.event_id;
    ELSIF OLD.status = 'declined' AND NEW.status IN ('going', 'interested') THEN
      UPDATE public.community_events
      SET rsvp_count = rsvp_count + 1, updated_at = NOW()
      WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status IN ('going', 'interested') THEN
    UPDATE public.community_events
    SET rsvp_count = GREATEST(rsvp_count - 1, 0), updated_at = NOW()
    WHERE id = OLD.event_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_community_event_rsvp_count ON public.community_event_rsvps;
CREATE TRIGGER trg_bump_community_event_rsvp_count
AFTER INSERT OR UPDATE OR DELETE ON public.community_event_rsvps
FOR EACH ROW EXECUTE FUNCTION public.bump_community_event_rsvp_count();
