-- Space types (Community → Spaces)
-- Existing Groups (spaces) and Channels (rooms) preserved; product term is Spaces.
-- App validates known space_type values; column is free text so future types
-- do not require a migration (no rigid CHECK constraint).

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS space_type TEXT NOT NULL DEFAULT 'discussion';

COMMENT ON COLUMN public.spaces.space_type IS
  'Product Space type (discussion|voice|live|course|marketplace|event|ai|…). Validated in app; free text so new types need no migration. Existing Groups (spaces) and Channels (rooms) preserved; product term is Spaces.';

CREATE INDEX IF NOT EXISTS idx_spaces_space_type
  ON public.spaces (space_type);

-- Backfill from first active room's channel_kind / room_type where possible.
UPDATE public.spaces s
SET space_type = mapped.space_type
FROM (
  SELECT DISTINCT ON (r.space_id)
    r.space_id,
    CASE
      WHEN lower(coalesce(r.channel_kind, '')) IN ('marketplace', 'commerce') THEN 'marketplace'
      WHEN lower(coalesce(r.channel_kind, '')) IN ('courses', 'course') THEN 'course'
      WHEN lower(coalesce(r.channel_kind, '')) IN ('events', 'event') THEN 'event'
      WHEN lower(coalesce(r.channel_kind, '')) = 'voice' THEN 'voice'
      WHEN lower(coalesce(r.channel_kind, '')) = 'live' THEN 'live'
      WHEN lower(coalesce(r.channel_kind, '')) = 'ai' THEN 'ai'
      WHEN lower(r.room_type) = 'voice' THEN 'voice'
      WHEN lower(r.room_type) = 'live' THEN 'live'
      WHEN lower(r.room_type) = 'course' THEN 'course'
      WHEN lower(r.room_type) = 'tasks' THEN 'event'
      ELSE 'discussion'
    END AS space_type
  FROM public.rooms r
  WHERE r.is_active = true
  ORDER BY r.space_id, r.sort_order ASC NULLS LAST, r.created_at ASC NULLS LAST
) mapped
WHERE s.id = mapped.space_id
  AND s.space_type = 'discussion'
  AND mapped.space_type IS DISTINCT FROM 'discussion';
