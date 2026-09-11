import { NextRequest } from "next/server";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import { authenticateApiKey, apiError } from "@/lib/dropshipping/api/auth";

export const dynamic = "force-dynamic";

/** GET /api/v1/stores — list merchant stores (stores:read) */
export async function GET(req: NextRequest) {
  const db = dsAdminDb();
  const auth = await authenticateApiKey(
    db,
    req.headers.get("authorization"),
    "stores:read"
  );
  if (!auth.ok) return apiError(auth.status, "unauthorized", auth.error);

  const { data, error } = await db
    .from("merchant_stores")
    .select(
      "id, platform, name, domain, status, last_sync_at, last_sync_status, connected_at, created_at"
    )
    .eq("vendor_id", auth.auth.vendorId)
    .order("created_at", { ascending: false });

  if (error) return apiError(500, "query_failed", error.message);

  return Response.json({ data: data ?? [] });
}
