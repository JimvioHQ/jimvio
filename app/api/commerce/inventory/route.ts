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
 * Writes an audit row to jimvio_inventory_adjustments when available.
 */
export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    productId?: string;
    variantId?: string | null;
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
  const delta = next - previous;

  if (delta === 0) {
    return NextResponse.json({
      ok: true,
      productId: body.productId,
      previous,
      quantity: previous,
      delta: 0,
    });
  }

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

  const notes =
    typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : null;

  const { error: histErr } = await cosTable(db, "jimvio_inventory_adjustments").insert({
    store_id: body.storeId,
    vendor_id: auth.vendorId,
    product_id: body.productId,
    variant_id: body.variantId ?? null,
    previous_quantity: previous,
    delta,
    new_quantity: Number(updated.inventory_quantity ?? next),
    reason,
    notes,
    reference: null,
    actor_user_id: auth.userId,
  });

  if (histErr) {
    // Stock was updated; history is best-effort until migration is applied.
    console.error("[commerce/inventory] history insert failed:", histErr.message);
  }

  return NextResponse.json({
    ok: true,
    productId: body.productId,
    previous,
    quantity: Number(updated.inventory_quantity ?? next),
    delta,
    reason,
    notes,
    historyRecorded: !histErr,
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required." }, { status: 400 });
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data, error } = await cosTable(db, "jimvio_inventory_adjustments")
    .select(
      "id, product_id, variant_id, previous_quantity, delta, new_quantity, reason, notes, reference, actor_user_id, created_at, products(name)",
    )
    .eq("store_id", storeId)
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: "Inventory history is not available yet.", history: [] },
      { status: 200 },
    );
  }

  return NextResponse.json({ history: data ?? [] });
}
