import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSchemaHealth } from "@/lib/cj/premium-intelligence/schema-health";
import {
  getCatalogPage,
  getLastListSyncAt,
  getRawCatalogTotal,
  getTierCounts,
} from "@/lib/cj/premium-intelligence/catalog-repository";
import { buildLiteEnrichedFromRaw } from "@/lib/cj/premium-intelligence/score-product";
import { getCached, setCached } from "@/lib/cj/premium-intelligence/catalog-cache";
import { timedQuery } from "@/lib/cj/premium-intelligence/query-timing";
import type { CatalogTier } from "@/lib/cj/premium-intelligence/types";

export const runtime = "nodejs";

const VALID_TIERS: CatalogTier[] = [
  "ELITE",
  "PREMIUM",
  "STANDARD",
  "PENDING",
  "HIDDEN",
];

export async function GET(req: NextRequest): Promise<Response> {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(sp.get("pageSize") ?? "48", 10) || 48)
  );
  const search = sp.get("search") ?? undefined;
  const cursor = sp.get("cursor");
  const sort =
    (sp.get("sort") as "curated" | "health" | "margin" | "orders" | "newest") ??
    "curated";
  const tiersParam = sp.get("tiers");
  const tiers = tiersParam
    ? (tiersParam
        .split(",")
        .filter((t) => VALID_TIERS.includes(t as CatalogTier)) as CatalogTier[])
    : undefined;

  try {
    const health = await getSchemaHealth();
    if (!health.ready) {
      return Response.json(
        {
          success: false,
          error: `Database not ready. Missing tables: ${health.missingTables.join(", ")}.`,
          needsSync: true,
          schemaReady: false,
          missingTables: health.missingTables,
        },
        { status: 503 }
      );
    }

    const rawTotal = await getRawCatalogTotal();
    if (rawTotal === 0) {
      return Response.json({
        success: true,
        products: [],
        total: 0,
        tierCounts: await getTierCounts(),
        lastSyncAt: null,
        needsSync: true,
      });
    }

    const [pageResult, tierCounts, lastSyncAt] = await Promise.all([
      timedQuery("catalog-page", () =>
        getCatalogPage({
          page,
          pageSize,
          search,
          tiers,
          sort: sort === "curated" ? "curated" : sort,
          cursor,
        })
      ),
      getTierCounts(),
      page === 1 ? getLastListSyncAt() : Promise.resolve(getCached<string>("last-sync")),
    ]);

    if (page === 1 && lastSyncAt) {
      setCached("last-sync", lastSyncAt, 60_000);
    }

    const pids = pageResult.products.map((p) => p.pid);
    const importedMap: Record<string, { productId: string }> = {};

    if (pids.length > 0) {
      const admin = createAdminClient();
      const { data: mapRows } = await admin
        .from("cj_product_map")
        .select("cj_pid, product_id")
        .in("cj_pid", pids);

      for (const row of mapRows ?? []) {
        if (row.cj_pid && row.product_id) {
          importedMap[row.cj_pid] = { productId: row.product_id };
        }
      }
    }

    const enriched = pageResult.products.map((row) =>
      buildLiteEnrichedFromRaw(row, row.intelligence, importedMap)
    );

    const catalogTotal = getCached<number>("catalog-filtered-total");
    const filteredTotal =
      pageResult.total >= 0
        ? pageResult.total
        : (catalogTotal ?? rawTotal);

    if (pageResult.total >= 0) {
      setCached("catalog-filtered-total", pageResult.total, 60_000);
    }

    return Response.json({
      success: true,
      products: enriched,
      total: filteredTotal,
      catalogTotal: rawTotal,
      tierCounts,
      lastSyncAt: lastSyncAt ?? null,
      nextCursor: pageResult.nextCursor ?? null,
      needsSync: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog load failed";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
