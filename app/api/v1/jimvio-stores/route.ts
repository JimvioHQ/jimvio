import { NextRequest } from "next/server";
import { cosAdminDb } from "@/lib/commerce-os";
import { authenticateApiKey, apiError } from "@/lib/dropshipping/api/auth";
import { cosTable } from "@/lib/commerce-os/db";

export const dynamic = "force-dynamic";

/** GET /api/v1/jimvio-stores — list native Jimvio stores (stores:read) */
export async function GET(req: NextRequest) {
  const db = cosAdminDb();
  const auth = await authenticateApiKey(
    db,
    req.headers.get("authorization"),
    "stores:read"
  );
  if (!auth.ok) return apiError(auth.status, "unauthorized", auth.error);

  const { data, error } = await cosTable(db, "jimvio_stores")
    .select(
      "id, name, handle, status, default_currency, default_country, primary_domain, published_at, created_at"
    )
    .eq("vendor_id", auth.auth.vendorId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) return apiError(500, "query_failed", error.message);

  return Response.json({
    data: (data ?? []).map((s) => ({
      ...s,
      type: "jimvio_store" as const,
      url: `/s/${s.handle}`,
    })),
  });
}
