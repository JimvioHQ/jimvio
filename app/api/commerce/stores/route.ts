import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  createJimvioStore,
} from "@/lib/commerce-os";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = cosAdminDb();
  const { data, error } = await cosTable(db, "jimvio_stores")
    .select(
      "id, name, handle, description, logo_url, status, default_currency, default_country, primary_domain, published_at, created_at, updated_at"
    )
    .eq("vendor_id", auth.vendorId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to list Jimvio stores." },
      { status: 500 }
    );
  }

  return NextResponse.json({ stores: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    handle?: string;
    description?: string | null;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    industry?: string | null;
    defaultCurrency?: string;
    defaultCountry?: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    themeCode?: string;
  } | null;

  if (!body?.name?.trim()) {
    return NextResponse.json(
      { error: "Store name is required." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const result = await createJimvioStore(db, {
    vendorId: auth.vendorId,
    name: body.name,
    handle: body.handle,
    description: body.description,
    logoUrl: body.logoUrl,
    faviconUrl: body.faviconUrl,
    industry: body.industry,
    defaultCurrency: body.defaultCurrency,
    defaultCountry: body.defaultCountry,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    themeCode: body.themeCode,
  });

  if (!result.ok) {
    const status =
      result.code === "ENTITLEMENT"
        ? 403
        : result.code === "HANDLE_TAKEN"
          ? 409
          : 400;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status }
    );
  }

  return NextResponse.json(
    {
      store: {
        id: result.storeId,
        handle: result.handle,
        url: result.url,
        publicUrl: result.publicUrl,
      },
    },
    { status: 201 }
  );
}
