import { NextRequest } from "next/server";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import { authenticateApiKey, apiError } from "@/lib/dropshipping/api/auth";
import { listRegisteredSuppliers } from "@/lib/dropshipping/suppliers/registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/connections — store + supplier connection status (stores:read).
 * Does not expose credentials or tokens.
 */
export async function GET(req: NextRequest) {
  const db = dsAdminDb();
  const auth = await authenticateApiKey(
    db,
    req.headers.get("authorization"),
    "stores:read"
  );
  if (!auth.ok) return apiError(auth.status, "unauthorized", auth.error);

  const { data: stores, error } = await db
    .from("merchant_stores")
    .select(
      "id, platform, name, domain, status, last_sync_at, last_sync_status, last_error, connected_at"
    )
    .eq("vendor_id", auth.auth.vendorId)
    .order("created_at", { ascending: false });

  if (error) return apiError(500, "query_failed", error.message);

  const suppliers = listRegisteredSuppliers().map((code) => ({
    code,
    status: code === "cj" ? "available" : "not_configured",
  }));

  return Response.json({
    data: {
      stores: stores ?? [],
      suppliers,
    },
  });
}
