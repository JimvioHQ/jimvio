import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json(
      { error: "storeId query parameter is required." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data, error } = await cosTable(db, "jimvio_store_discounts")
    .select(
      "id, code, title, discount_type, value, applies_to, min_order_amount, usage_limit, used_count, starts_at, ends_at, is_automatic, is_active, created_at"
    )
    .eq("store_id", storeId)
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to list discounts." },
      { status: 500 }
    );
  }

  return NextResponse.json({ discounts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    title?: string;
    code?: string | null;
    discountType?: "percent" | "fixed" | "free_shipping";
    value?: number;
    appliesTo?: "order" | "products" | "collections" | "shipping";
    minOrderAmount?: number | null;
    usageLimit?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    isAutomatic?: boolean;
    isActive?: boolean;
  } | null;

  if (!body?.storeId || !body?.title?.trim() || !body?.discountType) {
    return NextResponse.json(
      { error: "storeId, title, and discountType are required." },
      { status: 400 }
    );
  }

  if (!["percent", "fixed", "free_shipping"].includes(body.discountType)) {
    return NextResponse.json(
      { error: "discountType must be percent, fixed, or free_shipping." },
      { status: 400 }
    );
  }

  const value = Number(body.value ?? 0);
  if (body.discountType !== "free_shipping" && (!Number.isFinite(value) || value < 0)) {
    return NextResponse.json(
      { error: "value must be a non-negative number." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data, error } = await cosTable(db, "jimvio_store_discounts")
    .insert({
      store_id: body.storeId,
      vendor_id: auth.vendorId,
      title: body.title.trim(),
      code: body.code?.trim() || null,
      discount_type: body.discountType,
      value: body.discountType === "free_shipping" ? 0 : value,
      applies_to: body.appliesTo || "order",
      min_order_amount: body.minOrderAmount ?? null,
      usage_limit: body.usageLimit ?? null,
      starts_at: body.startsAt ?? null,
      ends_at: body.endsAt ?? null,
      is_automatic: Boolean(body.isAutomatic),
      is_active: body.isActive !== false,
    })
    .select(
      "id, code, title, discount_type, value, applies_to, min_order_amount, usage_limit, used_count, starts_at, ends_at, is_automatic, is_active, created_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to create discount." },
      { status: error?.code === "23505" ? 409 : 500 }
    );
  }

  return NextResponse.json({ discount: data }, { status: 201 });
}
