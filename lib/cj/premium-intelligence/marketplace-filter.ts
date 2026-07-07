import { getCatalogDB } from "./db";
import { isCustomerVisibleTier } from "@/lib/cj/import-intelligence/quality-engine";
import type { CatalogTier } from "@/lib/cj/premium-intelligence/types";

export interface MarketplaceVisibilitySets {
  visibleCjPids: Set<string>;
  autoPublishReadyPids: Set<string>;
  adminOverrideProductIds: Set<string>;
  blacklistedSupplierIds: Set<string>;
  blacklistedSupplierNames: Set<string>;
}

/** Load CJ visibility sets — tier gate + auto publish ready + admin override + supplier blacklist */
export async function getMarketplaceVisibilitySets(): Promise<MarketplaceVisibilitySets> {
  const db = getCatalogDB();

  const [intelRows, overrideRes, blacklistRes] = await Promise.all([
    fetchAllCompleteIntelligence(db),
    db
      .from("products")
      .select("id, source_metadata")
      .eq("published_by_admin_override", true)
      .eq("status", "active")
      .is("deleted_at", null),
    db
      .from("cj_supplier_reputation")
      .select("supplier_id, supplier_name")
      .eq("blacklisted", true),
  ]);

  const visibleCjPids = new Set<string>();
  const autoPublishReadyPids = new Set<string>();

  for (const row of intelRows) {
    if (row.duplicate_blocked === true) continue;

    const tier = row.catalog_tier as CatalogTier;
    if (isCustomerVisibleTier(tier)) {
      visibleCjPids.add(row.pid as string);
    }
    if (
      row.auto_publish_ready === true ||
      row.auto_publish_status === "READY" ||
      row.auto_publish_status === "PUBLISHED_BY_ADMIN"
    ) {
      autoPublishReadyPids.add(row.pid as string);
    }
  }

  const adminOverrideProductIds = new Set<string>();
  for (const row of overrideRes.data ?? []) {
    adminOverrideProductIds.add(row.id as string);
  }

  const blacklistedSupplierIds = new Set<string>();
  const blacklistedSupplierNames = new Set<string>();
  for (const row of blacklistRes.data ?? []) {
    blacklistedSupplierIds.add(row.supplier_id as string);
    if (row.supplier_name) blacklistedSupplierNames.add(row.supplier_name as string);
  }

  return {
    visibleCjPids,
    autoPublishReadyPids,
    adminOverrideProductIds,
    blacklistedSupplierIds,
    blacklistedSupplierNames,
  };
}

/** PIDs of CJ products visible to marketplace customers (Elite + Premium only) */
export async function getCustomerVisibleCjPids(): Promise<Set<string>> {
  const sets = await getMarketplaceVisibilitySets();
  return sets.visibleCjPids;
}

function isBlacklistedSupplier(
  meta: Record<string, unknown> | null | undefined,
  sets: MarketplaceVisibilitySets
): boolean {
  const supplierId = typeof meta?.supplier_id === "string" ? meta.supplier_id : null;
  const supplierName = typeof meta?.supplier_name === "string" ? meta.supplier_name : null;
  if (supplierId && sets.blacklistedSupplierIds.has(supplierId)) return true;
  if (supplierName && sets.blacklistedSupplierNames.has(supplierName)) return true;
  return false;
}

/**
 * Marketplace protection v3 — only Ready, Published, or Admin Override.
 * Never shows: Draft, Pending, Requirements Missing, Unpublished, Blacklisted Supplier.
 */
export function filterProductsForCustomers<
  T extends {
    id: string;
    source?: string | null;
    source_metadata?: unknown;
    published_by_admin_override?: boolean | null;
    auto_unpublished?: boolean | null;
  }
>(products: T[], sets: MarketplaceVisibilitySets): T[] {
  return products.filter((p) => {
    if (p.source !== "cj") return true;

    if (p.auto_unpublished) return false;

    if (p.published_by_admin_override || sets.adminOverrideProductIds.has(p.id)) {
      return true;
    }

    const meta = p.source_metadata as Record<string, unknown> | null | undefined;
    if (isBlacklistedSupplier(meta, sets)) return false;

    const pid = typeof meta?.cj_pid === "string" ? meta.cj_pid : null;
    if (!pid) return false;

    if (!sets.visibleCjPids.has(pid)) return false;

    return sets.autoPublishReadyPids.has(pid);
  });
}

const INTEL_PAGE_SIZE = 1000;

async function fetchAllCompleteIntelligence(
  db: ReturnType<typeof getCatalogDB>
): Promise<
  Array<{
    pid: string;
    catalog_tier: string;
    auto_publish_ready: boolean;
    auto_publish_status: string;
    duplicate_blocked: boolean | null;
  }>
> {
  const rows: Array<{
    pid: string;
    catalog_tier: string;
    auto_publish_ready: boolean;
    auto_publish_status: string;
    duplicate_blocked: boolean | null;
  }> = [];

  for (let offset = 0; ; offset += INTEL_PAGE_SIZE) {
    const { data, error } = await db
      .from("cj_product_intelligence")
      .select("pid, catalog_tier, auto_publish_ready, auto_publish_status, duplicate_blocked")
      .eq("enrichment_status", "complete")
      .order("pid")
      .range(offset, offset + INTEL_PAGE_SIZE - 1);

    if (error || !data?.length) break;
    rows.push(...(data as typeof rows));
    if (data.length < INTEL_PAGE_SIZE) break;
  }

  return rows;
}
