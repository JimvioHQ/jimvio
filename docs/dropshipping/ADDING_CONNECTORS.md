# Dropshipping OS — Adding Connectors

## New supplier

1. Implement `SupplierConnector` (`lib/dropshipping/suppliers/types.ts`).
2. `registerSupplier("code", factory)`.
3. Migration: extend `supplier_code` CHECK if new code.
4. Wire fulfillment router grouping if multi-supplier split is needed.
5. Tests with fixtures — no live orders.

## New store platform

1. Implement `StoreConnector` (`lib/dropshipping/stores/types.ts`).
2. Extend `loadStoreConnector`.
3. Connect + OAuth routes + webhook route.
4. Env: document required secrets; UI must show "Not configured" when absent.
5. Register webhooks for orders/create, uninstall, inventory if supported.
