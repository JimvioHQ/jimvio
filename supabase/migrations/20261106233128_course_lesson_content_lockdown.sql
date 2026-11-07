-- Course lessons: the policy course_lessons_select (USING true) let anyone read every
-- lesson row through the public API, including the paid content itself (body,
-- video_url, attachments) of published courses, without enrolment or payment.
-- The course player, owner console and progress APIs read lessons server-side with
-- the service role after their own access checks (services/creator-economy/courses.ts,
-- app/api/courses/**), so API roles keep only the outline columns (title, order,
-- duration, is_free) used for curriculum previews and search.
-- Nothing is deleted; RLS policies are unchanged.
--
-- Rollback: grant select on public.course_lessons to anon, authenticated;
do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'course_lessons'
    and column_name not in ('body', 'video_url', 'attachments');
  execute 'revoke select on public.course_lessons from anon, authenticated';
  execute format('grant select (%s) on public.course_lessons to anon, authenticated', v_cols);
end $$;
