import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";

export const dynamic = "force-dynamic";

const REASONS = new Set([
  "received",
  "damaged",
  "correction",
  "return",
  "manual",
  "other",
]);

/**
 * Merchant inventory adjustment for products published to an owned Jimvio store.
 * Authenticates merchant, verifies store ownership, verifies product link.
 */
export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    productId?: string;
    delta?: number;
    setQuantity?: number;
    reason?: string;
    notes?: string;
  } | null;

  if (!body?.storeId || !body?.productId) {
    return NextResponse.json(
      { error: "storeId and productId are required." },
      { status: 400 },
    );
  }

  const hasDelta = typeof body.delta === "number" && Number.isFinite(body.delta);
  const hasSet =
    typeof body.setQuantity === "number" && Number.isFinite(body.setQuantity);
  if (!hasDelta && !hasSet) {
    return NextResponse.json(
      { error: "Provide delta or setQuantity." },
      { status: 400 },
    );
  }

  const reason = (body.reason || "manual").toLowerCase();
  if (!REASONS.has(reason)) {
    return NextResponse.json({ error: "Invalid adjustment reason." }, { status: 400 });
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data: link } = await cosTable(db, "jimvio_store_products")
    .select("id, product_id")
    .eq("store_id", body.storeId)
    .eq("product_id", body.productId)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (!link) {
    return NextResponse.json(
      { error: "Product is not linked to this store." },
      { status: 404 },
    );
  }

  const { data: product } = await db
    .from("products")
    .select("id, vendor_id, inventory_quantity, track_inventory")
    .eq("id", body.productId)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  if (!product.track_inventory) {
    return NextResponse.json(
      { error: "Inventory tracking is disabled for this product." },
      { status: 400 },
    );
  }

  const previous = Number(product.inventory_quantity ?? 0);
  const next = hasSet
    ? Math.max(0, Math.floor(Number(body.setQuantity)))
    : Math.max(0, Math.floor(previous + Number(body.delta)));

  const { data: updated, error } = await db
    .from("products")
    .update({
      inventory_quantity: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.productId)
    .eq("vendor_id", auth.vendorId)
    .select("id, inventory_quantity")
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message || "Failed to update inventory." },
      { status: 500 },
    );
  }

  // Soft audit trail in store settings metadata is intentionally omitted —
  // no inventory_history table exists. Return the mutation result only.
  return NextResponse.json({
    ok: true,
    productId: body.productId,
    previous,
    quantity: Number(updated.inventory_quantity ?? next),
    reason,
    notes: typeof body.notes === "string" ? body.notes.slice(0, 500) : null,
  });
}
