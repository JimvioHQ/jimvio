# Migration review — `20261122212225_platform_verification_public_invoker.sql`

**Status:** Applied to production project `vsfhwfimudpdipdkxbww` on 2026-11-22.

## Purpose

Replace the public verification status view's SECURITY DEFINER behavior with SECURITY INVOKER while preserving the intentionally public verified-status projection.

## Permission model

- `platform_verification_public`: anon and authenticated may SELECT the seven-field verified-status projection.
- `platform_verification_grants`: anon/authenticated receive column-level SELECT only for `id, entity_type, entity_id, category, status, decided_at, expires_at`.
- RLS permits current verified rows publicly and retains the existing owner-read policy for an applicant's own status row.
- Review fields including `reason`, `reviewer_id`, `revocation_reason`, timestamps, evidence, and audit remain unavailable to anon/authenticated.
- Admin APIs continue to use the service-role client for review and mutation.

## Verification

- View reloptions report `security_invoker=true`.
- Test transaction inserted a synthetic verified row, switched to the `anon` role, read the matching row through the view, and rolled back.
- `anon` and `authenticated` both have no table-level SELECT on the grants table.
- `anon` and `authenticated` both lack SELECT on `reason` and retain SELECT on `id`.
- The public verification view Security Advisor finding no longer appears.
- No production verification records were created by the test (the test transaction was rolled back).

## Rollback

Rollback is not recommended because it restores a SECURITY DEFINER public view. If required, restore the previous column/role grants and view definition only after an explicit security review.
