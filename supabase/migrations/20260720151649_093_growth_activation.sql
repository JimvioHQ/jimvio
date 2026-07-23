-- Growth activation and retention state. Additive only.

CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  welcome_completed_at TIMESTAMPTZ,
  welcome_intent TEXT CHECK (welcome_intent IN ('browse', 'create', 'sell', 'join') OR welcome_intent IS NULL),
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  tips_dismissed JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.growth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_daily BOOLEAN NOT NULL DEFAULT true,
  email_weekly_digest BOOLEAN NOT NULL DEFAULT true,
  email_achievements BOOLEAN NOT NULL DEFAULT true,
  email_reengagement BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS growth_events_name_created_at_idx
  ON public.growth_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS growth_events_user_created_at_idx
  ON public.growth_events(user_id, created_at DESC);

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- The API authenticates ownership before service-role event writes.
DROP POLICY IF EXISTS user_onboarding_select_own ON public.user_onboarding;
CREATE POLICY user_onboarding_select_own ON public.user_onboarding
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS user_onboarding_insert_own ON public.user_onboarding;
CREATE POLICY user_onboarding_insert_own ON public.user_onboarding
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS user_onboarding_update_own ON public.user_onboarding;
CREATE POLICY user_onboarding_update_own ON public.user_onboarding
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS growth_events_select_own ON public.growth_events;
CREATE POLICY growth_events_select_own ON public.growth_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS growth_events_insert_own ON public.growth_events;
CREATE POLICY growth_events_insert_own ON public.growth_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS growth_events_update_own ON public.growth_events;
CREATE POLICY growth_events_update_own ON public.growth_events
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notification_preferences_select_own ON public.notification_preferences;
CREATE POLICY notification_preferences_select_own ON public.notification_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS notification_preferences_insert_own ON public.notification_preferences;
CREATE POLICY notification_preferences_insert_own ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS notification_preferences_update_own ON public.notification_preferences;
CREATE POLICY notification_preferences_update_own ON public.notification_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
