# Storefront

## Routes

- `/s/[handle]` — home (published theme sections)
- `/s/[handle]/product/[slug]` — PDP with variant picker
- `/s/[handle]/collections/[slug]` — collection + `all`
- `/s/[handle]/search` — product search
- `/s/[handle]/cart` — **store-scoped** cart
- `/s/[handle]/pages/[pageSlug]` — content pages
- `/s/[handle]/account` — redirects to Jimvio account/orders

## Host routing

`{handle}.jimvio.com` is rewritten to `/s/[handle]/...` in `proxy.ts`.

Platform hosts (`www.jimvio.com`, `jimvio.com`, `*.vercel.app`) are never rewritten.

Custom domains: recorded in `jimvio_store_domains`. SSL/verification stay **pending** until DNS proves ownership — never marked active prematurely. Path `/s/[handle]` remains the reliable fallback.
