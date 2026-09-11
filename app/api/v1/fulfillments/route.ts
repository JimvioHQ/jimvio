import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import { authenticateApiKey, apiError } from "@/lib/dropshipping/api/auth";
import { claimIdempotency, completeIdempotency } from "@/lib/dropshipping/api/idempotency";
import { routeOrderFulfillment } from "@/lib/dropshipping/fulfillment/router";

export const dynamic = "force-dynamic";

/** POST /api/v1/fulfillments — route order to supplier (fulfillment:write) */
export async function POST(req: NextRequest) {
  const db = dsAdminDb();
  const auth = await authenticateApiKey(
    db,
    req.headers.get("authorization"),
    "fulfillment:write"
  );
  if (!auth.ok) return apiError(auth.status, "unauthorized", auth.error);

  const idempotencyKey = req.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey) {
    return apiError(400, "idempotency_required", "Idempotency-Key header is required.");
  }

  const body = (await req.json().catch(() => null)) as { order_id?: string } | null;
  if (!body?.order_id) {
    return apiError(400, "invalid_body", "order_id is required.");
  }

  const { data: order } = await db
    .from("orders")
    .select("id")
    .eq("id", body.order_id)
    .eq("vendor_id", auth.auth.vendorId)
    .maybeSingle();

  if (!order) {
    return apiError(404, "order_not_found", "Order not found for this API key tenant.");
  }

  const scope = `api_v1_fulfillments:${auth.auth.vendorId}`;
  const requestHash = createHash("sha256").update(body.order_id).digest("hex");
  const claim = await claimIdempotency(db, {
    vendorId: auth.auth.vendorId,
    scope,
    idempotencyKey,
    requestHash,
  });
  if (claim.hit && claim.responseBody != null) {
    return Response.json(claim.responseBody, { status: claim.responseStatus ?? 200 });
  }

  const result = await routeOrderFulfillment(db, body.order_id);

  if (!result.ok) {
    const status =
      result.code === "INSUFFICIENT_INVENTORY"
        ? 409
        : result.code === "NO_SUPPLIER_LINES" ||
            result.code === "MISSING_VARIANT_MAPPING" ||
            result.code === "INVALID_ADDRESS"
          ? 422
          : 502;
    const responseBody = { error: { code: result.code, message: result.error } };
    await completeIdempotency(db, scope, idempotencyKey, status, responseBody);
    return Response.json(responseBody, { status });
  }

  const responseBody = {
    data: {
      order_id: body.order_id,
      supplier: result.supplierCode,
      supplier_order_id: result.supplierOrderId,
      status: result.status,
    },
  };
  await completeIdempotency(db, scope, idempotencyKey, 200, responseBody);
  return Response.json(responseBody);
}
