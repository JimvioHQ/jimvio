-- 101_purge_legacy_groups_channels.sql
-- Targeted cleanup: remove ONLY legacy/demo Groups (spaces) & Channels (rooms).
-- Preserves: communities, memberships, owners, courses, and non-legacy structure.
--
-- Matching rules (name/slug heuristics for known bootstrap/cert/demo Groups):
--   Start Here, Signal Pro, Study Circle, Challenges, Cert*, CG*, G <timestamp>,
--   test/LAB/Book/COURSES, Smart Money Lab, and auto-seeded General/Announcements/
--   Chat Room/Course Room/Voice Room/Tasks Room/Resources Room channels.
--
-- Course-linked rooms are soft-hidden (is_active=false), never hard-deleted,
-- so community_courses rows are preserved.

BEGIN;

-- Detach live_sessions from spaces we may remove (avoid cascading test sessions).
ALTER TABLE public.live_sessions
  ALTER COLUMN space_id DROP NOT NULL;

ALTER TABLE public.live_sessions
  DROP CONSTRAINT IF EXISTS live_sessions_space_id_fkey;

ALTER TABLE public.live_sessions
  ADD CONSTRAINT live_sessions_space_id_fkey
  FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE SET NULL;

CREATE TEMP TABLE legacy_spaces ON COMMIT DROP AS
SELECT s.id
FROM public.spaces s
WHERE
  s.name ILIKE 'Start Here%'
  OR s.name ILIKE 'Signal Pro%'
  OR s.name ILIKE 'Study Circle%'
  OR s.name ILIKE 'Challenges%'
  OR s.name ILIKE 'Cert %'
  OR s.name ILIKE 'CG %'
  OR s.name ~ '^[CG] [0-9]'
  OR lower(s.name) IN ('test', 'lab', 'book', 'courses')
  OR s.name ILIKE 'Smart Money Lab%'
  OR s.slug ~* '^(start-here|signal-pro|study-circle|challenges|cert-|cg-|g-[0-9]|test-|lab-|book-|courses-|smart-money)';

CREATE TEMP TABLE legacy_rooms ON COMMIT DROP AS
SELECT r.id, r.space_id
FROM public.rooms r
WHERE
  r.space_id IN (SELECT id FROM legacy_spaces)
  OR r.name ILIKE 'General'
  OR r.name ILIKE 'Announcements'
  OR r.name ILIKE 'Chat Room%'
  OR r.name ILIKE 'Course Room%'
  OR r.name ILIKE 'Voice Room%'
  OR r.name ILIKE 'Tasks Room%'
  OR r.name ILIKE 'Resources Room%'
  OR r.name ILIKE 'Signals'
  OR r.name ILIKE 'Resources'
  OR r.slug ~* '^(general|announcements|chat-room|course-room|voice-room|tasks-room|resources-room|signals|resources)(-|$)';

-- Soft-hide every matched Group/Channel from workspace loaders.
UPDATE public.rooms r
SET is_active = false,
    updated_at = NOW()
FROM legacy_rooms lr
WHERE r.id = lr.id;

UPDATE public.spaces s
SET is_active = false,
    updated_at = NOW()
FROM legacy_spaces ls
WHERE s.id = ls.id;

-- Detach live sessions pointing at rooms/spaces we will hard-delete.
UPDATE public.live_sessions ls
SET room_id = NULL
WHERE room_id IN (
  SELECT lr.id
  FROM legacy_rooms lr
  WHERE NOT EXISTS (
    SELECT 1 FROM public.community_courses cc WHERE cc.room_id = lr.id
  )
);

UPDATE public.live_sessions ls
SET space_id = NULL
WHERE space_id IN (
  SELECT ls2.id
  FROM legacy_spaces ls2
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.rooms r
    JOIN public.community_courses cc ON cc.room_id = r.id
    WHERE r.space_id = ls2.id
  )
);

-- Hard-delete legacy channels that do not back a course.
DELETE FROM public.rooms r
WHERE r.id IN (SELECT id FROM legacy_rooms)
  AND NOT EXISTS (
    SELECT 1 FROM public.community_courses cc WHERE cc.room_id = r.id
  );

-- Hard-delete legacy groups that no longer contain any channel.
DELETE FROM public.spaces s
WHERE s.id IN (SELECT id FROM legacy_spaces)
  AND NOT EXISTS (
    SELECT 1 FROM public.rooms r WHERE r.space_id = s.id
  );

-- Remaining course-holder legacy shells stay inactive (hidden from Groups/Channels).
UPDATE public.rooms r
SET is_active = false,
    updated_at = NOW()
WHERE r.id IN (SELECT id FROM legacy_rooms)
  AND r.is_active IS DISTINCT FROM false;

UPDATE public.spaces s
SET is_active = false,
    updated_at = NOW()
WHERE s.id IN (SELECT id FROM legacy_spaces)
  AND s.is_active IS DISTINCT FROM false;

-- Recount active groups only.
UPDATE public.communities c
SET space_count = (
  SELECT COUNT(*)::integer
  FROM public.spaces s
  WHERE s.community_id = c.id
    AND s.is_active = true
),
updated_at = NOW();

COMMIT;
