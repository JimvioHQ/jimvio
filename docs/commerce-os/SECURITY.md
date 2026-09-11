# Security

## Tenant / store isolation

- Every mutating Commerce API checks vendor ownership via `assertStoreOwnedByVendor`
- Staff roles enforced with `assertStorePermission` (server-side)
- Never trust client-provided `tenant_id` / raw store UUID without ownership proof
- Store add-to-cart validates `jimvio_store_products` publish link

## Cart / checkout

- Store carts cannot mix with Marketplace carts (DB partial unique indexes)
- Order attribution uses `carts.jimvio_store_id` first
- Payment secrets stay server-side; existing provider adapters unchanged

## Themes

- Draft themes never render on public storefronts

## Secrets

- No payment/supplier/OAuth secrets in client bundles
- `cosTable` is server-only
