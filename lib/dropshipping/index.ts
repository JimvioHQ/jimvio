/**
 * Jimvio Dropshipping OS — public module surface.
 * Prefer importing from this barrel for app/API consumers.
 */

export { requireDropshippingMerchant, dsAdminDb } from "./tenant";
export { authenticateApiKey, apiError } from "./api/auth";
export {
  claimIdempotency,
  completeIdempotency,
  generateApiKey,
  hashApiKey,
  API_SCOPES,
  type ApiScope,
} from "./api/idempotency";
export { ingestStoreOrder, type IngestOrderResult } from "./orders/ingest";
export { routeOrderFulfillment, normalizeTrackingStatus } from "./fulfillment/router";
export {
  importProductToStore,
  type ImportProductInput,
  type ImportProductResult,
} from "./mapping/import-product";
export { enqueueSyncJob, runSyncJob, type SyncJobType } from "./sync/engine";
export { loadStoreConnector, createShopifyConnector } from "./stores/registry";
export {
  connectShopifyStore,
  updateShopifyCredentials,
  testShopifyStoreConnection,
  disconnectShopifyStore,
  type ConnectShopifyInput,
  type ConnectShopifyResult,
} from "./stores/connect-shopify";
export { getSupplierConnector, listRegisteredSuppliers } from "./suppliers/registry";
export {
  calculateSellingPrice,
  pickPriceRule,
  availableInventory,
} from "./pricing/engine";
export {
  getOrCreateEntitlements,
  assertCanConnectStore,
  type Plan,
} from "./entitlements/plans";
export { logIntegration } from "./observability/log";
export {
  verifyShopifyWebhookHmac,
  persistWebhookEvent,
  markWebhookProcessed,
  type PersistWebhookResult,
} from "./webhooks/verify";
