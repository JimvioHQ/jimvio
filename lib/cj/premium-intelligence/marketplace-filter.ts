import { getCatalogDB } from "./db";
import { isCustomerVisibleTier } from "@/lib/cj/import-intelligence/quality-engine";
import type { CatalogTier } from "@/lib/cj/premium-intelligence/types";

/** PIDs of CJ products visible to marketplace customers (Elite + Premium only) */
export async function getCustomerVisibleCjPids(): Promise<Set<string>> {
  const db = getCatalogDB();
  const { data, error } = await db
    .from("cj_product_intelligence")
    .select("pid, catalog_tier")
    .in("catalog_tier", ["ELITE", "PREMIUM"])
    .eq("enrichment_status", "complete");

  if (error || !data) return new Set();

  return new Set(
    data
      .filter((r) => isCustomerVisibleTier(r.catalog_tier as CatalogTier))
      .map((r) => r.pid)
  );
}

/** Filter marketplace product rows — hide CJ products below Premium tier */
export function filterProductsForCustomers<
  T extends { id: string; source?: string | null; source_metadata?: unknown }
>(products: T[], visibleCjPids: Set<string>): T[] {
  return products.filter((p) => {
    if (p.source !== "cj") return true;
    const meta = p.source_metadata as Record<string, unknown> | null | undefined;
    const pid = typeof meta?.cj_pid === "string" ? meta.cj_pid : null;
    if (!pid) return false;
    return visibleCjPids.has(pid);
  });
}
