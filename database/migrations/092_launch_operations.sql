-- Launch & Operations Sprint. Additive only: no Community or Marketplace tables are altered.

CREATE TABLE IF NOT EXISTS public.admin_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  rollout_percent INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.growth_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  channel TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.growth_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.growth_campaigns(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  inviter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invitee_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ops_alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_events_created_at_idx
  ON public.admin_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS growth_campaigns_status_idx
  ON public.growth_campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS growth_invites_code_idx
  ON public.growth_invites(code);
CREATE INDEX IF NOT EXISTS growth_invites_campaign_idx
  ON public.growth_invites(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ops_alert_events_open_idx
  ON public.ops_alert_events(created_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_alert_events ENABLE ROW LEVEL SECURITY;

-- Service-role writes these tables. Authenticated admins may read.
DROP POLICY IF EXISTS admin_audit_events_admin_select ON public.admin_audit_events;
CREATE POLICY admin_audit_events_admin_select ON public.admin_audit_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
  ));

DROP POLICY IF EXISTS platform_feature_flags_admin_select ON public.platform_feature_flags;
CREATE POLICY platform_feature_flags_admin_select ON public.platform_feature_flags
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
  ));

DROP POLICY IF EXISTS growth_campaigns_admin_select ON public.growth_campaigns;
CREATE POLICY growth_campaigns_admin_select ON public.growth_campaigns
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
  ));

DROP POLICY IF EXISTS growth_invites_admin_select ON public.growth_invites;
CREATE POLICY growth_invites_admin_select ON public.growth_invites
  FOR SELECT TO authenticated
  USING (
    inviter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

DROP POLICY IF EXISTS ops_alert_events_admin_select ON public.ops_alert_events;
CREATE POLICY ops_alert_events_admin_select ON public.ops_alert_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
  ));

-- Harden user_roles: authenticated users may only read their own roles.
-- Inserts/updates for privilege elevation must go through service role.
DROP POLICY IF EXISTS "users_manage_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS users_manage_own_roles ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
