import { isCustomerVisibleTier } from "@/lib/cj/import-intelligence/quality-engine";
import type { CatalogTier } from "@/lib/cj/premium-intelligence/types";

export interface MarketplaceVisibilitySets {
  visibleCjPids: Set<string>;
  autoPublishReadyPids: Set<string>;
  livePublishedPids: Set<string>;
  pidTiers: Map<string, CatalogTier>;
  adminOverrideProductIds: Set<string>;
  blacklistedSupplierIds: Set<string>;
  blacklistedSupplierNames: Set<string>;
}

function isMarketplaceVisibleTier(tier: CatalogTier, isLivePublished: boolean): boolean {
  if (isCustomerVisibleTier(tier)) return true;
  if (isLivePublished && tier === "STANDARD") return true;
  return false;
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
 * Marketplace protection — show live published CJ products even when a scan
 * temporarily clears auto_publish_ready. New products still require READY status.
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

    const tier = sets.pidTiers.get(pid) ?? "PENDING";
    const isLive = sets.livePublishedPids.has(pid);

    if (isLive) {
      return tier !== "HIDDEN";
    }

    if (!isMarketplaceVisibleTier(tier, false)) return false;

    return sets.autoPublishReadyPids.has(pid);
  });
}
