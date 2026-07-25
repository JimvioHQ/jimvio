-- Owner Console Moderation Center (additive, production-safe)
-- Extends content reports, adds appeals + auto-mod rules.
-- Authorization still resolves through workspace capabilities.

-- Enrich community_content_reports for enterprise queues
ALTER TABLE public.community_content_reports
  ADD COLUMN IF NOT EXISTS reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.community_content_reports
  ADD COLUMN IF NOT EXISTS queue TEXT NOT NULL DEFAULT 'reports';

ALTER TABLE public.community_content_reports
  ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE public.community_content_reports
  ADD COLUMN IF NOT EXISTS ai_classification JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.community_content_reports
  ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.community_content_reports
  ADD COLUMN IF NOT EXISTS content_preview TEXT;

ALTER TABLE public.community_content_reports
  ADD COLUMN IF NOT EXISTS assigned_moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.community_content_reports
  ADD COLUMN IF NOT EXISTS internal_note TEXT;

ALTER TABLE public.community_content_reports
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.community_content_reports
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.community_content_reports
  ADD COLUMN IF NOT EXISTS content_deleted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_content_reports_queue_check'
  ) THEN
    ALTER TABLE public.community_content_reports
      ADD CONSTRAINT community_content_reports_queue_check
      CHECK (queue IN (
        'reports','messages','posts','files','spam','scam'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_content_reports_risk_check'
  ) THEN
    ALTER TABLE public.community_content_reports
      ADD CONSTRAINT community_content_reports_risk_check
      CHECK (risk_level IN ('low','medium','high','critical'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_content_reports_queue
  ON public.community_content_reports(community_id, queue, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_content_reports_assigned
  ON public.community_content_reports(assigned_moderator_id)
  WHERE assigned_moderator_id IS NOT NULL;

-- Appeals queue
CREATE TABLE IF NOT EXISTS public.community_moderation_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.community_memberships(id) ON DELETE SET NULL,
  appellant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  related_log_id UUID REFERENCES public.community_moderation_logs(id) ON DELETE SET NULL,
  related_report_id UUID REFERENCES public.community_content_reports(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_review','approved','rejected','resolved')),
  reason TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_moderation_appeals_community
  ON public.community_moderation_appeals(community_id, status, created_at DESC);

-- Auto-moderation rules (future-ready AI hooks via config JSON)
CREATE TABLE IF NOT EXISTS public.community_auto_moderation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  action TEXT NOT NULL DEFAULT 'flag'
    CHECK (action IN ('flag','warn','mute','delete','escalate')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, rule_key)
);

CREATE INDEX IF NOT EXISTS idx_community_auto_mod_rules_community
  ON public.community_auto_moderation_rules(community_id, enabled, rule_key);

ALTER TABLE public.community_moderation_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_auto_moderation_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'community_moderation_appeals_select_staff'
  ) THEN
    CREATE POLICY community_moderation_appeals_select_staff
      ON public.community_moderation_appeals
      FOR SELECT USING (
        appellant_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.communities c
          WHERE c.id = community_id AND c.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.community_memberships m
          WHERE m.community_id = community_moderation_appeals.community_id
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
    SELECT 1 FROM pg_policies WHERE policyname = 'community_auto_mod_rules_select_staff'
  ) THEN
    CREATE POLICY community_auto_mod_rules_select_staff
      ON public.community_auto_moderation_rules
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.communities c
          WHERE c.id = community_id AND c.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.community_memberships m
          WHERE m.community_id = community_auto_moderation_rules.community_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
            AND m.role IN ('owner', 'admin', 'moderator')
        )
      );
  END IF;
END $$;
