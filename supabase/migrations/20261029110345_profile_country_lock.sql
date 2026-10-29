-- Country is captured by Jimvio from the person's real location when they
-- start using their account, then locked. Only Jimvio (service role) can set it.
alter table public.profiles
  add column if not exists country_locked_at timestamptz,
  add column if not exists country_source text;

create or replace function public.guard_profile_country_lock()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated','anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.country_locked_at := null; new.country_source := null; new.country := null;
    return new;
  end if;
  if new.country_locked_at is distinct from old.country_locked_at
    or new.country_source is distinct from old.country_source
    or new.country is distinct from old.country then
    raise exception 'Country is set by Jimvio from your real location and cannot be changed.' using errcode = '42501';
  end if;
  return new;
end; $$;
revoke all on function public.guard_profile_country_lock() from public, anon, authenticated;
drop trigger if exists profile_country_lock_guard on public.profiles;
create trigger profile_country_lock_guard before insert or update on public.profiles
  for each row execute function public.guard_profile_country_lock();
