import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";
import { sanitizeNavItems } from "@/lib/commerce-os/builder/nav-safe";

export const dynamic = "force-dynamic";

type Location = "header" | "footer" | "mobile";

function parseLocation(value: unknown): Location | null {
  if (value === "header" || value === "footer" || value === "mobile") return value;
  return null;
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

  const { data, error } = await cosTable(db, "jimvio_store_navigation")
    .select("id, location, items")
    .eq("store_id", storeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ navigation: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    location?: string;
    items?: unknown;
  } | null;

  const location = parseLocation(body?.location);
  if (!body?.storeId || !location) {
    return NextResponse.json(
      { error: "storeId and location (header|footer|mobile) are required." },
      { status: 400 }
    );
  }

  const items = sanitizeNavItems(body.items);
  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data: existing } = await cosTable(db, "jimvio_store_navigation")
    .select("id")
    .eq("store_id", body.storeId)
    .eq("location", location)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await cosTable(db, "jimvio_store_navigation")
      .update({ items, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("store_id", body.storeId)
      .select("id, location, items")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ navigation: data });
  }

  const { data, error } = await cosTable(db, "jimvio_store_navigation")
    .insert({
      store_id: body.storeId,
      location,
      items,
    })
    .select("id, location, items")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ navigation: data });
}
