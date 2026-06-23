import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-helpers";
import { fetchAdminExportDocument } from "@/lib/admin/export/fetchers";
import { buildExportResponse } from "@/lib/admin/export/response";
import type { ExportFormat, ExportResource } from "@/lib/admin/export/types";

export const runtime = "nodejs";

const RESOURCES = new Set<ExportResource>([
  "orders",
  "products",
  "vendors",
  "payments",
  "users",
  "disputes",
  "messages",
  "reports",
]);

const FORMATS = new Set<ExportFormat>(["csv", "json", "pdf", "xlsx"]);

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const resource = req.nextUrl.searchParams.get("resource") as ExportResource | null;
  const format = (req.nextUrl.searchParams.get("format") ?? "csv") as ExportFormat;

  if (!resource || !RESOURCES.has(resource)) {
    return NextResponse.json({ error: "Invalid export resource" }, { status: 400 });
  }
  if (!FORMATS.has(format)) {
    return NextResponse.json({ error: "Invalid export format" }, { status: 400 });
  }

  try {
    const search = new URLSearchParams(req.nextUrl.searchParams);
    search.delete("resource");
    search.delete("format");

    const doc = await fetchAdminExportDocument(resource, search);
    return await buildExportResponse(doc, format);
  } catch (err) {
    console.error("[admin/export]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 },
    );
  }
}
