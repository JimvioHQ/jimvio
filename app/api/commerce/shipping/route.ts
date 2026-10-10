import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";
import {
  normalizeCountryCodes,
  overlappingCountries,
  validateShippingRate,
} from "@/lib/commerce-os/shipping/validate";

export const dynamic = "force-dynamic";

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
      "id, name, countries, is_active, created_at, jimvio_shipping_rates(id, name, rate_type, price, currency, min_order_amount, max_order_amount, is_active)",
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
    zoneId?: string;
    is_active?: boolean;
    rate?: {
      name?: string;
      rate_type?: string;
      price?: number;
      currency?: string;
      min_order_amount?: number | null;
      max_order_amount?: number | null;
      is_active?: boolean;
    };
  } | null;

  if (!body?.storeId || (!body.zoneId && !body?.name?.trim())) {
    return NextResponse.json(
      { error: "Store and zone name are required." },
      { status: 400 },
    );
  }

  const db = cosAdminDb();
  if (!(await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId))) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const countries = normalizeCountryCodes(body.countries);
  if (Array.isArray(body.countries) && countries.length !== body.countries.filter((c) => String(c).trim()).length) {
    return NextResponse.json(
      { error: "Use 2-letter country codes such as RW or US." },
      { status: 400 },
    );
  }

  if (!body.zoneId) {
    const { data: existingZones } = await cosTable(db, "jimvio_shipping_zones")
      .select("countries")
      .eq("store_id", body.storeId)
      .eq("vendor_id", auth.vendorId);
    const overlap = overlappingCountries(
      (existingZones ?? []).map((z) =>
        Array.isArray(z.countries) ? (z.countries as string[]) : [],
      ),
      countries,
    );
    if (overlap.length) {
      return NextResponse.json(
        {
          error: overlap.includes("ALL")
            ? "A zone that covers every country conflicts with existing zones."
            : `These countries are already in another zone: ${overlap.join(", ")}.`,
        },
        { status: 400 },
      );
    }
  }

  let zone: { id: string; name: string; countries: string[] } | null = null;
  if (body.zoneId) {
    const { data: existingZone } = await cosTable(db, "jimvio_shipping_zones")
      .select("id, name, countries")
      .eq("id", body.zoneId)
      .eq("store_id", body.storeId)
      .eq("vendor_id", auth.vendorId)
      .maybeSingle();
    if (!existingZone) {
      return NextResponse.json({ error: "Zone not found." }, { status: 404 });
    }
    zone = {
      id: existingZone.id,
      name: existingZone.name,
      countries: Array.isArray(existingZone.countries) ? existingZone.countries : [],
    };
  } else {
  const { data: createdZone, error } = await cosTable(db, "jimvio_shipping_zones")
    .insert({
      store_id: body.storeId,
      vendor_id: auth.vendorId,
      name: body.name!.trim().slice(0, 120),
      countries,
      is_active: body.is_active !== false,
    })
    .select("id, name, countries")
    .single();

  if (error || !createdZone) {
    return NextResponse.json(
      { error: "Could not create shipping zone." },
      { status: 500 },
    );
  }
    zone = createdZone;
  }

  if (!zone) {
    return NextResponse.json({ error: "Could not create shipping zone." }, { status: 500 });
  }

  let rate = null;
  if (body.rate?.name?.trim()) {
    const validated = validateShippingRate(body.rate);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const { data: rateRow, error: rateErr } = await cosTable(
      db,
      "jimvio_shipping_rates",
    )
      .insert({
        zone_id: zone.id,
        name: validated.name,
        rate_type: validated.rate_type,
        price: validated.price,
        currency: validated.currency,
        min_order_amount: validated.min_order_amount,
        max_order_amount: validated.max_order_amount,
        is_active: body.rate.is_active !== false,
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
    rateId?: string;
    name?: string;
    countries?: string[];
    is_active?: boolean;
    rate?: {
      name?: string;
      rate_type?: string;
      price?: number;
      currency?: string;
      min_order_amount?: number | null;
      max_order_amount?: number | null;
      is_active?: boolean;
    };
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
  if (typeof body.is_active === "boolean") {
    patch.is_active = body.is_active;
  }
  if (Array.isArray(body.countries)) {
    const countries = normalizeCountryCodes(body.countries);
    if (countries.length !== body.countries.filter((c) => String(c).trim()).length) {
      return NextResponse.json(
        { error: "Use 2-letter country codes such as RW or US." },
        { status: 400 },
      );
    }
    const { data: existingZones } = await cosTable(db, "jimvio_shipping_zones")
      .select("id, countries")
      .eq("store_id", body.storeId)
      .eq("vendor_id", auth.vendorId);
    const overlap = overlappingCountries(
      (existingZones ?? [])
        .filter((z) => z.id !== body.zoneId)
        .map((z) => (Array.isArray(z.countries) ? (z.countries as string[]) : [])),
      countries,
    );
    if (overlap.length) {
      return NextResponse.json(
        {
          error: overlap.includes("ALL")
            ? "A zone that covers every country conflicts with existing zones."
            : `These countries are already in another zone: ${overlap.join(", ")}.`,
        },
        { status: 400 },
      );
    }
    patch.countries = countries;
  }

  if (body.rateId && body.rate) {
    const validated = validateShippingRate(body.rate);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const { data: zoneRow } = await cosTable(db, "jimvio_shipping_zones")
      .select("id")
      .eq("id", body.zoneId)
      .eq("store_id", body.storeId)
      .eq("vendor_id", auth.vendorId)
      .maybeSingle();
    if (!zoneRow) {
      return NextResponse.json({ error: "Zone not found." }, { status: 404 });
    }
    const { data: rate, error: rateError } = await cosTable(db, "jimvio_shipping_rates")
      .update({
        name: validated.name,
        rate_type: validated.rate_type,
        price: validated.price,
        currency: validated.currency,
        min_order_amount: validated.min_order_amount,
        max_order_amount: validated.max_order_amount,
        ...(typeof body.rate.is_active === "boolean" ? { is_active: body.rate.is_active } : {}),
      })
      .eq("id", body.rateId)
      .eq("zone_id", body.zoneId)
      .select("id, name, rate_type, price, currency, is_active")
      .maybeSingle();
    if (rateError || !rate) {
      return NextResponse.json({ error: "Rate not found." }, { status: 404 });
    }
    return NextResponse.json({ rate });
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
  const rateId = req.nextUrl.searchParams.get("rateId");
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

  if (rateId) {
    const { data: zoneRow } = await cosTable(db, "jimvio_shipping_zones")
      .select("id")
      .eq("id", zoneId)
      .eq("store_id", storeId)
      .eq("vendor_id", auth.vendorId)
      .maybeSingle();
    if (!zoneRow) {
      return NextResponse.json({ error: "Zone not found." }, { status: 404 });
    }
    const { error: rateError } = await cosTable(db, "jimvio_shipping_rates")
      .delete()
      .eq("id", rateId)
      .eq("zone_id", zoneId);
    if (rateError) {
      return NextResponse.json({ error: "Could not delete rate." }, { status: 500 });
    }
    return NextResponse.json({ deleted: true });
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
