-- Soft launch: product feedback + welcome email tracking. Additive only.

ALTER TABLE public.user_onboarding
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.product_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('feedback', 'bug', 'feature')),
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 3 AND 4000),
  page_path TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'resolved', 'wontfix')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_feedback_created_at_idx
  ON public.product_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS product_feedback_status_category_idx
  ON public.product_feedback(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS product_feedback_user_created_at_idx
  ON public.product_feedback(user_id, created_at DESC);

ALTER TABLE public.product_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_feedback_insert_own ON public.product_feedback;
CREATE POLICY product_feedback_insert_own ON public.product_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS product_feedback_select_own ON public.product_feedback;
CREATE POLICY product_feedback_select_own ON public.product_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
