-- Keep the cached community post count in sync with published posts.
-- This is an aggregate counter correction only; no post content is modified.
create or replace function public.sync_community_post_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  old_is_counted boolean := false;
  new_is_counted boolean := false;
begin
  if tg_op <> 'INSERT' then
    old_is_counted := coalesce(old.is_published, false);
  end if;

  if tg_op <> 'DELETE' then
    new_is_counted := coalesce(new.is_published, false);
  end if;

  if tg_op = 'INSERT' then
    if new_is_counted then
      update public.communities
      set post_count = coalesce(post_count, 0) + 1
      where id = new.community_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old_is_counted then
      update public.communities
      set post_count = greatest(0, coalesce(post_count, 0) - 1)
      where id = old.community_id;
    end if;
    return old;
  end if;

  if old_is_counted and (
    not new_is_counted
    or old.community_id is distinct from new.community_id
  ) then
    update public.communities
    set post_count = greatest(0, coalesce(post_count, 0) - 1)
    where id = old.community_id;
  end if;

  if new_is_counted and (
    not old_is_counted
    or old.community_id is distinct from new.community_id
  ) then
    update public.communities
    set post_count = coalesce(post_count, 0) + 1
    where id = new.community_id;
  end if;

  return new;
end;
$function$;

revoke all on function public.sync_community_post_count() from public;

drop trigger if exists trg_sync_community_post_count on public.community_posts;
create trigger trg_sync_community_post_count
after insert or delete or update of community_id, is_published
on public.community_posts
for each row
execute function public.sync_community_post_count();

-- Reconcile existing cached counters from the source rows.
update public.communities c
set post_count = coalesce((
  select count(*)::integer
  from public.community_posts p
  where p.community_id = c.id
    and p.is_published is true
), 0);