/**
 * Supplier Reputation Engine v3
 */

import type { EnrichedProduct } from "../import-intelligence/types";
import { getCatalogDB } from "./db";

export const SUPPLIER_BLACKLIST_THRESHOLD = 30;

export type ReputationLabel = "Excellent" | "Good" | "Average" | "Poor";

export interface SupplierReputation {
  supplierId: string;
  supplierName: string;
  score: number;
  label: ReputationLabel;
  blacklisted: boolean;
  stockStability: number;
  shippingScore: number;
  reliabilityScore: number;
  productCount: number;
}

function scoreToLabel(score: number): ReputationLabel {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 45) return "Average";
  return "Poor";
}

export function computeSupplierReputationFromProduct(
  product: EnrichedProduct
): SupplierReputation {
  const supplierId = product.supplierId ?? product.supplierName ?? "unknown";
  const supplierName = product.supplierName ?? "Unknown";

  let stockStability = 50;
  const stock = product.warehouseInventoryNum ?? 0;
  if (stock >= 500) stockStability = 95;
  else if (stock >= 100) stockStability = 80;
  else if (stock >= 20) stockStability = 65;
  else if (stock > 0) stockStability = 45;
  else stockStability = 15;

  let shippingScore = 50;
  const days = product.deliveryCycle ? parseInt(product.deliveryCycle, 10) : null;
  if (days !== null && !Number.isNaN(days)) {
    if (days <= 3) shippingScore = 100;
    else if (days <= 7) shippingScore = 85;
    else if (days <= 10) shippingScore = 70;
    else if (days <= 15) shippingScore = 50;
    else shippingScore = 30;
  }

  let reliabilityScore = 50;
  if (product.verifiedWarehouse === 1 || product.supplierVerified === true) {
    reliabilityScore += 25;
  }
  const orders = product.listedNum ?? 0;
  if (orders >= 1000) reliabilityScore += 20;
  else if (orders >= 200) reliabilityScore += 12;
  else if (orders >= 50) reliabilityScore += 6;
  reliabilityScore = Math.min(100, reliabilityScore);

  const score = Math.round(
    stockStability * 0.3 + shippingScore * 0.3 + reliabilityScore * 0.4
  );

  return {
    supplierId,
    supplierName,
    score,
    label: scoreToLabel(score),
    blacklisted: score < SUPPLIER_BLACKLIST_THRESHOLD,
    stockStability,
    shippingScore,
    reliabilityScore,
    productCount: 1,
  };
}

export async function persistSupplierReputation(rep: SupplierReputation): Promise<void> {
  const db = getCatalogDB();
  await db.from("cj_supplier_reputation").upsert(
    {
      supplier_id: rep.supplierId,
      supplier_name: rep.supplierName,
      reputation_score: rep.score,
      reputation_label: rep.label,
      blacklisted: rep.blacklisted,
      stock_stability: rep.stockStability,
      shipping_score: rep.shippingScore,
      reliability_score: rep.reliabilityScore,
      product_count: rep.productCount,
      last_calculated: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "supplier_id" }
  );
}

export async function getBlacklistedSupplierIds(): Promise<Set<string>> {
  const db = getCatalogDB();
  const { data } = await db
    .from("cj_supplier_reputation")
    .select("supplier_id")
    .eq("blacklisted", true);

  return new Set((data ?? []).map((r) => r.supplier_id as string));
}

export async function isSupplierBlacklisted(
  supplierId?: string,
  supplierName?: string
): Promise<boolean> {
  if (!supplierId && !supplierName) return false;
  const db = getCatalogDB();

  const queries = [];
  if (supplierId) {
    queries.push(
      db
        .from("cj_supplier_reputation")
        .select("blacklisted")
        .eq("supplier_id", supplierId)
        .maybeSingle()
    );
  }
  if (supplierName) {
    queries.push(
      db
        .from("cj_supplier_reputation")
        .select("blacklisted")
        .eq("supplier_name", supplierName)
        .eq("blacklisted", true)
        .maybeSingle()
    );
  }

  const results = await Promise.all(queries);
  return results.some((r) => r.data?.blacklisted === true);
}

