# Migration review — `20261107095352_platform_verification_grants.sql`

**Status:** APPLIED to production project `vsfhwfimudpdipdkxbww` on 2026-11-07.

Remote history version: `20261107095352` / `platform_verification_grants`  
(Local filename aligned to the applied remote version. Prior draft name was `20261107040000`.)

## Purpose

Add an admin audit trail for Blue Verified decisions without exposing private evidence to anon/authenticated clients.

## Permission model (verified post-apply)

| Surface | Who | Access |
|---|---|---|
| `platform_verification_public` (view, `security_invoker=false`) | anon + authenticated | SELECT verified status projection only |
| `platform_verification_grants` | authenticated | SELECT own user/creator/influencer rows (status metadata) |
| `platform_verification_evidence` | none (RLS, no policies) | service_role / admin API only |
| `platform_verification_audit` | authenticated | SELECT own grant audit notes |
| Writes (grant/reject/suspend/revoke) | admin API + service_role | Server-side `assertAdminAccess` |

## Security notes

1. No `evidence_refs` column on grants.
2. Evidence is a separate table with **no** client SELECT policy and no grants to anon/authenticated.
3. Public callers use the verified-status view only (no reason / revocation fields).

## Rollback

```sql
drop view if exists public.platform_verification_public;
drop table if exists public.platform_verification_evidence;
drop table if exists public.platform_verification_audit;
drop table if exists public.platform_verification_grants;
-- then remove supabase_migrations.schema_migrations row version 20261107095352
```
