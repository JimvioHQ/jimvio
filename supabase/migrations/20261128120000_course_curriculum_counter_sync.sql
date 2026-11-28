-- Keep denormalized course counters synchronized with the authoritative curriculum rows.
-- Additive and data-preserving: no course, module, lesson, quiz, assignment, or enrollment is removed.

CREATE OR REPLACE FUNCTION public.refresh_community_course_totals(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_courses AS course
  SET
    total_modules = (
      SELECT count(*)::integer
      FROM public.course_modules AS module
      WHERE module.course_id = p_course_id
    ),
    total_lessons = (
      SELECT count(*)::integer
      FROM public.course_lessons AS lesson
      WHERE lesson.course_id = p_course_id
    ),
    total_duration = COALESCE((
      SELECT sum(GREATEST(COALESCE(lesson.duration, 0), 0))::integer
      FROM public.course_lessons AS lesson
      WHERE lesson.course_id = p_course_id
    ), 0),
    updated_at = now()
  WHERE course.id = p_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_community_course_totals_from_curriculum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_community_course_totals(OLD.course_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.course_id IS DISTINCT FROM NEW.course_id THEN
    PERFORM public.refresh_community_course_totals(OLD.course_id);
  END IF;

  PERFORM public.refresh_community_course_totals(NEW.course_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_modules_sync_totals ON public.course_modules;
CREATE TRIGGER course_modules_sync_totals
AFTER INSERT OR UPDATE OR DELETE ON public.course_modules
FOR EACH ROW EXECUTE FUNCTION public.sync_community_course_totals_from_curriculum();

DROP TRIGGER IF EXISTS course_lessons_sync_totals ON public.course_lessons;
CREATE TRIGGER course_lessons_sync_totals
AFTER INSERT OR UPDATE OR DELETE ON public.course_lessons
FOR EACH ROW EXECUTE FUNCTION public.sync_community_course_totals_from_curriculum();

-- Repair historical stale counters from the actual curriculum without touching content.
UPDATE public.community_courses AS course
SET
  total_modules = (
    SELECT count(*)::integer
    FROM public.course_modules AS module
    WHERE module.course_id = course.id
  ),
  total_lessons = (
    SELECT count(*)::integer
    FROM public.course_lessons AS lesson
    WHERE lesson.course_id = course.id
  ),
  total_duration = COALESCE((
    SELECT sum(GREATEST(COALESCE(lesson.duration, 0), 0))::integer
    FROM public.course_lessons AS lesson
    WHERE lesson.course_id = course.id
  ), 0),
  updated_at = now()
WHERE
  course.total_modules IS DISTINCT FROM (
    SELECT count(*)::integer FROM public.course_modules AS module WHERE module.course_id = course.id
  )
  OR course.total_lessons IS DISTINCT FROM (
    SELECT count(*)::integer FROM public.course_lessons AS lesson WHERE lesson.course_id = course.id
  )
  OR course.total_duration IS DISTINCT FROM COALESCE((
    SELECT sum(GREATEST(COALESCE(lesson.duration, 0), 0))::integer
    FROM public.course_lessons AS lesson
    WHERE lesson.course_id = course.id
  ), 0);
