ALTER TABLE public.live_recordings
  ALTER COLUMN community_id DROP NOT NULL;

COMMENT ON COLUMN public.live_recordings.community_id IS
  'Owning community when applicable. NULL for creator/independent live recordings.';
