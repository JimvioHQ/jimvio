import { NextRequest } from "next/server";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import { authenticateApiKey, apiError } from "@/lib/dropshipping/api/auth";
import { getSupplierConnector } from "@/lib/dropshipping/suppliers/registry";
import type { SupplierCode } from "@/lib/dropshipping/suppliers/types";

export const dynamic = "force-dynamic";

/** POST /api/v1/shipping/rates — quote supplier shipping (shipping:read) */
export async function POST(req: NextRequest) {
  const db = dsAdminDb();
  const auth = await authenticateApiKey(
    db,
    req.headers.get("authorization"),
    "shipping:read"
  );
  if (!auth.ok) return apiError(auth.status, "unauthorized", auth.error);

  const body = (await req.json().catch(() => null)) as {
    supplier?: string;
    country_code?: string;
    state?: string;
    city?: string;
    postal_code?: string;
    lines?: Array<{ supplier_variant_id: string; quantity: number }>;
  } | null;

  if (!body?.country_code || !body.lines?.length) {
    return apiError(
      400,
      "invalid_body",
      "country_code and lines[{supplier_variant_id, quantity}] are required."
    );
  }

  if (body.country_code.length !== 2) {
    return apiError(400, "invalid_country", "country_code must be a 2-letter ISO code.");
  }

  const supplierCode = (body.supplier || "cj") as SupplierCode;

  try {
    const connector = getSupplierConnector(supplierCode, db);
    const rates = await connector.getShippingRates({
      countryCode: body.country_code.toUpperCase(),
      state: body.state ?? null,
      city: body.city ?? null,
      postalCode: body.postal_code ?? null,
      lines: body.lines.map((l) => ({
        supplierVariantId: l.supplier_variant_id,
        quantity: l.quantity,
      })),
    });
    return Response.json({ data: rates });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Shipping rates are temporarily unavailable.";
    return apiError(502, "shipping_unavailable", message);
  }
}
