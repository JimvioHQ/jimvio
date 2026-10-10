-- Mirror of supabase/migrations/20261010190000_support_agents.sql
-- Apply the supabase migration only. Do not apply this file as a second migration.

CREATE TABLE IF NOT EXISTS public.support_agent_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 80),
  support_role TEXT NOT NULL DEFAULT 'customer_support' CHECK (support_role IN ('customer_support', 'senior_support')),
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  eligible BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS handoff_notified_at TIMESTAMPTZ;

ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS agent_joined_at TIMESTAMPTZ;

ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS agent_joined_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.support_conversation_messages
  ADD COLUMN IF NOT EXISTS author_display_name TEXT;

ALTER TABLE public.support_agent_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.support_agent_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.support_agent_profiles TO authenticated;

DROP POLICY IF EXISTS support_agent_profiles_select ON public.support_agent_profiles;
CREATE POLICY support_agent_profiles_select ON public.support_agent_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.role = 'admin'
    )
  );
