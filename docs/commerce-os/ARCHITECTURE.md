# Jimvio Commerce OS — Architecture

Jimvio Commerce OS is an **additive** native storefront layer on top of the existing Marketplace, cart, checkout, payments, orders, and Dropshipping OS.

## Principles

- **ONE** product / variant / inventory / cart / checkout / order / fulfillment core
- Native Jimvio stores are **primary**; Shopify/WooCommerce are **optional connectors**
- Never duplicate Marketplace checkout or CJ fulfillment
- Public nav stays: Home · Marketplace · Communities · Affiliates · UGC & Clipping

## Surfaces

| Surface | Path | Role |
|---|---|---|
| Merchant OS | `/commerce/*` | Create/manage Jimvio stores |
| Storefront | `/s/[handle]/*` | Public native store |
| Subdomain | `{handle}.jimvio.com` | Rewrites to `/s/[handle]` via `proxy.ts` |
| Admin | `/admin/commerce` | Platform inspection |
| Dropshipping | `/dropshipping/*` | External connectors + CJ routing |

## Data model (native)

- `jimvio_stores` — merchant-owned stores (`published_theme` is the live theme snapshot)
- `jimvio_store_products` — links shared `products` into a store
- `jimvio_store_collections` (+ `_collection_products`)
- `jimvio_store_domains` — hostnames (SSL stays pending until verified)
- `jimvio_store_discounts`, shipping zones/rates, tax rules, staff, abandoned carts
- `carts.jimvio_store_id` — **store-scoped carts** (`NULL` = Marketplace)
- `orders.jimvio_store_id` + `order_channel = jimvio_store`
- `jimvio_inventory_holds` — soft reservation for store checkouts
- `jimvio_store_returns` — return requests (refunds via payment providers)

## Theme draft vs publish

- Builder writes `theme_draft` only
- Publish copies draft → `published_theme` + `theme_settings`
- Public storefront reads **`published_theme` only** (never draft)

## Cart isolation

- Marketplace cart: `carts.jimvio_store_id IS NULL`
- Store A cart: `jimvio_store_id = A`
- Add-to-cart from storefront validates product is published on that store
- Checkout prefers cart’s `jimvio_store_id`, cookie handle is fallback

## Fulfillment

Native store orders enter the **same** Dropshipping OS fulfillment router when lines are supplier-mapped (CJ VID preserved). No second fulfillment engine.

## Compatibility layer

`cosTable()` remains for tables not yet fully reflected in generated types beyond carts. Prefer regenerating Supabase types when safe.
