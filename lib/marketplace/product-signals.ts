import { productHasVideos } from "@/lib/product-videos";

type SignalProduct = {
  description?: string | null;
  inventory_quantity?: number | null;
  in_stock?: boolean | null;
  view_count?: number | null;
  sale_count?: number | null;
  sold_count?: number | null;
  source_metadata?: unknown;
  vendors?: { verification_status?: string | null } | null;
  product_videos?: unknown;
};

function readMeta(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  return meta as Record<string, unknown>;
}

export function productHasVerifiedSupplier(product: SignalProduct): boolean {
  if (product.vendors?.verification_status === "verified") return true;
  const meta = readMeta(product.source_metadata);
  return meta.verified === true || meta.cj_supplier_verified === true;
}

export function productHasTrendingSignal(product: SignalProduct): boolean {
  const meta = readMeta(product.source_metadata);
  if (meta.trending === true) return true;
  return meta.cj_trending === true && meta.trend_classification !== "cj_order_count";
}

export function productIsInStock(product: SignalProduct): boolean {
  if (product.in_stock === false) return false;
  if (product.inventory_quantity == null) return false;
  return Number(product.inventory_quantity) > 0;
}

export function productHasCustomerDescription(product: SignalProduct): boolean {
  const text = typeof product.description === "string" ? product.description.replace(/<[^>]+>/g, " ").trim() : "";
  return text.length >= 40;
}

export function productHasVideoSignal(product: SignalProduct): boolean {
  if (productHasVideos(product as never)) return true;
  const meta = readMeta(product.source_metadata);
  if (meta.has_video === true && Array.isArray(meta.videos) && meta.videos.length > 0) return true;
  return meta.cj_has_video === true && Array.isArray(meta.cj_videos) && meta.cj_videos.length > 0;
}
