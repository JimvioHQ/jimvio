import { NextRequest, NextResponse } from "next/server";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping/tenant";
import { assertCanConnectStore } from "@/lib/dropshipping/entitlements/plans";
import { connectShopifyStore } from "@/lib/dropshipping/stores/connect-shopify";
import { normalizeShopifyDomain } from "@/lib/platform-shopify";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = dsAdminDb();
  const { data, error } = await db
    .from("merchant_stores")
    .select(
      "id, platform, name, domain, status, sync_preferences, last_sync_at, last_sync_status, last_error, connected_at, created_at, updated_at"
    )
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to list stores." },
      { status: 500 }
    );
  }

  return NextResponse.json({ stores: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    platform?: string;
    name?: string;
    domain?: string;
    accessToken?: string;
    scopes?: string[];
  } | null;

  if (!body?.platform) {
    return NextResponse.json(
      { error: "platform is required (shopify | woocommerce | custom)." },
      { status: 400 }
    );
  }

  const db = dsAdminDb();

  if (body.platform === "shopify") {
    if (!body.domain || !body.accessToken) {
      return NextResponse.json(
        {
          error:
            "For Shopify, provide domain and accessToken, or use /api/dropshipping/shopify/oauth/start when SHOPIFY_CLIENT_ID is configured.",
        },
        { status: 400 }
      );
    }
    const result = await connectShopifyStore(db, {
      vendorId: auth.vendorId,
      shopDomain: body.domain,
      accessToken: body.accessToken,
      name: body.name,
      scopes: body.scopes,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === "PLAN_LIMIT" ? 403 : 400 }
      );
    }
    return NextResponse.json(
      {
        store: {
          id: result.storeId,
          platform: "shopify",
          name: result.shopName,
          domain: result.domain,
          status: "connected",
        },
        created: result.created,
      },
      { status: result.created ? 201 : 200 }
    );
  }

  const can = await assertCanConnectStore(db, auth.vendorId);
  if (!can.ok) {
    return NextResponse.json({ error: can.error }, { status: 403 });
  }

  if (body.platform !== "woocommerce" && body.platform !== "custom") {
    return NextResponse.json(
      { error: `Unsupported platform "${body.platform}".` },
      { status: 400 }
    );
  }

  const domain = body.domain ? normalizeShopifyDomain(body.domain) : null;
  const { data, error } = await db
    .from("merchant_stores")
    .insert({
      vendor_id: auth.vendorId,
      platform: body.platform,
      name: body.name || body.domain || `${body.platform} store`,
      domain,
      status: "pending",
    })
    .select(
      "id, platform, name, domain, status, sync_preferences, created_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to create store." },
      { status: 500 }
    );
  }

  return NextResponse.json({ store: data, created: true }, { status: 201 });
}
