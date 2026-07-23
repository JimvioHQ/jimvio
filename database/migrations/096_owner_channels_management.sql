-- Owner Console Channels Management (additive, production-safe)
-- Extends rooms with branding, visibility, status flags, permission/behavior/
-- automation config, and room_staff. Does not alter ChatRoom or Workspace UX.

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS emoji TEXT;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'members';

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS welcome_message TEXT;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS permission_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS behavior_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS automation_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS message_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS member_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS pinned_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS channel_kind TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rooms_visibility_check'
  ) THEN
    ALTER TABLE public.rooms
      ADD CONSTRAINT rooms_visibility_check
      CHECK (visibility IN ('public', 'members', 'private', 'invite_only', 'hidden'));
  END IF;
END $$;

-- Backfill visibility from access_type
UPDATE public.rooms
SET visibility = CASE
  WHEN access_type IN ('free', 'public') THEN 'public'
  WHEN access_type IN ('paid', 'private') THEN 'private'
  WHEN access_type IN ('premium', 'invite_only') THEN 'invite_only'
  WHEN is_hidden = true THEN 'hidden'
  ELSE 'members'
END
WHERE visibility = 'members'
  AND (
    access_type IN ('free', 'public', 'paid', 'private', 'premium', 'invite_only')
    OR is_hidden = true
  );

CREATE INDEX IF NOT EXISTS idx_rooms_community_sort
  ON public.rooms(community_id, space_id, sort_order ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_rooms_community_active
  ON public.rooms(community_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rooms_space_active
  ON public.rooms(space_id, is_active, sort_order);

-- room_staff: channel moderators
CREATE TABLE IF NOT EXISTS public.room_staff (
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_role TEXT NOT NULL DEFAULT 'moderator',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id),
  CONSTRAINT room_staff_role_check CHECK (staff_role IN ('moderator', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_room_staff_user ON public.room_staff(user_id);

ALTER TABLE public.room_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_staff_visible_to_members" ON public.room_staff;
CREATE POLICY "room_staff_visible_to_members"
  ON public.room_staff FOR SELECT
  USING (
    room_id IN (
      SELECT r.id FROM public.rooms r
      WHERE r.community_id IN (
        SELECT id FROM public.communities WHERE owner_id = auth.uid()
      )
      OR r.community_id IN (
        SELECT community_id FROM public.community_memberships
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "owners_manage_room_staff" ON public.room_staff;
CREATE POLICY "owners_manage_room_staff"
  ON public.room_staff FOR ALL
  USING (
    room_id IN (
      SELECT r.id FROM public.rooms r
      JOIN public.communities c ON c.id = r.community_id
      WHERE c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    room_id IN (
      SELECT r.id FROM public.rooms r
      JOIN public.communities c ON c.id = r.community_id
      WHERE c.owner_id = auth.uid()
    )
  );
