-- Real country tracking: one network/clock observation per user per day,
-- and a Jimvio-computed verified country on the identity.
create table if not exists public.user_country_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  ip_country text,
  browser_offset_minutes integer,
  time_zone text,
  offset_matches boolean,
  anonymizer boolean not null default false,
  seen_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day, ip_country)
);
create index if not exists user_country_signals_user_day_idx on public.user_country_signals (user_id, day desc);
alter table public.user_country_signals enable row level security;
revoke all on public.user_country_signals from anon, authenticated;

alter table public.jip_identity
  add column if not exists verified_country text,
  add column if not exists country_confidence text not null default 'none',
  add column if not exists country_vpn_suspected boolean not null default false,
  add column if not exists country_checked_at timestamptz;
alter table public.jip_identity drop constraint if exists jip_identity_country_confidence_check;
alter table public.jip_identity add constraint jip_identity_country_confidence_check
  check (country_confidence in ('none','low','medium','high'));

create or replace function public.guard_jip_identity_country()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated','anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.verified_country := null; new.country_confidence := 'none';
    new.country_vpn_suspected := false; new.country_checked_at := null;
    return new;
  end if;
  if new.verified_country is distinct from old.verified_country
    or new.country_confidence is distinct from old.country_confidence
    or new.country_vpn_suspected is distinct from old.country_vpn_suspected
    or new.country_checked_at is distinct from old.country_checked_at then
    raise exception 'Verified country is set by Jimvio only.' using errcode = '42501';
  end if;
  return new;
end; $$;
revoke all on function public.guard_jip_identity_country() from public, anon, authenticated;
drop trigger if exists jip_identity_country_guard on public.jip_identity;
create trigger jip_identity_country_guard before insert or update on public.jip_identity
  for each row execute function public.guard_jip_identity_country();
