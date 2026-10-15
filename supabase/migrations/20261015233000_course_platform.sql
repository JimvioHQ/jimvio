-- Course platform: access rules, outcomes, assignments, reviews, purchase receipts.
-- Existing enrollments stay valid when a course is unpublished or archived.

ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS learning_outcomes text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS prerequisites text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'members';

ALTER TABLE public.community_courses
  DROP CONSTRAINT IF EXISTS community_courses_access_mode_check;

ALTER TABLE public.community_courses
  ADD CONSTRAINT community_courses_access_mode_check
  CHECK (access_mode IN ('public', 'members', 'private'));

COMMENT ON COLUMN public.community_courses.access_mode IS
  'public: discoverable by anyone. members: joined community only. private: invitation enrollment only.';

CREATE INDEX IF NOT EXISTS idx_community_courses_discovery
  ON public.community_courses (is_published, access_mode, published_at DESC)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.course_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  instructions text,
  required boolean NOT NULL DEFAULT true,
  pass_score numeric(5,2) NOT NULL DEFAULT 70 CHECK (pass_score >= 0 AND pass_score <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_assignments_course
  ON public.course_assignments (course_id);

CREATE TABLE IF NOT EXISTS public.course_assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.course_assignments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'graded', 'returned')),
  score numeric(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  feedback text,
  graded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_assignment_submissions_course
  ON public.course_assignment_submissions (course_id, user_id);

CREATE TABLE IF NOT EXISTS public.course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_reviews_course
  ON public.course_reviews (course_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.course_purchase_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_reference text NOT NULL UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  provider text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_purchase_receipts_user
  ON public.course_purchase_receipts (user_id, created_at DESC);

ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_purchase_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_assignments_read ON public.course_assignments;
CREATE POLICY course_assignments_read ON public.course_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_courses c
      JOIN public.communities com ON com.id = c.community_id
      WHERE c.id = course_assignments.course_id
        AND (c.creator_id = auth.uid() OR com.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.course_enrollments e
      WHERE e.course_id = course_assignments.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS course_assignment_submissions_read ON public.course_assignment_submissions;
CREATE POLICY course_assignment_submissions_read ON public.course_assignment_submissions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_courses c
      JOIN public.communities com ON com.id = c.community_id
      WHERE c.id = course_assignment_submissions.course_id
        AND (c.creator_id = auth.uid() OR com.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS course_reviews_read ON public.course_reviews;
CREATE POLICY course_reviews_read ON public.course_reviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_courses c
      WHERE c.id = course_reviews.course_id
        AND c.is_published = true
        AND c.archived_at IS NULL
        AND c.access_mode <> 'private'
    )
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_courses c
      JOIN public.communities com ON com.id = c.community_id
      WHERE c.id = course_reviews.course_id
        AND (c.creator_id = auth.uid() OR com.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS course_reviews_write_own ON public.course_reviews;
CREATE POLICY course_reviews_write_own ON public.course_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.course_enrollments e
      WHERE e.course_id = course_reviews.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS course_reviews_update_own ON public.course_reviews;
CREATE POLICY course_reviews_update_own ON public.course_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS course_purchase_receipts_own ON public.course_purchase_receipts;
CREATE POLICY course_purchase_receipts_own ON public.course_purchase_receipts
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_courses c
      WHERE c.id = course_purchase_receipts.course_id
        AND c.creator_id = auth.uid()
    )
  );
