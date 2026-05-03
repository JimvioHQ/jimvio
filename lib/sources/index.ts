/**
 * Multi-source marketplace boundary:
 * - `product-source` — canonical IDs (`vendor` | `shopify` | `cj`).
 * - `supplier-settings` — admin toggles + per-channel commission (platform_settings.supplier_sources).
 * - `cj/submit-order` — CJ API adapter (stub until credentials are wired).
 * - Fulfillment orchestration lives in `lib/order-fulfillment/after-payment.ts` + `finalize-order-payment.ts`.
 * Add a new channel: extend PRODUCT_SOURCES, migration CHECK, supplier_sources JSON, and a new adapter module — do not branch inside Shopify sync.
 */
export * from "./product-source";
export * from "./supplier-settings";
export { submitCjOrderForLines } from "./cj/submit-order";
