/**
 * Supplier-agnostic connector contract.
 * CJ implements this; future suppliers (Zendrop, Spocket, Alibaba, private) must too.
 * Never hard-code CJ IDs as Jimvio UUIDs — use SupplierProduct / SupplierVariant ids.
 */

export type SupplierCode =
  | "cj"
  | "vendor"
  | "shopify"
  | "zendrop"
  | "spocket"
  | "alibaba"
  | "private"
  | "other";

export type SupplierProduct = {
  supplierCode: SupplierCode;
  supplierProductId: string;
  title: string;
  descriptionHtml?: string | null;
  images?: string[];
  videos?: string[];
  currency?: string;
  cost?: number | null;
  raw?: Record<string, unknown>;
};

export type SupplierVariant = {
  supplierCode: SupplierCode;
  supplierProductId: string;
  supplierVariantId: string;
  sku?: string | null;
  options?: Record<string, string>;
  cost?: number | null;
  currency?: string;
  inventory?: number | null;
  weightGrams?: number | null;
  raw?: Record<string, unknown>;
};

export type SupplierInventory = {
  supplierVariantId: string;
  quantity: number;
  warehouseId?: string | null;
  updatedAt?: string | null;
};

export type ShippingQuote = {
  supplier: SupplierCode;
  method: string;
  methodId?: string;
  cost: number;
  currency: string;
  minDays?: number | null;
  maxDays?: number | null;
  trackingAvailable: boolean;
  warehouseId?: string | null;
  raw?: Record<string, unknown>;
};

export type SupplierOrderLine = {
  supplierVariantId: string;
  quantity: number;
  unitPrice?: number;
};

export type SupplierShippingAddress = {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  countryCode: string;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
  address1: string;
  address2?: string | null;
};

export type CreateSupplierOrderInput = {
  idempotencyKey: string;
  jimvioOrderId: string;
  jimvioOrderNumber: string;
  lines: SupplierOrderLine[];
  shippingAddress: SupplierShippingAddress;
  shippingMethod?: string | null;
  currency?: string;
  metadata?: Record<string, unknown>;
};

export type SupplierOrder = {
  supplierOrderId: string;
  supplierOrderNumber?: string | null;
  status: string;
  raw?: Record<string, unknown>;
};

export type SupplierFulfillment = {
  supplierOrderId: string;
  status: string;
  trackingNumber?: string | null;
  trackingProvider?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  raw?: Record<string, unknown>;
};

export type SupplierTracking = {
  supplierOrderId: string;
  trackingNumber: string;
  trackingProvider?: string | null;
  trackingUrl?: string | null;
  status: string;
  events?: Array<{ at?: string; description?: string }>;
};

export type GetShippingRatesInput = {
  lines: Array<{ supplierVariantId: string; quantity: number }>;
  countryCode: string;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
};

export interface SupplierConnector {
  readonly code: SupplierCode;
  readonly displayName: string;

  getProducts?(cursor?: string): Promise<{ products: SupplierProduct[]; nextCursor?: string }>;
  getProduct(supplierProductId: string): Promise<SupplierProduct | null>;
  getVariants(supplierProductId: string): Promise<SupplierVariant[]>;
  getInventory(supplierVariantIds: string[]): Promise<SupplierInventory[]>;
  getShippingRates(input: GetShippingRatesInput): Promise<ShippingQuote[]>;
  createOrder(input: CreateSupplierOrderInput): Promise<SupplierOrder>;
  getOrder(supplierOrderId: string): Promise<SupplierOrder | null>;
  getTracking(supplierOrderId: string): Promise<SupplierTracking | null>;
  createWebhook?(url: string, events: string[]): Promise<{ id: string } | null>;
  handleWebhook?(headers: Record<string, string>, rawBody: string): Promise<{
    acknowledged: boolean;
    eventType?: string;
    payload?: unknown;
  }>;
}

export type NormalizedFulfillmentStatus =
  | "pending"
  | "submitted"
  | "processing"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "failed"
  | "returned";
