# Migration review — `20261107040000_platform_verification_grants.sql`

**Status:** NOT APPLIED. Awaiting owner approval.

## Purpose

Add an admin audit trail for Blue Verified decisions without exposing private evidence to anon/authenticated clients.

## Permission model

| Surface | Who | Access |
|---|---|---|
| `platform_verification_public` (view) | anon + authenticated | SELECT verified status projection only |
| `platform_verification_grants` | authenticated | SELECT own user/creator/influencer rows (status metadata) |
| `platform_verification_evidence` | none (RLS, no policies) | service_role / admin API only |
| `platform_verification_audit` | authenticated | SELECT own grant audit notes |
| Writes (grant/reject/suspend/revoke) | admin API + service_role | Server-side `assertAdminAccess` |

## Security fix vs earlier draft

Earlier draft exposed `evidence_refs` via a public SELECT policy on the grants table. This migration:

1. Drops `evidence_refs` if present.
2. Stores evidence in a separate table with **no** client SELECT policy.
3. Publishes only a verified-status view publicly.

## Rollback

```sql
drop view if exists public.platform_verification_public;
drop table if exists public.platform_verification_evidence;
drop table if exists public.platform_verification_audit;
drop table if exists public.platform_verification_grants;
```

## Apply gate

Do not apply until:

1. Owner reviews this file + the SQL.
2. Tenant-isolation and verification tests pass.
3. Owner explicitly approves production apply.
