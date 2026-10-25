## v1.0.5 — 2026-10-25

# Jimvio v1.0.5

Production release from `e02dfefc37bef52ad327b9df6f4fe6868fec1d9e`.

## Changes
- fix: load growth engine routes without the untracked SEO split (e02dfefc)
- feat: add a paused growth engine with explicit marketing consent (b80f9885)


## v1.0.4 — 2026-10-25

# Jimvio v1.0.4

Production release from `0113d96d4a4395a58ae61d21c39969a47ab7eab9`.

## Changes
- fix: restore original Jimvio homepage (0113d96d)


## v1.0.3 — 2026-10-24

# Jimvio v1.0.3

Production release from `a3cb1d30169d3ded48b036e685fc7917b91f5b0b`.

## Changes
- feat: define Jimvio as an all-in-one creator commerce platform (a3cb1d30)


## v1.0.2 — 2026-10-24

# Jimvio v1.0.2

Production release from `9543fde5adae8cbeee85be4728225dc7337b2115`.

## Changes
- feat: refresh seller products inventory page (9543fde5)


## v1.0.1 — 2026-10-24

# Jimvio v1.0.1

Production release from `40518b84fa81b65c26a0b2cc8645111a2a8aa1cd`.

## Changes
- fix: approve only allowlisted Supabase migrations (40518b84)


## v1.0.0 — 2026-10-24

# Jimvio v1.0.0

Production release from `48ee8d3bf8607270f3f7d83680266f7f520585a9`.

## Changes
- fix: match Supabase migration history without reapplying SQL (48ee8d3b)
- fix: keep secret scanning from failing on known placeholders (ba0dfa4c)
- feat: require verification before new digital sales (cdd60a90)
- fix: page community spaces without dropping public communities (835d4970)
- Point copilot route tests at /settings/verification after the Settings Center move. (c9013c68)
- Upgrade Next.js to 16.4.2 and fail CI on remaining critical advisories. (7c70c2f4)
- Give every account a unified Settings Center under the global header. (0b433236)
- Stop leftover CJ intelligence writes from catalog sync, enrichment cron, and marketplace maintenance. (673e65c7)
- Fail the Supabase check only when required production migrations are missing. (2cf6c2cb)
- Align GitHub checks with hosted runners and production migration names. (d0441d3b)
- Close quiz answer exposure, wallet double-debit, seller insert bypasses, and CJ intelligence jobs. (d4d2fa10)
- Apply the events, missions, and seller-verification schema without rewriting live rows, and close the access gaps that blocked grading, invites, and physical-product enforcement. (e77b07a7)
- Close course access gaps found in production acceptance. (c41ea78a)
- feat: complete events missions and seller verification (8f89bb9b)
- Let course lessons include a downloadable resource link. (e35cc514)
- Replace the community courses placeholder with a real studio, catalog, and learning flow. (eed34130)
- Give platform admins distinct community, post, and campaign controls. (45070cad)
- Keep admin community pages stable when many records share one timestamp. (3fb5f7da)
- Paginate admin community posts, live sessions, and the audit log so older records stay reachable. (3dca53e9)
- Let admins moderate community posts and comments, feature communities, and review commission history without changing payouts. (21262fae)
- Add real community, live, affiliate, and audit controls to the admin portal. (5b5e8b4e)
- Keep marketplace cards quieter and make payment, tracking, and chunk recovery explicit. (10eba083)
- Stop extra Gemini calls after a shopping-assistant quota refusal. (ede7f785)
- Use the existing Gemini model order for the shopping assistant. (4fd3bfcf)
- Make marketplace trending, search, and shopping help actually work. (9f26df0c)
- Revert the mobile logo and header fixes. (d7b95f0a)
- Restore the original header logo and remove the mobile black strip. (a1038780)
- Stop the mobile header from painting a black bar under the logo. (88a8040c)
- Stop product-page timeouts from becoming 404s and make mobile video and checkout usable. (9c9c5515)
- Unpublish CJ listings the supplier has removed from shelves. (9794f97c)


