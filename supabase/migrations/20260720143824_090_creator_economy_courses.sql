-- Creator Economy v1 — Phase 3: Courses (additive)
ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.course_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  pass_score NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK (pass_score >= 0 AND pass_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lesson_id)
);

CREATE TABLE IF NOT EXISTS public.course_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  certificate_code TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url TEXT,
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_quizzes_course ON public.course_quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_quiz_attempts_user ON public.course_quiz_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_certificates_user ON public.course_certificates(user_id, issued_at DESC);

ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_quizzes_select ON public.course_quizzes;
CREATE POLICY course_quizzes_select ON public.course_quizzes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.community_courses c
    WHERE c.id = course_quizzes.course_id
      AND (c.creator_id = auth.uid() OR c.is_published = true)
  )
);

DROP POLICY IF EXISTS course_quizzes_creator_write ON public.course_quizzes;
CREATE POLICY course_quizzes_creator_write ON public.course_quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.community_courses c WHERE c.id = course_quizzes.course_id AND c.creator_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.community_courses c WHERE c.id = course_quizzes.course_id AND c.creator_id = auth.uid())
);

DROP POLICY IF EXISTS course_quiz_attempts_own ON public.course_quiz_attempts;
CREATE POLICY course_quiz_attempts_own ON public.course_quiz_attempts FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS course_quiz_attempts_insert ON public.course_quiz_attempts;
CREATE POLICY course_quiz_attempts_insert ON public.course_quiz_attempts FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS course_certificates_own ON public.course_certificates;
CREATE POLICY course_certificates_own ON public.course_certificates FOR SELECT USING (user_id = auth.uid());
