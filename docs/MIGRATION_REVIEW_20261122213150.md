# Migration review — `20261122213150_secure_user_scoped_analytics_rpcs.sql`

**Status:** Applied to production project `vsfhwfimudpdipdkxbww` on 2026-11-22.

## Changes

- `get_unread_notification_count(uuid)` returns a caller's own unread count only; explicit arbitrary-user lookups remain available to trusted service-role callers.
- `record_community_post_view(...)` and `record_affiliate_click(...)` are service-role-only. Production call sites use `createServiceRoleClient()` after the server route has validated the request.
- `record_community_story_view(...)` requires `p_user_id = auth.uid()`, rejects unauthenticated/mismatched subjects, ignores authors viewing their own stories, and checks the same public/follower/community visibility gates as the visible-story access policy before updating counters.

## Verification

- Function grants were checked using `has_function_privilege` for anon, authenticated and service_role.
- Authenticated and anon roles can no longer execute the service-only post-view and affiliate-click functions.
- A test authenticated claim with a mismatched story-view subject is rejected before any row is written.
- A non-owner unread-count lookup returns zero; a caller's own count remains available.
- Application call sites for affiliate clicks and post views use server-side service-role clients; story views use the authenticated server client.

## Data impact

No existing notification, affiliate-click, post-view or story-view rows were deleted or rewritten. Only function behavior and execute grants changed.
