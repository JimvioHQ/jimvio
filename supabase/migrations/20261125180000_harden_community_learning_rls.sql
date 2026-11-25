-- Tighten Community learning and mission reads without changing application flows.
-- The hub APIs use authenticated server-side access and the course service role;
-- browser roles should only see published courses they are allowed to access.
-- No rows are deleted or modified.

begin;

-- Remove legacy permissive SELECT policies. PostgreSQL combines permissive
-- policies with OR, so these USING (true) policies bypass narrower policies.
drop policy if exists community_courses_select on public.community_courses;
drop policy if exists course_modules_select on public.course_modules;
drop policy if exists community_tasks_select on public.community_tasks;

-- Keep course visibility aligned with the access modes used by the hub:
-- public courses are readable; member courses require an active membership;
-- private courses remain limited to their creator/community owner.
drop policy if exists courses_visible_to_members on public.community_courses;
create policy courses_visible_to_members
on public.community_courses
for select
using (
  is_published = true
  and archived_at is null
  and (
    creator_id = auth.uid()
    or exists (
      select 1
      from public.communities c
      where c.id = community_courses.community_id
        and c.owner_id = auth.uid()
    )
    or access_mode = 'public'
    or (
      coalesce(access_mode, 'members') <> 'private'
      and exists (
        select 1
        from public.community_memberships cm
        where cm.community_id = community_courses.community_id
          and cm.user_id = auth.uid()
          and cm.status = 'active'
      )
    )
  )
);

-- Course modules inherit the parent course's visibility. This prevents an
-- authenticated/anonymous client from enumerating modules for private courses.
drop policy if exists modules_follow_course_access on public.course_modules;
create policy modules_follow_course_access
on public.course_modules
for select
using (
  exists (
    select 1
    from public.community_courses cc
    where cc.id = course_modules.course_id
      and cc.is_published = true
      and cc.archived_at is null
      and (
        cc.creator_id = auth.uid()
        or exists (
          select 1
          from public.communities c
          where c.id = cc.community_id
            and c.owner_id = auth.uid()
        )
        or cc.access_mode = 'public'
        or (
          coalesce(cc.access_mode, 'members') <> 'private'
          and exists (
            select 1
            from public.community_memberships cm
            where cm.community_id = cc.community_id
              and cm.user_id = auth.uid()
              and cm.status = 'active'
          )
        )
      )
  )
);

-- These tables are not directly writable by unauthenticated clients.
-- Public course/module reads remain governed by the RLS policies above.
revoke all privileges on table public.community_courses from anon;
revoke all privileges on table public.course_modules from anon;
revoke all privileges on table public.community_tasks from anon;
grant select on table public.community_courses to anon;
grant select on table public.course_modules to anon;

commit;
