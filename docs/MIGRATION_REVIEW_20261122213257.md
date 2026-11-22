# Migration review — `20261122213257_notification_unread_count_invoker.sql`

**Status:** Applied to production project `vsfhwfimudpdipdkxbww` on 2026-11-22.

## Change

`get_unread_notification_count(uuid)` now runs as `SECURITY INVOKER` and relies on the existing `notifications_select` RLS policy (a caller may select only rows where `user_id = auth.uid()`). The function also returns zero when a non-service caller supplies a different user ID. Trusted service-role callers retain their existing administrative lookup behavior.

## Verification

- Existing `notifications_select` policy was confirmed to restrict rows to `auth.uid()`.
- Authenticated test claim calling with a different user ID returned zero.
- Authenticated test claim calling with its own user ID executed successfully (zero rows for the test account).
- Function metadata reports `prosecdef=false`.
- No notification rows were inserted, updated or deleted.
