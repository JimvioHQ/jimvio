# Migration review — `20261122212836_secure_public_discovery_rpcs.sql`

**Status:** Applied to production project `vsfhwfimudpdipdkxbww` on 2026-11-22.

## Purpose

Harden public discovery endpoints without changing their response schemas or intended public behavior.

- `get_product_gallery(uuid)` and `get_trending_community_topics(integer)` now use `SECURITY INVOKER`, so access is bounded by the caller's table permissions and RLS.
- `get_trending_communities(integer)` remains `SECURITY DEFINER` only for safe aggregate counts. It now includes only active, non-private, non-archived, explicitly public communities and public-eligible posts (published, not hidden, deleted, archived, exclusive or restricted-audience).
- All three functions use a fixed `pg_catalog, public` search path and explicit execute grants to `anon`, `authenticated`, and `service_role`.

## Verification

- Production function metadata: gallery and trending topics report `prosecdef=false`; communities reports `prosecdef=true`.
- As `anon`, test calls returned 0 gallery rows for a non-existent product, 0 eligible topics where no current public topic data exists, and 4 public communities.
- Security Advisor reduced public SECURITY DEFINER warnings from 3 to 1; the remaining public discovery function is the aggregate-only communities endpoint described above.
- No product, community, post, membership, or user data was modified by the verification calls.

## Rationale

The remaining SECURITY DEFINER community aggregation cannot be converted to SECURITY INVOKER without losing access to private member-activity tables needed to compute aggregate engagement. It returns only aggregate counts and public community metadata, and is now constrained to public communities and public-eligible posts.
