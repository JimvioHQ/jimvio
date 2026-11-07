-- Platform verification grants — secure audit model.
--
-- Live badge sources remain:
--   jip_identity.identity_verified, vendors.verification_status, influencers.is_verified
-- This migration adds an admin audit trail + private evidence store.
--
-- SECURITY: evidence is NEVER selectable by anon/authenticated on the grants table.
-- Public callers use view platform_verification_public (status projection only).
--
-- Owner-authorized for production apply (2026-11-07).
-- Idempotent: drop/create policies and tables safely.
--
-- View uses security_invoker=false so anon can read the verified projection
-- without granting SELECT on the base grants table (which would leak reason fields).

-- 1) Public-safe status projection (no evidence)
create table if not exists public.platform_verification_grants (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in (
    'user', 'creator', 'influencer', 'brand', 'business', 'merchant', 'community_owner'
  )),
  entity_id uuid not null,
  category text not null check (category in (
    'personal', 'creator', 'brand', 'business', 'merchant', 'community_owner'
  )),
  status text not null check (status in (
    'unverified', 'pending', 'under_review', 'verified', 'rejected', 'suspended', 'revoked', 'expired'
  )),
  reason text,
  reviewer_id uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  expires_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, category)
);

-- Drop legacy evidence column if an earlier draft migration added it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'platform_verification_grants'
      and column_name = 'evidence_refs'
  ) then
    alter table public.platform_verification_grants drop column evidence_refs;
  end if;
end $$;

create index if not exists platform_verification_grants_entity_idx
  on public.platform_verification_grants (entity_type, entity_id);
create index if not exists platform_verification_grants_status_idx
  on public.platform_verification_grants (status, category);

-- 2) Private evidence — admin / service_role only
create table if not exists public.platform_verification_evidence (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.platform_verification_grants (id) on delete cascade,
  kind text not null default 'document',
  storage_path text not null,
  mime_type text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists platform_verification_evidence_grant_idx
  on public.platform_verification_evidence (grant_id);

create table if not exists public.platform_verification_audit (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.platform_verification_grants (id) on delete cascade,
  action text not null,
  actor_id uuid references auth.users (id) on delete set null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists platform_verification_audit_grant_idx
  on public.platform_verification_audit (grant_id, created_at desc);

-- 3) Public view — verified status only (no reasons that may leak PII).
-- security_invoker=false: view owner rights so anon never needs base-table SELECT.
create or replace view public.platform_verification_public
with (security_invoker = false)
as
select
  id,
  entity_type,
  entity_id,
  category,
  status,
  decided_at,
  expires_at
from public.platform_verification_grants
where status = 'verified'
  and (expires_at is null or expires_at > now());

alter table public.platform_verification_grants enable row level security;
alter table public.platform_verification_evidence enable row level security;
alter table public.platform_verification_audit enable row level security;

-- Grants: no public SELECT on base table (prevents evidence-style leakage).
revoke all on public.platform_verification_grants from anon, authenticated;
revoke all on public.platform_verification_evidence from anon, authenticated;
revoke all on public.platform_verification_audit from anon, authenticated;
revoke all on public.platform_verification_public from anon, authenticated;

grant select on public.platform_verification_public to anon, authenticated;

-- Applicants can read their own grant STATUS rows (no evidence).
drop policy if exists platform_verification_grants_owner_read on public.platform_verification_grants;
create policy platform_verification_grants_owner_read
  on public.platform_verification_grants
  for select
  to authenticated
  using (
    entity_type in ('user', 'creator', 'influencer')
    and entity_id = (select auth.uid())
  );

grant select on public.platform_verification_grants to authenticated;

-- Applicants can read their own audit notes (not evidence files).
drop policy if exists platform_verification_audit_owner_read on public.platform_verification_audit;
create policy platform_verification_audit_owner_read
  on public.platform_verification_audit
  for select
  to authenticated
  using (
    exists (
      select 1 from public.platform_verification_grants g
      where g.id = grant_id
        and g.entity_type in ('user', 'creator', 'influencer')
        and g.entity_id = (select auth.uid())
    )
  );

grant select on public.platform_verification_audit to authenticated;

-- Evidence: no policies for authenticated/anon → only service_role bypasses RLS.
-- Writes: no insert/update/delete grants to clients — service role / admin APIs only.

/* rollback (manual):
drop view if exists public.platform_verification_public;
drop table if exists public.platform_verification_evidence;
drop table if exists public.platform_verification_audit;
drop table if exists public.platform_verification_grants;
*/
