-- Owner Console Roles & Permissions (additive, production-safe)
-- Custom roles, scoped grants, membership link, role audit trail.
-- Does not alter Community Workspace UX. Authorization still resolves
-- through lib/community/workspace/permissions.ts capabilities.

CREATE TABLE IF NOT EXISTS public.community_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  priority INT NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'staff',
  inherits_from TEXT NOT NULL DEFAULT 'member',
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  group_ids UUID[] NOT NULL DEFAULT '{}',
  channel_ids UUID[] NOT NULL DEFAULT '{}',
  is_default_assignment BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  template_key TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, slug)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_custom_roles_visibility_check'
  ) THEN
    ALTER TABLE public.community_custom_roles
      ADD CONSTRAINT community_custom_roles_visibility_check
      CHECK (visibility IN ('public', 'staff', 'hidden'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_custom_roles_inherits_check'
  ) THEN
    ALTER TABLE public.community_custom_roles
      ADD CONSTRAINT community_custom_roles_inherits_check
      CHECK (inherits_from IN (
        'owner','admin','moderator','creator','mentor','verified','vip','member','guest'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_custom_roles_community
  ON public.community_custom_roles(community_id, priority DESC, name);

ALTER TABLE public.community_memberships
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.community_custom_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_community_memberships_custom_role
  ON public.community_memberships(custom_role_id)
  WHERE custom_role_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.community_role_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  role_id UUID,
  role_name TEXT,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_role_audit_community
  ON public.community_role_audit_logs(community_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_role_audit_action
  ON public.community_role_audit_logs(community_id, action);

ALTER TABLE public.community_custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_role_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'community_custom_roles_select_staff'
  ) THEN
    CREATE POLICY community_custom_roles_select_staff ON public.community_custom_roles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.communities c
          WHERE c.id = community_id AND c.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.community_memberships m
          WHERE m.community_id = community_custom_roles.community_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
            AND m.role IN ('owner', 'admin', 'moderator')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'community_role_audit_select_staff'
  ) THEN
    CREATE POLICY community_role_audit_select_staff ON public.community_role_audit_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.communities c
          WHERE c.id = community_id AND c.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.community_memberships m
          WHERE m.community_id = community_role_audit_logs.community_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
            AND m.role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;
