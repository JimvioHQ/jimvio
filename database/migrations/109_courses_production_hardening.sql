-- Mirror of supabase/migrations/20260726120000_courses_production_hardening.sql

ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS trailer_url text;

ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS price_cents integer;

ALTER TABLE public.community_courses
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS last_position_seconds integer NOT NULL DEFAULT 0;

ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked', 'refunded', 'expired')),
  source text NOT NULL DEFAULT 'membership'
    CHECK (source IN ('free', 'membership', 'purchase', 'manual', 'staff')),
  order_id uuid,
  amount_cents integer,
  currency text,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_status
  ON public.course_enrollments (user_id, status, enrolled_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_status
  ON public.course_enrollments (course_id, status);

CREATE INDEX IF NOT EXISTS idx_community_courses_catalog
  ON public.community_courses (community_id, is_published, published_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_community_courses_category
  ON public.community_courses (category)
  WHERE category IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_community_courses_creator
  ON public.community_courses (creator_id, is_published);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_course_user
  ON public.lesson_progress (course_id, user_id);

CREATE INDEX IF NOT EXISTS idx_course_lessons_course_sort
  ON public.course_lessons (course_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_course_certificates_code
  ON public.course_certificates (certificate_code);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_enrollments'
      AND policyname = 'course_enrollments_select_own'
  ) THEN
    CREATE POLICY course_enrollments_select_own
      ON public.course_enrollments
      FOR SELECT
      TO authenticated
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.community_courses c
          WHERE c.id = course_enrollments.course_id
            AND c.creator_id = auth.uid()
        )
      );
  END IF;
END $$;

DROP POLICY IF EXISTS course_certificates_public_code ON public.course_certificates;
-- Public certificate verification uses the service-role API (no open SELECT policy).
