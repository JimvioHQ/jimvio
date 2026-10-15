-- Events lifecycle, mission submissions, and physical-selling review metadata.
-- Public listings stay limited to published public events. Invitation tokens are hashed.

ALTER TABLE public.community_events
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS venue TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS host_name TEXT,
  ADD COLUMN IF NOT EXISTS registration_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS invite_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS invite_token TEXT,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

UPDATE public.community_events
SET
  status = CASE WHEN is_published THEN 'published' ELSE 'draft' END,
  format = CASE WHEN is_online THEN 'online' ELSE 'in_person' END
WHERE status IS NULL OR status = 'published';

ALTER TABLE public.community_events
  DROP CONSTRAINT IF EXISTS community_events_visibility_check;
ALTER TABLE public.community_events
  ADD CONSTRAINT community_events_visibility_check
  CHECK (visibility IN ('public', 'private'));

ALTER TABLE public.community_events
  DROP CONSTRAINT IF EXISTS community_events_status_check;
ALTER TABLE public.community_events
  ADD CONSTRAINT community_events_status_check
  CHECK (status IN ('draft', 'published', 'cancelled', 'completed'));

ALTER TABLE public.community_events
  DROP CONSTRAINT IF EXISTS community_events_format_check;
ALTER TABLE public.community_events
  ADD CONSTRAINT community_events_format_check
  CHECK (format IN ('online', 'in_person', 'hybrid'));

CREATE INDEX IF NOT EXISTS idx_community_events_public_starts
  ON public.community_events (starts_at)
  WHERE visibility = 'public' AND status = 'published';

CREATE TABLE IF NOT EXISTS public.community_event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_event_invites_event
  ON public.community_event_invites (event_id, created_at DESC);

ALTER TABLE public.community_event_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers read community events" ON public.community_events;
CREATE POLICY "Managers read community events"
  ON public.community_events FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_events.community_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.community_memberships m
      WHERE m.community_id = community_events.community_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Members can read published community events" ON public.community_events;
CREATE POLICY "Members can read published community events"
  ON public.community_events FOR SELECT
  USING (
    status = 'published'
    AND visibility = 'public'
    AND (
      EXISTS (
        SELECT 1 FROM public.community_memberships m
        WHERE m.community_id = community_events.community_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.communities c
        WHERE c.id = community_events.community_id
          AND c.visibility = 'public'
          AND COALESCE(c.is_active, true)
      )
    )
  );

-- Missions: extend community tasks rather than a parallel table.
ALTER TABLE public.community_tasks
  ALTER COLUMN room_id DROP NOT NULL;

ALTER TABLE public.community_tasks
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'community',
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS completion_criteria TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_participants INT,
  ADD COLUMN IF NOT EXISTS submission_kind TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS review_mode TEXT NOT NULL DEFAULT 'review',
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS reward_type TEXT NOT NULL DEFAULT 'points',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.community_tasks
SET status = CASE WHEN COALESCE(is_active, true) THEN 'published' ELSE 'paused' END
WHERE status IS NULL OR status = '';

ALTER TABLE public.community_tasks
  DROP CONSTRAINT IF EXISTS community_tasks_status_check;
ALTER TABLE public.community_tasks
  ADD CONSTRAINT community_tasks_status_check
  CHECK (status IN ('draft', 'published', 'paused', 'completed', 'cancelled'));

ALTER TABLE public.community_tasks
  DROP CONSTRAINT IF EXISTS community_tasks_visibility_check;
ALTER TABLE public.community_tasks
  ADD CONSTRAINT community_tasks_visibility_check
  CHECK (visibility IN ('public', 'community'));

ALTER TABLE public.community_tasks
  DROP CONSTRAINT IF EXISTS community_tasks_submission_kind_check;
ALTER TABLE public.community_tasks
  ADD CONSTRAINT community_tasks_submission_kind_check
  CHECK (submission_kind IN ('none', 'text', 'link', 'file'));

ALTER TABLE public.community_tasks
  DROP CONSTRAINT IF EXISTS community_tasks_review_mode_check;
ALTER TABLE public.community_tasks
  ADD CONSTRAINT community_tasks_review_mode_check
  CHECK (review_mode IN ('auto', 'review'));

ALTER TABLE public.community_tasks
  DROP CONSTRAINT IF EXISTS community_tasks_reward_type_check;
ALTER TABLE public.community_tasks
  ADD CONSTRAINT community_tasks_reward_type_check
  CHECK (reward_type IN ('points', 'none'));

CREATE INDEX IF NOT EXISTS idx_community_tasks_status_due
  ON public.community_tasks (status, due_date);

ALTER TABLE public.task_completions
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DELETE FROM public.task_completions a
USING public.task_completions b
WHERE a.task_id = b.task_id
  AND a.user_id = b.user_id
  AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS task_completions_task_user_uidx
  ON public.task_completions (task_id, user_id);

-- Physical selling review metadata. Approval remains vendors.verification_status.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS physical_selling_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS physical_selling_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS physical_selling_reviewed_by UUID;

CREATE INDEX IF NOT EXISTS idx_vendors_physical_selling_requested
  ON public.vendors (physical_selling_requested_at)
  WHERE physical_selling_requested_at IS NOT NULL;