export async function recalculateSupplierHealth(limit = 500): Promise<number> {
  const db = getCatalogDB();
  // Read only the scalar fields needed for scoring. Fetching raw_payload (JSONB)
  // for every row made this recurring job transfer hundreds of MB unnecessarily.
  // pid is indexed, so a deterministic keyset-friendly order avoids an unordered
  // heap scan while keeping the existing sample-size semantics.
  const batchLimit = Math.max(1, Math.min(Math.floor(limit) || 500, 1000));
  const { data: rows, error } = await db
    .from("cj_raw_products")
    .select(
      "pid, supplier, stock, orders, supplier_id:raw_payload->>supplierId, supplier_name:raw_payload->>supplierName, delivery_cycle:raw_payload->>deliveryCycle, verified_warehouse:raw_payload->>verifiedWarehouse, supplier_verified:raw_payload->>supplierVerified, listed_num:raw_payload->>listedNum, warehouse_inventory_num:raw_payload->>warehouseInventoryNum"
    )
    .order("pid", { ascending: true })
    .limit(batchLimit);

  if (error) {
    throw new Error(`[supplier-reputation] raw product batch read failed: ${error.message}`);
  }

  let updated = 0;
  const supplierMap = new Map<string, { reps: SupplierReputation[]; name: string }>();

  for (const row of rows ?? []) {
    const supplierId = String(row.supplier_id || row.supplier || row.pid);
    const supplierName = String(row.supplier ?? row.supplier_name ?? "Unknown");
    const verifiedWarehouse = Number(row.verified_warehouse ?? 0);
    const supplierVerified =
      row.supplier_verified === "true";

    const stub: EnrichedProduct = {
      pid: row.pid as string,
      productNameEn: "",
      productSku: "",
      bigImage: "",
      sellPrice: "0",
      nowPrice: "0",
      discountPrice: "0",
      addMarkStatus: 0,
      listedNum: Number(row.listed_num ?? row.orders ?? 0),
      warehouseInventoryNum: Number(row.warehouse_inventory_num ?? row.stock ?? 0),
      verifiedWarehouse,
      deliveryCycle: (row.delivery_cycle ?? undefined) as string | undefined,
      supplierName,
      supplierId,
      supplierVerified,
      intelligence: {
        healthScore: 0,
        healthLabel: "poor",
        profit: {
          cjCost: 0,
          shippingCost: 0,
          suggestedSelling: 0,
          estimatedProfit: 0,
          marginPercent: 0,
          roi: 0,
        },
        isImported: false,
        marketFit: { us: false, eu: false, uk: false, worldwide: true },
        supplierScore: 0,
        trending: false,
        hasVariants: false,
        stockStable: false,
        opportunityScore: 0,
        opportunityLevel: "skip",
        opportunityReasons: [],
        catalogTier: "PENDING",
        catalogBadges: [],
        qualityScores: {
          videoScore: 0,
          supplierScore: 0,
          shippingScore: 0,
          profitScore: 0,
          trendScore: 0,
          stockScore: 0,
          reviewScore: 0,
          imageQualityScore: 0,
          descriptionQualityScore: 0,
          opportunityScore: 0,
          healthScore: 0,
        },
      },
    };

    const rep = computeSupplierReputationFromProduct(stub);
    const existing = supplierMap.get(supplierId);
    if (existing) {
      existing.reps.push(rep);
    } else {
      supplierMap.set(supplierId, { reps: [rep], name: supplierName });
    }
  }

  for (const [supplierId, { reps, name }] of supplierMap) {
    const avgScore = Math.round(
      reps.reduce((s, r) => s + r.score, 0) / reps.length
    );
    const merged: SupplierReputation = {
      supplierId,
      supplierName: name,
      score: avgScore,
      label: scoreToLabel(avgScore),
      blacklisted: avgScore < SUPPLIER_BLACKLIST_THRESHOLD,
      stockStability: Math.round(
        reps.reduce((s, r) => s + r.stockStability, 0) / reps.length
      ),
      shippingScore: Math.round(
        reps.reduce((s, r) => s + r.shippingScore, 0) / reps.length
      ),
      reliabilityScore: Math.round(
        reps.reduce((s, r) => s + r.reliabilityScore, 0) / reps.length
      ),
      productCount: reps.length,
    };
    await persistSupplierReputation(merged);
    updated += 1;
  }

  return updated;
}
