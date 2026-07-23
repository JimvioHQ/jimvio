-- Synced from database/migrations/095_owner_groups_management.sql for Supabase CLI / Preview.
-- Idempotent / additive; safe if already applied on production.
-- Owner Console Groups Management (additive, production-safe)
-- Extends spaces with branding, privacy, status flags, permission/default config,
-- and space_staff for group-level moderators. Does not alter Community Workspace UX.

-- ─── spaces: management columns ─────────────────────────────────────────────
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS privacy TEXT NOT NULL DEFAULT 'public';

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS welcome_message TEXT;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS rules TEXT;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS permission_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS default_content JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spaces_privacy_check'
  ) THEN
    ALTER TABLE public.spaces
      ADD CONSTRAINT spaces_privacy_check
      CHECK (privacy IN ('public', 'private', 'invite_only', 'hidden'));
  END IF;
END $$;

-- Backfill privacy from legacy access_type where still default public
UPDATE public.spaces
SET privacy = CASE
  WHEN access_type IN ('paid', 'private') THEN 'private'
  WHEN access_type IN ('premium', 'invite_only') THEN 'invite_only'
  WHEN is_hidden = true THEN 'hidden'
  ELSE 'public'
END
WHERE privacy = 'public'
  AND (
    access_type IN ('paid', 'private', 'premium', 'invite_only')
    OR is_hidden = true
  );

CREATE INDEX IF NOT EXISTS idx_spaces_community_sort
  ON public.spaces(community_id, sort_order ASC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spaces_community_active
  ON public.spaces(community_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_spaces_community_featured
  ON public.spaces(community_id)
  WHERE is_featured = true;

-- ─── space_staff: group moderators / local admins ───────────────────────────
CREATE TABLE IF NOT EXISTS public.space_staff (
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_role TEXT NOT NULL DEFAULT 'moderator',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id),
  CONSTRAINT space_staff_role_check CHECK (staff_role IN ('moderator', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_space_staff_user
  ON public.space_staff(user_id);

ALTER TABLE public.space_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "space_staff_visible_to_members" ON public.space_staff;
CREATE POLICY "space_staff_visible_to_members"
  ON public.space_staff FOR SELECT
  USING (
    space_id IN (
      SELECT s.id FROM public.spaces s
      WHERE s.community_id IN (
        SELECT id FROM public.communities WHERE owner_id = auth.uid()
      )
      OR s.community_id IN (
        SELECT community_id FROM public.community_memberships
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "owners_manage_space_staff" ON public.space_staff;
CREATE POLICY "owners_manage_space_staff"
  ON public.space_staff FOR ALL
  USING (
    space_id IN (
      SELECT s.id FROM public.spaces s
      JOIN public.communities c ON c.id = s.community_id
      WHERE c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    space_id IN (
      SELECT s.id FROM public.spaces s
      JOIN public.communities c ON c.id = s.community_id
      WHERE c.owner_id = auth.uid()
    )
  );

-- Allow community admins (not only owners) to manage spaces via RLS
DROP POLICY IF EXISTS "admins_manage_spaces" ON public.spaces;
CREATE POLICY "admins_manage_spaces"
  ON public.spaces FOR ALL
  USING (
    community_id IN (
      SELECT community_id FROM public.community_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    community_id IN (
      SELECT community_id FROM public.community_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "admins_manage_rooms" ON public.rooms;
CREATE POLICY "admins_manage_rooms"
  ON public.rooms FOR ALL
  USING (
    community_id IN (
      SELECT community_id FROM public.community_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    community_id IN (
      SELECT community_id FROM public.community_memberships
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );
