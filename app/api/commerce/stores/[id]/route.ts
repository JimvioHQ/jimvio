import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  publishJimvioStore,
} from "@/lib/commerce-os";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;
  const db = cosAdminDb();
  const { data, error } = await cosTable(db, "jimvio_stores")
    .select("*")
    .eq("id", id)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  return NextResponse.json({ store: data });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    description?: string | null;
    logo_url?: string | null;
    favicon_url?: string | null;
    industry?: string | null;
    default_currency?: string;
    default_country?: string;
    contact_email?: string | null;
    contact_phone?: string | null;
    announcement_bar?: string | null;
    settings?: Record<string, unknown>;
    branding?: {
      logo_url?: string | null;
      favicon_url?: string | null;
      primaryColor?: string;
    };
    seo?: Record<string, unknown>;
    social?: Record<string, unknown>;
    status?: "draft" | "published" | "paused";
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Request body is required." }, { status: 400 });
  }

  const db = cosAdminDb();
  const { data: existing } = await cosTable(db, "jimvio_stores")
    .select("id, theme_settings, settings")
    .eq("id", id)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (body.description !== undefined) patch.description = body.description;
  if (body.logo_url !== undefined) patch.logo_url = body.logo_url;
  if (body.favicon_url !== undefined) patch.favicon_url = body.favicon_url;
  if (body.industry !== undefined) patch.industry = body.industry;
  if (typeof body.default_currency === "string") {
    patch.default_currency = body.default_currency.toUpperCase();
  }
  if (typeof body.default_country === "string") {
    patch.default_country = body.default_country.toUpperCase();
  }
  if (body.contact_email !== undefined) patch.contact_email = body.contact_email;
  if (body.contact_phone !== undefined) patch.contact_phone = body.contact_phone;
  if (body.announcement_bar !== undefined) {
    patch.announcement_bar = body.announcement_bar;
  }
  if (body.settings && typeof body.settings === "object") {
    patch.settings = {
      ...((existing.settings as Record<string, unknown>) || {}),
      ...body.settings,
    };
  }
  if (body.seo && typeof body.seo === "object") patch.seo = body.seo;
  if (body.social && typeof body.social === "object") patch.social = body.social;
  if (body.status === "draft" || body.status === "paused" || body.status === "published") {
    patch.status = body.status;
  }

  if (body.branding && typeof body.branding === "object") {
    if (body.branding.logo_url !== undefined) patch.logo_url = body.branding.logo_url;
    if (body.branding.favicon_url !== undefined) {
      patch.favicon_url = body.branding.favicon_url;
    }
    if (body.branding.primaryColor) {
      const themeSettings =
        (existing.theme_settings as Record<string, unknown>) || {};
      patch.theme_settings = {
        ...themeSettings,
        primaryColor: body.branding.primaryColor,
      };
    }
  }

  const { data, error } = await cosTable(db, "jimvio_stores")
    .update(patch)
    .eq("id", id)
    .eq("vendor_id", auth.vendorId)
    .select(
      "id, name, handle, description, logo_url, favicon_url, status, settings, theme_settings, announcement_bar, updated_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to update store." },
      { status: 500 }
    );
  }

  return NextResponse.json({ store: data });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    action?: string;
  } | null;

  if (body?.action !== "publish") {
    return NextResponse.json(
      { error: 'Unsupported action. Use { "action": "publish" }.' },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const result = await publishJimvioStore(db, id, auth.vendorId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ published: true, storeId: id });
}
