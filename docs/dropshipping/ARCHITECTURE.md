# Jimvio Dropshipping OS — Developer Guide

## Architecture

Jimvio Marketplace remains the catalog + checkout surface. Dropshipping OS adds a **merchant store layer** on top:

```
Jimvio Catalog → Merchant Store → Customer Order → Jimvio Order
  → Fulfillment Router → Supplier Connector (CJ #1) → Tracking → Merchant Store
```

**Reuse (do not rewrite):**
- `products` / `product_variants` / `orders` / `order_items`
- CJ auth, quota circuit, shipping, submit-order (`lib/cj/*`, `lib/sources/cj/submit-order.ts`)
- Marketplace checkout / payments / existing `/api/webhooks/shopify` fulfillment path
- `vendors` as tenant (merchant)

**New tables:** see migration `156_dropshipping_os.sql` / `20260911040000_dropshipping_os.sql`.

## Supplier connector interface

```ts
import type { SupplierConnector } from "@/lib/dropshipping/suppliers/types";
import { registerSupplier } from "@/lib/dropshipping/suppliers/registry";
```

Implement `SupplierConnector` and register:

```ts
registerSupplier("zendrop", (db) => new ZendropConnector(db));
```

### How to add a new supplier connector

1. Create `lib/dropshipping/suppliers/<name>-connector.ts` implementing `SupplierConnector`.
2. Register in `lib/dropshipping/suppliers/registry.ts`.
3. Extend DB check on `store_product_links.supplier_code` if needed (migration).
4. Never bypass CJ quota helpers for CJ; share rate-limit infrastructure for others.
5. Never send Jimvio UUIDs where supplier variant IDs are required.
6. Add unit tests with mocks — do not place real supplier orders.

CJ is Connector #1: `lib/dropshipping/suppliers/cj-connector.ts` wraps existing submit/inventory/shipping.

## Store connector interface

```ts
import type { StoreConnector } from "@/lib/dropshipping/stores/types";
```

### How to add a new store connector

1. Implement `StoreConnector` in `lib/dropshipping/stores/<platform>-connector.ts`.
2. Extend `loadStoreConnector` in `stores/registry.ts`.
3. Add platform to `merchant_stores.platform` CHECK via migration.
4. Add OAuth/connect routes under `app/api/dropshipping/<platform>/`.
5. Add webhook receiver under `app/api/webhooks/dropshipping/<platform>/`.
6. Document required env vars; show **Not configured** when missing — never fake connections.

Shopify is first production connector: OAuth + token fallback, modern fulfillment orders API.

## Product mapping

`store_product_links` maps:

| Field | Meaning |
|-------|---------|
| `product_id` / `variant_id` | Jimvio IDs |
| `store_product_id` / `store_variant_id` | Merchant store IDs |
| `supplier_product_id` / `supplier_variant_id` | Supplier IDs (CJ PID / VID) |

Never confuse these. For CJ preserve PID/VID/SKU in supplier_* columns.

## Order ingestion

`POST /api/webhooks/dropshipping/shopify` → verify HMAC → persist `webhook_events` → `ingestStoreOrder` → `routeOrderFulfillment`.

Idempotent on `(merchant_store_id, external_order_id)` and `ds_idempotency_keys`.

## Sync engine

Jobs: `PRODUCT_IMPORT`, `PRODUCT_UPDATE`, `INVENTORY_SYNC`, `PRICE_SYNC`, `ORDER_SYNC`, `FULFILLMENT_SYNC`, `TRACKING_SYNC`, `CONNECTION_TEST`.

Cron: `/api/cron/dropshipping-sync` (Bearer `CRON_SECRET`).

## API platform

Versioned routes under `/api/v1/*` with hashed API keys (`ds_api_keys`) and scopes.

## Merchant / Admin UI

- Merchant: `/dropshipping`
- Admin: `/admin/dropshipping`
- Marketplace CTA: **Sell This Product** on physical PDP

## Troubleshooting

| Symptom | Action |
|---------|--------|
| Shopify connection expired | Reconnect store (OAuth or token) |
| CJ inventory temporarily unavailable | Wait for quota circuit; sync retries |
| Product variant mapping missing | Re-import / fix `store_product_links` |
| Invalid shipping quote | Check CJ freight API / destination |
| Supplier variant unavailable | Verify CJ VID on variant |

## Security

- Tenant from session / API key only — never trust client `vendorId` for authz.
- Store tokens only in `merchant_store_credentials` (server-side).
- Webhook HMAC required.
- RLS on merchant-owned tables.
