/**
 * Marketplace Intelligence v4 — aggregate signals from DB (read-only).
 */

import { getIntelligenceDB, INTELLIGENCE_BATCH_SIZE } from "./db";
import type { MarketplaceProductSignals, QualityConfidence } from "./types";

export interface RawProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  view_count: number | null;
  sale_count: number | null;
  rating: number | null;
  review_count: number | null;
  category_id: string | null;
  shipping_from: string | null;
  delivery_time: string | null;
  is_free_shipping: boolean | null;
  affiliate_commission_rate: number | null;
  source: string | null;
  source_metadata: Record<string, unknown> | null;
  images: string[] | null;
  status: string;
  created_at: string;
}

function toQualityConfidence(val: unknown): QualityConfidence | undefined {
  if (val === "very_high" || val === "high" || val === "medium" || val === "low") {
    return val;
  }
  return undefined;
}

export async function fetchActiveProductBatch(
  offset: number,
  limit = INTELLIGENCE_BATCH_SIZE
): Promise<RawProductRow[]> {
  const db = getIntelligenceDB();
  const { data } = await db
    .from("products")
    .select(`
      id, name, slug, price, compare_at_price, cost_price,
      view_count, sale_count, rating, review_count, category_id,
      shipping_from, delivery_time, is_free_shipping,
      affiliate_commission_rate, source, source_metadata, images,
      status, created_at
    `)
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("product_type", "physical")
    .order("id")
    .range(offset, offset + limit - 1);

  return (data ?? []) as RawProductRow[];
}

export async function countActiveProducts(): Promise<number> {
  const db = getIntelligenceDB();
  const { count } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("product_type", "physical");
  return count ?? 0;
}

export async function fetchWishlistCounts(
  productIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (productIds.length === 0) return counts;

  const db = getIntelligenceDB();
  const { data } = await db
    .from("wishlists")
    .select("product_id")
    .in("product_id", productIds);

  for (const row of data ?? []) {
    const pid = row.product_id as string;
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
  }
  return counts;
}

export async function fetchVideoProductIds(
  productIds: string[]
): Promise<Set<string>> {
  const hasVideo = new Set<string>();
  if (productIds.length === 0) return hasVideo;

  const db = getIntelligenceDB();
  const { data } = await db
    .from("product_videos")
    .select("product_id")
    .in("product_id", productIds);

  for (const row of data ?? []) {
    hasVideo.add(row.product_id as string);
  }
  return hasVideo;
}

export async function fetchCjIntelligenceMap(
  cjPids: string[]
): Promise<Map<string, {
  supplierReputation: number;
  qualityConfidence?: QualityConfidence;
  publishPriority: number;
  autoPublishReady: boolean;
}>> {
  const map = new Map<string, {
    supplierReputation: number;
    qualityConfidence?: QualityConfidence;
    publishPriority: number;
    autoPublishReady: boolean;
  }>();
  if (cjPids.length === 0) return map;

  const db = getIntelligenceDB();
  const { data } = await db
    .from("cj_product_intelligence")
    .select("pid, supplier_reputation_score, quality_confidence, publish_priority, auto_publish_ready")
    .in("pid", cjPids);

  for (const row of data ?? []) {
    map.set(row.pid as string, {
      supplierReputation: Number(row.supplier_reputation_score ?? 50),
      qualityConfidence: toQualityConfidence(row.quality_confidence),
      publishPriority: Number(row.publish_priority ?? 0),
      autoPublishReady: Boolean(row.auto_publish_ready),
    });
  }
  return map;
}

export function rawToSignals(
  row: RawProductRow,
  extras: {
    wishlistCount: number;
    hasVideo: boolean;
    cjIntel?: {
      supplierReputation: number;
      qualityConfidence?: QualityConfidence;
      publishPriority: number;
      autoPublishReady: boolean;
    };
  }
): MarketplaceProductSignals {
  const meta = row.source_metadata ?? {};
  const cjPid = typeof meta.cj_pid === "string" ? meta.cj_pid : null;

  return {
    productId: row.id,
    name: row.name,
    slug: row.slug,
    price: Number(row.price) || 0,
    compareAtPrice: row.compare_at_price,
    costPrice: row.cost_price,
    viewCount: row.view_count ?? 0,
    saleCount: row.sale_count ?? 0,
    wishlistCount: extras.wishlistCount,
    reviewCount: row.review_count ?? 0,
    rating: Number(row.rating) || 0,
    categoryId: row.category_id,
    shippingFrom: row.shipping_from,
    deliveryTime: row.delivery_time,
    hasVideo: extras.hasVideo,
    isFreeShipping: Boolean(row.is_free_shipping),
    affiliateCommissionRate: row.affiliate_commission_rate,
    source: row.source,
    cjPid,
    supplierReputation: extras.cjIntel?.supplierReputation,
    qualityConfidence: extras.cjIntel?.qualityConfidence,
    publishPriority: extras.cjIntel?.publishPriority,
    autoPublishReady: extras.cjIntel?.autoPublishReady,
  };
}

export async function fetchRevenue7d(): Promise<{ revenue: number; orders: number }> {
  const db = getIntelligenceDB();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await db
    .from("order_items")
    .select("total_price, quantity, orders!inner(created_at, status)")
    .gte("orders.created_at", since)
    .neq("orders.status", "cancelled");

  let revenue = 0;
  let orders = 0;
  for (const row of data ?? []) {
    revenue += Number(row.total_price) || 0;
    orders += Number(row.quantity) || 0;
  }
  return { revenue, orders };
}
