import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeCatalogFilterCounts } from "@/lib/cj/premium-intelligence/catalog-filter-index";
import { getCatalogScannerStatus } from "@/lib/cj/premium-intelligence/catalog-scanner";
import { computeMarketplacePipelineMetrics } from "@/lib/cj/premium-intelligence/marketplace-pipeline-metrics";
import { getCached, setCached } from "@/lib/cj/premium-intelligence/catalog-cache";

const FILTER_COUNTS_CACHE_KEY = "filter-counts-bundle";
const FILTER_COUNTS_TTL_MS = 120_000;

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdminRole = roles?.some((r) => r.role === "admin") ?? false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return isAdminRole || adminEmails.includes(user.email ?? "");
}

export async function GET(req: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const refresh = new URL(req.url).searchParams.get("refresh") === "1";

  try {
    if (!refresh) {
      const cached = getCached<{
        counts: Awaited<ReturnType<typeof computeCatalogFilterCounts>>;
        pipeline: Awaited<ReturnType<typeof computeMarketplacePipelineMetrics>>;
        scanner: Awaited<ReturnType<typeof getCatalogScannerStatus>>;
      }>(FILTER_COUNTS_CACHE_KEY);
      if (cached) {
        return NextResponse.json({ success: true, ...cached, cached: true });
      }
    }

    const [counts, scanner, pipeline] = await Promise.all([
      computeCatalogFilterCounts(),
      getCatalogScannerStatus(),
      computeMarketplacePipelineMetrics(),
    ]);

    const bundle = { counts, scanner, pipeline };
    setCached(FILTER_COUNTS_CACHE_KEY, bundle, FILTER_COUNTS_TTL_MS);

    return NextResponse.json({ success: true, ...bundle, cached: false });
  } catch (err) {
    console.error("[catalog/filter-counts]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Filter counts unavailable",
        counts: null,
        scanner: null,
        pipeline: null,
      },
      { status: 200 }
    );
  }
}
