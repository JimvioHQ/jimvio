-- N-7 v2: Founding Creator seats are applied for and approved by Jimvio.
-- Anyone helping Jimvio grow can apply (not only community owners). Jimvio
-- reviews the person's real activity, then approves (seat number assigned at
-- approval, in order) or declines with a reason.
create table if not exists public.founding_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  contributions text[] not null default '{}',
  note text not null default '',
  links text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  decision_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founding_applications_contributions_check check (
    contributions <@ array['community','creator','store','ugc','affiliate','referrals','content','feedback','other']::text[]
    and cardinality(contributions) between 1 and 9
  ),
  constraint founding_applications_note_len check (char_length(note) <= 1000),
  constraint founding_applications_links_len check (cardinality(links) <= 5)
);

create index if not exists founding_applications_status_idx on public.founding_applications (status, created_at);

alter table public.founding_applications enable row level security;
drop policy if exists founding_applications_own_read on public.founding_applications;
create policy founding_applications_own_read on public.founding_applications
  for select using (auth.uid() = user_id);

alter table public.founding_creators drop constraint if exists founding_creators_qualified_by_check;
alter table public.founding_creators add constraint founding_creators_qualified_by_check
  check (qualified_by in ('community','creator_profile','store','approved'));
alter table public.founding_creators add column if not exists application_id uuid references public.founding_applications(id);

create or replace function public.submit_founding_application(
  p_contributions text[],
  p_note text,
  p_links text[] default '{}'
)
returns public.founding_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing public.founding_applications;
  out_row public.founding_applications;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if exists (select 1 from public.founding_creators where user_id = uid) then
    raise exception 'already_founder' using errcode = '23505';
  end if;
  if exists (select 1 from public.profiles pr where pr.id = uid and pr.is_active = false) then
    raise exception 'account_inactive' using errcode = '42501';
  end if;
  if (select count(*) from public.founding_creators) >= 100 then
    raise exception 'program_full' using errcode = '53400';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) < 20 then
    raise exception 'note_too_short' using errcode = '22023';
  end if;

  select * into existing from public.founding_applications where user_id = uid;
  if found then
    if existing.status = 'declined' and existing.reviewed_at > now() - interval '14 days' then
      raise exception 'reapply_later' using errcode = '42501';
    end if;
    update public.founding_applications
      set contributions = p_contributions,
          note = btrim(p_note),
          links = coalesce(p_links, '{}'),
          status = 'pending',
          decision_note = null,
          reviewed_by = null,
          reviewed_at = null,
          updated_at = now()
      where id = existing.id
      returning * into out_row;
    return out_row;
  end if;

  insert into public.founding_applications (user_id, contributions, note, links)
  values (uid, p_contributions, btrim(p_note), coalesce(p_links, '{}'))
  returning * into out_row;
  return out_row;
end;
$$;

create or replace function public.grant_founding_seat(p_application uuid, p_reviewer uuid)
returns public.founding_creators
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.founding_applications;
  taken integer;
  seat public.founding_creators;
begin
  select * into app from public.founding_applications where id = p_application for update;
  if not found then
    raise exception 'application_not_found' using errcode = 'P0002';
  end if;
  select * into seat from public.founding_creators where user_id = app.user_id;
  if found then
    return seat;
  end if;
  lock table public.founding_creators in share row exclusive mode;
  select count(*) into taken from public.founding_creators;
  if taken >= 100 then
    raise exception 'program_full' using errcode = '53400';
  end if;
  insert into public.founding_creators (user_id, seat_number, qualified_by, fee_until, application_id)
  values (app.user_id, taken + 1, 'approved', now() + interval '12 months', app.id)
  returning * into seat;
  update public.founding_applications
    set status = 'approved', reviewed_by = p_reviewer, reviewed_at = now(), updated_at = now()
    where id = app.id;
  return seat;
end;
$$;

revoke all on function public.submit_founding_application(text[], text, text[]) from public, anon;
grant execute on function public.submit_founding_application(text[], text, text[]) to authenticated;
revoke all on function public.grant_founding_seat(uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_founding_seat(uuid, uuid) to service_role;
-- Seats are no longer self-claimed.
revoke execute on function public.claim_founding_seat() from authenticated;
