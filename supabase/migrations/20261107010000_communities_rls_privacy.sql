-- Communities RLS & privacy hardening.
--
-- Several tables had a scoped SELECT policy PLUS a catch-all "USING (true)" policy.
-- Policies are OR-ed, so the catch-all silently overrode the scoped one. This
-- migration removes each catch-all and keeps (or adds) a scoped policy that matches
-- the existing privacy model (lib/community/join-policy.ts):
--   public      -> discoverable; content readable by anyone
--   private     -> profile visible (people must be able to request to join);
--                  content, rooms, spaces, points and engagement members-only
--   invite_only / hidden, inactive or archived -> visible only to owner and members
-- Admin tools use the service role and are unaffected. No data is deleted.
--
-- Rollback: see the "rollback" block at the end of this file (re-creates the
-- removed policies exactly as they were).

-- 1. communities: replace USING (true)
drop policy if exists communities_select on public.communities;
create policy communities_select on public.communities
  for select
  using (
    (
      is_active is true
      and archived_at is null
      and lower(coalesce(nullif(btrim(visibility_mode), ''), nullif(btrim(visibility), ''),
                         case when is_private then 'private' else 'public' end)) in ('public', 'private')
    )
    or owner_id = (select auth.uid())
  );
-- Members of any community (including private / hidden / inactive ones) keep seeing it.
-- private.is_active_community_member is the existing helper used by the memberships
-- policies (no new SECURITY DEFINER function); anon has no access to it, hence a
-- separate policy for signed-in users.
drop policy if exists communities_select_members on public.communities;
create policy communities_select_members on public.communities
  for select to authenticated
  using (private.is_active_community_member(id, (select auth.uid())));

-- 2. spaces / rooms: drop USING (true); the existing spaces_visible_to_members /
--    rooms_visible_to_members (public community, owner, or active member) and the
--    owner/admin manage policies remain.
drop policy if exists spaces_select on public.spaces;
drop policy if exists rooms_select on public.rooms;

-- 3. member_points: drop USING (true); members and the user themself keep access
--    (leaderboard_public_read); leaderboards of public, active communities stay public.
--    Points are awarded server-side only (services/communityService.ts awardPoints,
--    service role), so the self-insert / self-update policies that let any user
--    raise their own points are removed.
drop policy if exists member_points_select on public.member_points;
drop policy if exists member_points_insert on public.member_points;
drop policy if exists member_points_update on public.member_points;
create policy member_points_public_communities on public.member_points
  for select
  using (
    community_id in (
      select c.id from public.communities c
      where c.is_active is true and c.archived_at is null and coalesce(c.is_private, false) = false
        and lower(coalesce(nullif(btrim(c.visibility_mode), ''), nullif(btrim(c.visibility), ''), 'public')) = 'public'
    )
    or community_id in (select c.id from public.communities c where c.owner_id = (select auth.uid()))
  );

-- 4. Engagement follows post / comment visibility: a like, reaction or share is
--    readable exactly when the post (or comment) it belongs to is readable by the
--    caller under the existing community_posts / community_post_comments policies.
--    Users always see their own rows (existing *_own policies).
drop policy if exists community_post_likes_select on public.community_post_likes;
drop policy if exists post_likes_public_read on public.community_post_likes;
create policy community_post_likes_select on public.community_post_likes
  for select using (post_id in (select p.id from public.community_posts p));

drop policy if exists post_reactions_select on public.community_post_reactions;
create policy post_reactions_select on public.community_post_reactions
  for select to authenticated using (post_id in (select p.id from public.community_posts p));

drop policy if exists post_shares_select on public.community_post_shares;
create policy post_shares_select on public.community_post_shares
  for select to authenticated using (user_id = (select auth.uid()) or post_id in (select p.id from public.community_posts p));

drop policy if exists comment_likes_select on public.community_comment_likes;
create policy comment_likes_select on public.community_comment_likes
  for select to authenticated using (comment_id in (select c.id from public.community_post_comments c));

-- 5. community_tasks: drop USING (true); members (tasks_visible_to_members) and
--    creators/owners (creators_manage_tasks) keep access; active tasks of public,
--    active communities stay public.
drop policy if exists community_tasks_select on public.community_tasks;
create policy community_tasks_public_communities on public.community_tasks
  for select
  using (
    is_active is true
    and community_id in (
      select c.id from public.communities c
      where c.is_active is true and c.archived_at is null and coalesce(c.is_private, false) = false
        and lower(coalesce(nullif(btrim(c.visibility_mode), ''), nullif(btrim(c.visibility), ''), 'public')) = 'public'
    )
  );

/* rollback (run manually if ever needed):
drop policy if exists communities_select on public.communities;
drop policy if exists communities_select_members on public.communities;
create policy communities_select on public.communities for select using (true);
create policy spaces_select on public.spaces for select using (true);
create policy rooms_select on public.rooms for select using (true);
drop policy if exists member_points_public_communities on public.member_points;
create policy member_points_select on public.member_points for select using (true);
create policy member_points_insert on public.member_points for insert with check ((select auth.uid()) = user_id);
create policy member_points_update on public.member_points for update using ((select auth.uid()) = user_id);
drop policy if exists community_post_likes_select on public.community_post_likes;
create policy community_post_likes_select on public.community_post_likes for select using (true);
create policy post_likes_public_read on public.community_post_likes for select using (true);
drop policy if exists post_reactions_select on public.community_post_reactions;
create policy post_reactions_select on public.community_post_reactions for select to authenticated using (true);
drop policy if exists post_shares_select on public.community_post_shares;
create policy post_shares_select on public.community_post_shares for select to authenticated using (true);
drop policy if exists comment_likes_select on public.community_comment_likes;
create policy comment_likes_select on public.community_comment_likes for select to authenticated using (true);
drop policy if exists community_tasks_public_communities on public.community_tasks;
create policy community_tasks_select on public.community_tasks for select using (true);
*/
