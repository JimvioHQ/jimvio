-- ADD-only: per-membership mute prefs for groups (spaces) and channels (rooms).
-- Shape: { "spaces": ["uuid", ...], "rooms": ["uuid", ...] }
-- Does not alter or drop any existing columns.

ALTER TABLE public.community_memberships
  ADD COLUMN IF NOT EXISTS notification_mutes jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.community_memberships.notification_mutes IS
  'Per-member mute prefs: { spaces: uuid[], rooms: uuid[] }';
