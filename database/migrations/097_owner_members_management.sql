-- Owner Console Members Management (additive, production-safe)
-- Invites, join requests, staff notes, moderation columns on memberships.
-- Does not alter Community Workspace UX or permission engine tables.

ALTER TABLE public.community_memberships
  ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;

ALTER TABLE public.community_memberships
  ADD COLUMN IF NOT EXISTS timeout_until TIMESTAMPTZ;

ALTER TABLE public.community_memberships
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

ALTER TABLE public.community_memberships
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;

ALTER TABLE public.community_memberships
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

ALTER TABLE public.community_memberships
  ADD COLUMN IF NOT EXISTS contribution_score INT NOT NULL DEFAULT 0;

ALTER TABLE public.community_memberships
  ADD COLUMN IF NOT EXISTS creator_score INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_community_memberships_community_status
  ON public.community_memberships(community_id, status);

CREATE INDEX IF NOT EXISTS idx_community_memberships_community_role
  ON public.community_memberships(community_id, role);

CREATE INDEX IF NOT EXISTS idx_community_memberships_last_active
  ON public.community_memberships(community_id, last_active_at DESC NULLS LAST);

-- Community invites (email / share link / QR)
CREATE TABLE IF NOT EXISTS public.community_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  max_uses INT,
  uses_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_invites_status_check'
  ) THEN
    ALTER TABLE public.community_invites
      ADD CONSTRAINT community_invites_status_check
      CHECK (status IN ('pending', 'accepted', 'expired', 'revoked', 'exhausted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_invites_community
  ON public.community_invites(community_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_invites_email
  ON public.community_invites(community_id, email)
  WHERE email IS NOT NULL;

-- Join request queue (private / approval communities)
CREATE TABLE IF NOT EXISTS public.community_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  referral_code TEXT,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_join_requests_status_check'
  ) THEN
    ALTER TABLE public.community_join_requests
      ADD CONSTRAINT community_join_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_join_requests_pending
  ON public.community_join_requests(community_id, status, created_at DESC);

-- Staff notes on members
CREATE TABLE IF NOT EXISTS public.community_member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.community_memberships(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_member_notes_membership
  ON public.community_member_notes(membership_id, created_at DESC);

-- Moderation audit log (best-effort inserts already used by legacy API)
CREATE TABLE IF NOT EXISTS public.community_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_moderation_logs_community
  ON public.community_moderation_logs(community_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_moderation_logs_target
  ON public.community_moderation_logs(community_id, target_user_id, created_at DESC);

-- RLS: staff manage via service role in Owner APIs; enable basic owner policies
ALTER TABLE public.community_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_member_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_moderation_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'community_invites_select_staff'
  ) THEN
    CREATE POLICY community_invites_select_staff ON public.community_invites
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.communities c
          WHERE c.id = community_id AND c.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.community_memberships m
          WHERE m.community_id = community_invites.community_id
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
    SELECT 1 FROM pg_policies WHERE policyname = 'community_join_requests_select_staff'
  ) THEN
    CREATE POLICY community_join_requests_select_staff ON public.community_join_requests
      FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.communities c
          WHERE c.id = community_id AND c.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.community_memberships m
          WHERE m.community_id = community_join_requests.community_id
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
    SELECT 1 FROM pg_policies WHERE policyname = 'community_member_notes_select_staff'
  ) THEN
    CREATE POLICY community_member_notes_select_staff ON public.community_member_notes
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.communities c
          WHERE c.id = community_id AND c.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.community_memberships m
          WHERE m.community_id = community_member_notes.community_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
            AND m.role IN ('owner', 'admin', 'moderator')
        )
      );
  END IF;
END $$;
