-- Jimvio Trust Checker: scan reports, file/image fingerprints and hard daily
-- caps for free third-party quotas. Service role only.
create table if not exists public.trust_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  requester_hash text,
  input_url text,
  file_name text,
  file_type text,
  file_size bigint,
  file_sha256 text,
  status text not null default 'complete' check (status in ('complete','failed')),
  overall_level text not null,
  report jsonb not null,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists trust_scans_user_idx on public.trust_scans (user_id, created_at desc);
create index if not exists trust_scans_requester_idx on public.trust_scans (requester_hash, created_at desc);
alter table public.trust_scans enable row level security;
revoke all on public.trust_scans from anon, authenticated;

create table if not exists public.trust_fingerprints (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sha256','dhash')),
  value text not null,
  first_scan_id uuid references public.trust_scans(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  seen_count integer not null default 1,
  unique (kind, value)
);
alter table public.trust_fingerprints enable row level security;
revoke all on public.trust_fingerprints from anon, authenticated;

create table if not exists public.trust_provider_usage (
  provider text not null,
  day date not null,
  calls integer not null default 0,
  primary key (provider, day)
);
alter table public.trust_provider_usage enable row level security;
revoke all on public.trust_provider_usage from anon, authenticated;

create or replace function public.trust_take_quota(p_provider text, p_daily_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_calls integer;
begin
  insert into public.trust_provider_usage (provider, day, calls)
  values (p_provider, (now() at time zone 'utc')::date, 1)
  on conflict (provider, day) do update set calls = trust_provider_usage.calls + 1
  returning calls into v_calls;
  if v_calls > p_daily_limit then
    update public.trust_provider_usage set calls = calls - 1
      where provider = p_provider and day = (now() at time zone 'utc')::date;
    return false;
  end if;
  return true;
end; $$;
revoke all on function public.trust_take_quota(text, integer) from public, anon, authenticated;
grant execute on function public.trust_take_quota(text, integer) to service_role;
