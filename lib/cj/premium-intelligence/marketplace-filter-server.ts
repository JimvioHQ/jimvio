import "server-only";
import { getCatalogDB } from "./db";
import { isCustomerVisibleTier } from "@/lib/cj/import-intelligence/quality-engine";
import type { CatalogTier } from "@/lib/cj/premium-intelligence/types";
import { getCached, setCached } from "./catalog-cache";
import type { MarketplaceVisibilitySets } from "./marketplace-filter";

const VISIBILITY_CACHE_KEY = "marketplace-visibility-sets";
const VISIBILITY_CACHE_TTL_MS = 300_000;

const INTEL_PAGE_SIZE = 500;

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

/** Load CJ visibility sets — tier gate + auto publish ready + live published + admin override */
export async function getMarketplaceVisibilitySets(): Promise<MarketplaceVisibilitySets> {
  const cached = getCached<MarketplaceVisibilitySets>(VISIBILITY_CACHE_KEY);
  if (cached) return cached;

  const db = getCatalogDB();

  const [intelRows, overrideRes, blacklistRes, livePublishedRes] = await Promise.all([
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
    db
      .from("products")
      .select("id, source_metadata")
      .eq("source", "cj")
      .eq("status", "active")
      .eq("is_active", true)
      .eq("auto_unpublished", false)
      .is("deleted_at", null),
  ]);

  const visibleCjPids = new Set<string>();
  const autoPublishReadyPids = new Set<string>();
  const pidTiers = new Map<string, CatalogTier>();

  for (const row of intelRows) {
    if (row.duplicate_blocked === true) continue;

    const pid = row.pid as string;
    const tier = row.catalog_tier as CatalogTier;
    pidTiers.set(pid, tier);

    if (isCustomerVisibleTier(tier)) {
      visibleCjPids.add(pid);
    }
    if (
      row.auto_publish_ready === true ||
      row.auto_publish_status === "READY" ||
      row.auto_publish_status === "PUBLISHED_BY_ADMIN"
    ) {
      autoPublishReadyPids.add(pid);
    }
  }

  const livePublishedPids = new Set<string>();
  for (const row of livePublishedRes.data ?? []) {
    const meta = row.source_metadata as Record<string, unknown> | null;
    const pid = typeof meta?.cj_pid === "string" ? meta.cj_pid : null;
    if (pid) livePublishedPids.add(pid);
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

  const result = {
    visibleCjPids,
    autoPublishReadyPids,
    livePublishedPids,
    pidTiers,
    adminOverrideProductIds,
    blacklistedSupplierIds,
    blacklistedSupplierNames,
  };

  setCached(VISIBILITY_CACHE_KEY, result, VISIBILITY_CACHE_TTL_MS);
  return result;
}

/** PIDs of CJ products visible to marketplace customers (Elite + Premium only) */
export async function getCustomerVisibleCjPids(): Promise<Set<string>> {
  const sets = await getMarketplaceVisibilitySets();
  return sets.visibleCjPids;
}
