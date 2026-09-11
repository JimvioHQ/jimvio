# Jimvio Commerce OS

Canonical merchant product: **Jimvio Commerce OS** at `/commerce`.

Dropshipping is a **capability inside Commerce OS** (not a separate product): Shopify
channel connect, supplier import, pricing/sync, and fulfillment routing. Backend
tables and APIs remain `merchant_stores`, `store_product_links`, `ds_*`, and
`/api/dropshipping/**` (stable production contracts — do not redirect APIs).

## Information architecture

| Section | Routes |
|---------|--------|
| Operations | Overview, Stores (Jimvio), Products, Orders, Inventory |
| Channels | Integrations, Connected Stores, Channel Products/Orders/Inventory, Pricing, Sync |
| Supply | Suppliers (CJ), Fulfillment, Shipping |
| Storefront | Builder, Collections, Customers, Discounts, Analytics, Payments, Pages, Domains |
| System | Settings, API Keys, Channel Settings |

Public top navigation (do not reorder): Home · Marketplace · Communities · Commerce · Affiliates · UGC & Clipping.

## Dual store models (do not merge)

- **Jimvio Store** → `jimvio_stores` → `/commerce/stores`, orders via `jimvio_store_id`
- **Connected Store (Shopify)** → `merchant_stores` → `/commerce/connected-stores`, orders via `merchant_store_id`

## Channel flow (Shopify)

```
Shopify → webhook → Jimvio Order (idempotent)
  → Fulfillment Router → CJ / supplier
  → shipment + tracking
  → TRACKING_SYNC → Shopify fulfillment pushback
```

## Suppliers / CJ

CJ is a **supplier** under `/commerce/suppliers`. Product sourcing/import, inventory,
and order submit use the existing CJ connector + fulfillment router. Do not bypass
the router for channel orders.

## Sync

`ds_sync_jobs` / `ds_sync_runs` / `ds_integration_logs` power Sync Center
(`/commerce/sync`). Job types include inventory, price, product update, fulfillment,
tracking, and connection test.

## Legacy URLs

`/dropshipping/*` redirects to Commerce equivalents (`lib/commerce-os/legacy-redirects.ts`
+ `next.config.ts`). API and webhook paths are **not** redirected.

## Shopify OAuth

Standalone merchant connector (authorization code → offline token). See
[SHOPIFY_OAUTH.md](../dropshipping/SHOPIFY_OAUTH.md). Connect UI: `/commerce/integrations`.
