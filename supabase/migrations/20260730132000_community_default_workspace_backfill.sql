-- Backfill default General space + Discussion room for communities with none.
-- Sync visibility_mode from visibility when they disagree.
-- Idempotent / safe.

-- 1) Align visibility_mode with visibility when visibility is set and mode is still default public
UPDATE public.communities c
SET visibility_mode = c.visibility
WHERE c.visibility IS NOT NULL
  AND c.visibility IN ('public', 'private', 'invite_only')
  AND coalesce(c.visibility_mode, 'public') IS DISTINCT FROM c.visibility;

-- 2) Seed General space for active communities that have zero spaces
WITH needy AS (
  SELECT c.id AS community_id
  FROM public.communities c
  WHERE coalesce(c.is_active, true)
    AND NOT EXISTS (
      SELECT 1 FROM public.spaces s
      WHERE s.community_id = c.id AND coalesce(s.is_active, true)
    )
),
ins_spaces AS (
  INSERT INTO public.spaces (
    community_id, name, slug, description, icon, color,
    sort_order, access_type, privacy, space_type, is_active,
    room_count, member_count, last_activity_at
  )
  SELECT
    n.community_id,
    'General',
    'general',
    'Default group for community discussion',
    '💬',
    '#6366F1',
    0,
    'free',
    'public',
    'discussion',
    true,
    0,
    0,
    now()
  FROM needy n
  RETURNING id, community_id
),
ins_rooms AS (
  INSERT INTO public.rooms (
    space_id, community_id, name, slug, description,
    room_type, channel_kind, access_type, sort_order, is_active,
    visibility, last_activity_at
  )
  SELECT
    s.id,
    s.community_id,
    'Discussion',
    'discussion',
    'Main community discussion',
    'chat',
    'discussion',
    'inherit',
    0,
    true,
    'members',
    now()
  FROM ins_spaces s
  RETURNING id, space_id, community_id
)
UPDATE public.spaces sp
SET room_count = 1
FROM ins_rooms r
WHERE sp.id = r.space_id;

UPDATE public.communities c
SET space_count = greatest(coalesce(c.space_count, 0), 1)
WHERE EXISTS (
  SELECT 1 FROM public.spaces s
  WHERE s.community_id = c.id AND coalesce(s.is_active, true)
)
AND coalesce(c.space_count, 0) = 0;
