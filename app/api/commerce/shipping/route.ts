import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";

export const dynamic = "force-dynamic";

const RATE_TYPES = new Set(["flat", "free", "price"]);

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
  if (!(await assertStoreOwnedByVendor(db, storeId, auth.vendorId))) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data, error } = await cosTable(db, "jimvio_shipping_zones")
    .select(
      "id, name, countries, created_at, jimvio_shipping_rates(id, name, rate_type, price, currency, min_order_amount, max_order_amount)",
    )
    .eq("store_id", storeId)
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load shipping zones." }, { status: 500 });
  }
  return NextResponse.json({ zones: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    name?: string;
    countries?: string[];
    rate?: {
      name?: string;
      rate_type?: string;
      price?: number;
      currency?: string;
      min_order_amount?: number | null;
      max_order_amount?: number | null;
    };
  } | null;

  if (!body?.storeId || !body?.name?.trim()) {
    return NextResponse.json(
      { error: "Store and zone name are required." },
      { status: 400 },
    );
  }

  const db = cosAdminDb();
  if (!(await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId))) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const countries = Array.isArray(body.countries)
    ? body.countries.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
    : [];

  const { data: zone, error } = await cosTable(db, "jimvio_shipping_zones")
    .insert({
      store_id: body.storeId,
      vendor_id: auth.vendorId,
      name: body.name.trim().slice(0, 120),
      countries,
    })
    .select("id, name, countries")
    .single();

  if (error || !zone) {
    return NextResponse.json(
      { error: "Could not create shipping zone." },
      { status: 500 },
    );
  }

  let rate = null;
  if (body.rate?.name?.trim()) {
    const rateType = (body.rate.rate_type || "flat").toLowerCase();
    if (!RATE_TYPES.has(rateType)) {
      return NextResponse.json(
        { error: "Unsupported rate type. Use flat, free, or price-based." },
        { status: 400 },
      );
    }
    const price =
      rateType === "free" ? 0 : Math.max(0, Number(body.rate.price || 0));
    const { data: rateRow, error: rateErr } = await cosTable(
      db,
      "jimvio_shipping_rates",
    )
      .insert({
        zone_id: zone.id,
        name: body.rate.name.trim().slice(0, 120),
        rate_type: rateType,
        price,
        currency: (body.rate.currency || "USD").toUpperCase(),
        min_order_amount: body.rate.min_order_amount ?? null,
        max_order_amount: body.rate.max_order_amount ?? null,
      })
      .select("id, name, rate_type, price, currency")
      .single();
    if (rateErr) {
      return NextResponse.json(
        { error: "Zone created but rate could not be saved." },
        { status: 500 },
      );
    }
    rate = rateRow;
  }

  return NextResponse.json({ zone, rate }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    zoneId?: string;
    name?: string;
    countries?: string[];
  } | null;

  if (!body?.storeId || !body?.zoneId) {
    return NextResponse.json(
      { error: "storeId and zoneId are required." },
      { status: 400 },
    );
  }

  const db = cosAdminDb();
  if (!(await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId))) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 120);
  }
  if (Array.isArray(body.countries)) {
    patch.countries = body.countries
      .map((c) => String(c).trim().toUpperCase())
      .filter(Boolean);
  }

  const { data, error } = await cosTable(db, "jimvio_shipping_zones")
    .update(patch)
    .eq("id", body.zoneId)
    .eq("store_id", body.storeId)
    .eq("vendor_id", auth.vendorId)
    .select("id, name, countries")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Zone not found." }, { status: 404 });
  }
  return NextResponse.json({ zone: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  const zoneId = req.nextUrl.searchParams.get("zoneId");
  if (!storeId || !zoneId) {
    return NextResponse.json(
      { error: "storeId and zoneId are required." },
      { status: 400 },
    );
  }

  const db = cosAdminDb();
  if (!(await assertStoreOwnedByVendor(db, storeId, auth.vendorId))) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  // Rates cascade via FK ON DELETE CASCADE on zone_id.
  const { error } = await cosTable(db, "jimvio_shipping_zones")
    .delete()
    .eq("id", zoneId)
    .eq("store_id", storeId)
    .eq("vendor_id", auth.vendorId);

  if (error) {
    return NextResponse.json({ error: "Could not delete zone." }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
