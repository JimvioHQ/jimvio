-- Only Jimvio (service role) may write view verification results.
-- Creators and brands can still edit their own submission fields.
create or replace function public.guard_ugc_submission_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.platform_video_id := null;
    new.verification_status := 'unverified';
    new.verified_account_id := null;
    new.baseline_views := null;
    new.latest_views := null;
    new.verified_views := null;
    new.verification_flags := '{}';
    new.verification_checked_at := null;
    new.verification_note := null;
    return new;
  end if;
  if new.platform_video_id is distinct from old.platform_video_id
    or new.verification_status is distinct from old.verification_status
    or new.verified_account_id is distinct from old.verified_account_id
    or new.baseline_views is distinct from old.baseline_views
    or new.latest_views is distinct from old.latest_views
    or new.verified_views is distinct from old.verified_views
    or new.verification_flags is distinct from old.verification_flags
    or new.verification_checked_at is distinct from old.verification_checked_at
    or new.verification_note is distinct from old.verification_note then
    raise exception 'View verification fields are set by Jimvio only.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_ugc_submission_verification() from public, anon, authenticated;

drop trigger if exists ugc_submission_verification_guard on public.ugc_submissions;
create trigger ugc_submission_verification_guard
  before insert or update on public.ugc_submissions
  for each row execute function public.guard_ugc_submission_verification();

revoke insert, update, delete on public.ugc_view_snapshots from anon, authenticated;
