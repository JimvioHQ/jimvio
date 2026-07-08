import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeCatalogFilterCounts } from "@/lib/cj/premium-intelligence/catalog-filter-index";
import { getCatalogScannerStatus } from "@/lib/cj/premium-intelligence/catalog-scanner";
import { computeMarketplacePipelineMetrics } from "@/lib/cj/premium-intelligence/marketplace-pipeline-metrics";
import { getCached, setCached } from "@/lib/cj/premium-intelligence/catalog-cache";

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

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const cached = getCached<Awaited<ReturnType<typeof computeCatalogFilterCounts>>>(
    "filter-counts"
  );
  const [counts, scanner, pipeline] = await Promise.all([
    cached ? Promise.resolve(cached) : computeCatalogFilterCounts(),
    getCatalogScannerStatus(),
    computeMarketplacePipelineMetrics(),
  ]);

  if (!cached) {
    setCached("filter-counts", counts, 30_000);
  }

  return NextResponse.json({ success: true, counts, scanner, pipeline });
}
