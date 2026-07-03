import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/api-helpers";
import { getCatalogDB } from "@/lib/cj/premium-intelligence/db";
import { timedQuery } from "@/lib/cj/premium-intelligence/query-timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Async badge/score hydration for visible product cards */
export async function GET(req: NextRequest): Promise<Response> {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const pids = (req.nextUrl.searchParams.get("pids") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 60);

  if (pids.length === 0) {
    return Response.json({ success: true, items: {} });
  }

  try {
    const items = await timedQuery("catalog-intelligence-batch", async () => {
      const db = getCatalogDB();
      const { data, error } = await db
        .from("cj_product_intelligence")
        .select(
          "pid, catalog_tier, health_score, badges, enrichment_status, margin_percent, supplier_verified, has_video, trending, opportunity_score, confidence_score"
        )
        .in("pid", pids);

      if (error) throw new Error(error.message);

      const map: Record<string, unknown> = {};
      for (const row of data ?? []) {
        map[row.pid as string] = row;
      }
      return map;
    });

    return Response.json({ success: true, items });
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Intelligence batch failed",
      },
      { status: 500 }
    );
  }
}
