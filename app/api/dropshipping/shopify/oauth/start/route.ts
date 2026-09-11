import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireDropshippingMerchant } from "@/lib/dropshipping/tenant";
import { normalizeShopifyDomain } from "@/lib/platform-shopify";

export const dynamic = "force-dynamic";

const DEFAULT_SCOPES = [
  "read_products",
  "write_products",
  "read_orders",
  "write_orders",
  "read_inventory",
  "write_inventory",
  "read_fulfillments",
  "write_fulfillments",
  "read_shipping",
].join(",");

/**
 * Start Shopify OAuth when SHOPIFY_CLIENT_ID is configured.
 * Fallback (no OAuth app): POST /api/dropshipping/stores with
 * { platform: "shopify", domain, accessToken } for token-connect.
 */
export async function GET(req: NextRequest) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const shop = req.nextUrl.searchParams.get("shop")?.trim();

  if (!clientId) {
    return NextResponse.json(
      {
        error: "Shopify OAuth is not configured.",
        code: "OAUTH_NOT_CONFIGURED",
        fallback: {
          method: "POST",
          path: "/api/dropshipping/stores",
          body: {
            platform: "shopify",
            domain: "your-store.myshopify.com",
            accessToken: "shpat_…",
            name: "Optional display name",
          },
          note: "Create a custom app Admin API token in Shopify and use token-connect.",
        },
      },
      { status: 501 }
    );
  }

  if (!shop) {
    return NextResponse.json(
      { error: "Query param `shop` is required (e.g. your-store.myshopify.com)." },
      { status: 400 }
    );
  }

  const domain = normalizeShopifyDomain(shop);
  if (!domain.includes(".")) {
    return NextResponse.json(
      { error: "Provide a full shop domain like your-store.myshopify.com." },
      { status: 400 }
    );
  }

  const origin = req.nextUrl.origin;
  const redirectUri =
    process.env.SHOPIFY_OAUTH_REDIRECT_URI?.trim() ||
    `${origin}/api/dropshipping/shopify/oauth/callback`;

  const state = Buffer.from(
    JSON.stringify({
      vendorId: auth.vendorId,
      userId: auth.userId,
      nonce: randomBytes(16).toString("hex"),
      shop: domain,
    })
  ).toString("base64url");

  const scopes = process.env.SHOPIFY_OAUTH_SCOPES?.trim() || DEFAULT_SCOPES;
  const authorizeUrl = new URL(`https://${domain}/admin/oauth/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", scopes);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set("jimvio_shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
