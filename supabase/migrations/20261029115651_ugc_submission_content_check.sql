-- Jimvio checker result for the post's content (AI-generated likelihood, quality). Service role only.
alter table public.ugc_submissions add column if not exists content_check jsonb;
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
    new.content_check := null;
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
    or new.verification_note is distinct from old.verification_note
    or new.content_check is distinct from old.content_check then
    raise exception 'View verification fields are set by Jimvio only.' using errcode = '42501';
  end if;
  return new;
end;
$$;
