-- Mirror: Didit KYC sessions + webhook idempotency
CREATE TABLE IF NOT EXISTS public.jip_didit_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id text NOT NULL,
  status text NOT NULL DEFAULT 'Not Started',
  workflow_id text,
  verification_url text,
  vendor_data text,
  last_event_id text,
  decision_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jip_didit_sessions_session_id_key UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS jip_didit_sessions_user_id_idx
  ON public.jip_didit_sessions (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.jip_didit_webhook_events (
  event_id text PRIMARY KEY,
  session_id text,
  webhook_type text,
  status text,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jip_didit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jip_didit_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jip_didit_sessions'
      AND policyname = 'jip_didit_sessions_select_own'
  ) THEN
    CREATE POLICY jip_didit_sessions_select_own
      ON public.jip_didit_sessions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

REVOKE ALL ON public.jip_didit_webhook_events FROM anon, authenticated;
GRANT SELECT ON public.jip_didit_sessions TO authenticated;
