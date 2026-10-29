-- N-7: Founding Creators — the first 100 real creators on Jimvio.
-- A seat is claimed by the creator (never assigned by hand), only when they
-- already run something real on Jimvio. Benefits enforced in code:
-- permanent numbered badge, and a 10% community membership fee (instead of
-- the standard rate) for 12 months from the day the seat was claimed.
create table if not exists public.founding_creators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seat_number integer not null unique check (seat_number between 1 and 100),
  qualified_by text not null check (qualified_by in ('community','creator_profile','store')),
  fee_rate numeric(5,2) not null default 10,
  fee_until timestamptz not null,
  joined_at timestamptz not null default now()
);

alter table public.founding_creators enable row level security;

drop policy if exists founding_creators_public_read on public.founding_creators;
create policy founding_creators_public_read on public.founding_creators
  for select using (true);
-- No insert/update/delete policies: seats are only claimed through the function below.

create or replace function public.founding_creator_qualification(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.communities c
      where c.owner_id = p_user and c.is_active is not false and c.archived_at is null
    ) then 'community'
    when exists (
      select 1 from public.influencers i
      where i.user_id = p_user and i.is_active is not false and coalesce(btrim(i.display_name), '') <> ''
    ) then 'creator_profile'
    when exists (
      select 1 from public.vendors v
      join public.products p on p.vendor_id = v.id
      where v.user_id = p_user and p.status = 'active' and p.is_active and p.deleted_at is null
    ) then 'store'
    else null
  end;
$$;

create or replace function public.claim_founding_seat()
returns public.founding_creators
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing public.founding_creators;
  reason text;
  taken integer;
  row_out public.founding_creators;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  select * into existing from public.founding_creators where user_id = uid;
  if found then
    return existing;
  end if;
  if exists (select 1 from public.profiles pr where pr.id = uid and pr.is_active = false) then
    raise exception 'account_inactive' using errcode = '42501';
  end if;
  reason := public.founding_creator_qualification(uid);
  if reason is null then
    raise exception 'not_eligible' using errcode = '42501';
  end if;
  -- Serialize seat numbering so two creators never get the same seat.
  lock table public.founding_creators in share row exclusive mode;
  select count(*) into taken from public.founding_creators;
  if taken >= 100 then
    raise exception 'program_full' using errcode = '53400';
  end if;
  insert into public.founding_creators (user_id, seat_number, qualified_by, fee_until)
  values (uid, taken + 1, reason, now() + interval '12 months')
  returning * into row_out;
  return row_out;
end;
$$;

revoke all on function public.claim_founding_seat() from public, anon;
grant execute on function public.claim_founding_seat() to authenticated;
revoke all on function public.founding_creator_qualification(uuid) from public, anon, authenticated;
