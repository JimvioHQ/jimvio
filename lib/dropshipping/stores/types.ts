/**
 * Store connector contract (Shopify, WooCommerce, Custom/API).
 * Credentials stay server-side; never expose access tokens to the browser.
 */

export type StorePlatform = "shopify" | "woocommerce" | "custom";

export type StoreConnectionStatus =
  | "pending"
  | "connected"
  | "disconnected"
  | "error"
  | "expired";

export type PublishProductInput = {
  title: string;
  descriptionHtml: string;
  images: string[];
  videos?: string[];
  variants: Array<{
    sku?: string | null;
    price: number;
    compareAtPrice?: number | null;
    inventory?: number | null;
    options?: Record<string, string>;
    weightGrams?: number | null;
    jimvioVariantId?: string | null;
  }>;
  options?: string[];
  metadata?: Record<string, unknown>;
};

export type PublishedProduct = {
  storeProductId: string;
  storeVariantIds: Array<{
    storeVariantId: string;
    jimvioVariantId?: string | null;
    sku?: string | null;
  }>;
  handle?: string | null;
};

export type StoreInventoryUpdate = {
  storeVariantId: string;
  quantity: number;
};

export type StorePriceUpdate = {
  storeVariantId: string;
  price: number;
  compareAtPrice?: number | null;
  currency?: string;
};

export type StoreFulfillmentUpdate = {
  externalOrderId: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  trackingCompany?: string | null;
  lineItems?: Array<{ storeVariantId?: string; quantity: number }>;
  notifyCustomer?: boolean;
};

export type NormalizedInboundOrder = {
  externalOrderId: string;
  externalOrderNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  currency: string;
  /** Verified external payment state; omitted values fail closed to pending. */
  paymentStatus?: "paid" | "pending" | "failed" | "refunded" | "cancelled";
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  shippingAddress?: Record<string, unknown> | null;
  billingAddress?: Record<string, unknown> | null;
  lineItems: Array<{
    storeProductId?: string | null;
    storeVariantId?: string | null;
    sku?: string | null;
    title?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  rawPayload: Record<string, unknown>;
};

export interface StoreConnector {
  readonly platform: StorePlatform;
  readonly displayName: string;

  testConnection(): Promise<{ ok: boolean; error?: string; shopName?: string }>;
  publishProduct(input: PublishProductInput): Promise<PublishedProduct>;
  updateProduct?(
    storeProductId: string,
    patch: Partial<PublishProductInput>
  ): Promise<void>;
  updateInventory(updates: StoreInventoryUpdate[]): Promise<void>;
  updatePrices(updates: StorePriceUpdate[]): Promise<void>;
  createFulfillment(update: StoreFulfillmentUpdate): Promise<{ fulfillmentId?: string }>;
  normalizeOrder?(payload: Record<string, unknown>): NormalizedInboundOrder;
}
