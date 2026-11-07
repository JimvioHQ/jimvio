-- Platform verification grants (central audit trail).
-- DOES NOT replace vendors.verification_status, jip_identity.identity_verified,
-- or influencers.is_verified — those remain the live sources of truth for now.
-- This table records admin decisions and evidence references for the admin portal.
--
-- NOT APPLIED TO PRODUCTION YET — explain and obtain owner approval first.
-- Private evidence paths must never be granted to anon/authenticated SELECT.

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
  evidence_refs jsonb not null default '[]'::jsonb,
  reviewer_id uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  expires_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_verification_grants_entity_idx
  on public.platform_verification_grants (entity_type, entity_id);

create index if not exists platform_verification_grants_status_idx
  on public.platform_verification_grants (status, category);

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

alter table public.platform_verification_grants enable row level security;
alter table public.platform_verification_audit enable row level security;

-- Public can see only that an entity is verified (no evidence).
drop policy if exists platform_verification_grants_public_read on public.platform_verification_grants;
create policy platform_verification_grants_public_read
  on public.platform_verification_grants
  for select
  using (status = 'verified');

-- Applicants can read their own grant rows (still no evidence exposure beyond refs they uploaded).
drop policy if exists platform_verification_grants_owner_read on public.platform_verification_grants;
create policy platform_verification_grants_owner_read
  on public.platform_verification_grants
  for select
  to authenticated
  using (
    entity_type in ('user', 'creator', 'influencer')
    and entity_id = (select auth.uid())
  );

-- No client inserts/updates — service role / admin actions only.
revoke insert, update, delete on public.platform_verification_grants from anon, authenticated;
revoke insert, update, delete on public.platform_verification_audit from anon, authenticated;
grant select on public.platform_verification_grants to anon, authenticated;
grant select on public.platform_verification_audit to authenticated;

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
