-- Social accounts must be proven before they count: official login (OAuth)
-- or a one-time code placed in the account's bio, checked by Jimvio.
alter table public.jip_social_accounts
  add column if not exists verify_status text not null default 'unverified',
  add column if not exists verify_code text,
  add column if not exists verify_code_created_at timestamptz,
  add column if not exists verify_checked_at timestamptz,
  add column if not exists verify_note text;
alter table public.jip_social_accounts drop constraint if exists jip_social_accounts_verify_status_check;
alter table public.jip_social_accounts add constraint jip_social_accounts_verify_status_check
  check (verify_status in ('unverified','code_issued','pending_review','verified','failed'));
update public.jip_social_accounts set verify_status = 'verified' where is_verified = true;

create or replace function public.guard_social_account_verification()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE'
    and (new.url is distinct from old.url or new.handle is distinct from old.handle)
    and new.is_verified is not distinct from old.is_verified
    and old.is_verified = true then
    -- A changed handle or link must be proven again.
    new.is_verified := false; new.verified_at := null; new.verification_method := null;
    new.verify_status := 'unverified'; new.verify_code := null; new.verify_code_created_at := null;
  end if;
  if current_user not in ('authenticated','anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.is_verified := false; new.verified_at := null; new.verification_method := null;
    new.verify_status := 'unverified'; new.verify_code := null; new.verify_code_created_at := null;
    new.verify_checked_at := null; new.verify_note := null;
    return new;
  end if;
  if new.is_verified is distinct from old.is_verified
    or new.verified_at is distinct from old.verified_at
    or new.verification_method is distinct from old.verification_method
    or new.verify_status is distinct from old.verify_status
    or new.verify_code is distinct from old.verify_code
    or new.verify_code_created_at is distinct from old.verify_code_created_at
    or new.verify_checked_at is distinct from old.verify_checked_at
    or new.verify_note is distinct from old.verify_note then
    raise exception 'Social verification is set by Jimvio only.' using errcode = '42501';
  end if;
  return new;
end; $$;
revoke all on function public.guard_social_account_verification() from public, anon, authenticated;
drop trigger if exists social_account_verification_guard on public.jip_social_accounts;
create trigger social_account_verification_guard before insert or update on public.jip_social_accounts
  for each row execute function public.guard_social_account_verification();
