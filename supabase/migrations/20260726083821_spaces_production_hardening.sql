-- Spaces production hardening
-- 1) Realtime for space/room/membership mutations (Discord-like live updates)
-- 2) archived_by audit column on spaces
-- 3) Partial index for archived space lookups

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.spaces.archived_by IS
  'User who archived/soft-deleted the space (audit).';

CREATE INDEX IF NOT EXISTS idx_spaces_community_archived
  ON public.spaces (community_id, archived_at DESC)
  WHERE archived_at IS NOT NULL;

-- Realtime publications (idempotent)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'spaces',
    'rooms',
    'community_memberships',
    'space_staff'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
