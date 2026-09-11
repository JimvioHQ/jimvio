import { NextRequest, NextResponse } from "next/server";
import { requireDropshippingMerchant } from "@/lib/dropshipping/tenant";
import { createShopifyOAuthState } from "@/lib/dropshipping/stores/credential-crypto";
import { assertValidShopifyShopDomain } from "@/lib/dropshipping/stores/shopify-domain";
import { getShopifyOAuthScopes } from "@/lib/dropshipping/stores/shopify-scopes";

export const dynamic = "force-dynamic";

/**
 * Start Shopify OAuth when SHOPIFY_CLIENT_ID is configured.
 * Merchant UI is OAuth-only — do not advertise Admin API token paste here.
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
        error: "Shopify connection is temporarily unavailable. Please try again later.",
        code: "OAUTH_NOT_CONFIGURED",
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

  const domainCheck = assertValidShopifyShopDomain(shop);
  if (!domainCheck.ok) {
    return NextResponse.json({ error: domainCheck.error }, { status: 400 });
  }
  const domain = domainCheck.domain;

  const origin = req.nextUrl.origin;
  const redirectUri =
    process.env.SHOPIFY_OAUTH_REDIRECT_URI?.trim() ||
    `${origin}/api/dropshipping/shopify/oauth/callback`;

  let state: string;
  try {
    state = createShopifyOAuthState({
      vendorId: auth.vendorId,
      userId: auth.userId,
      shop: domain,
      ttlSeconds: 600,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Cannot start OAuth — server signing secret missing.",
        code: "OAUTH_STATE_FAILED",
      },
      { status: 501 }
    );
  }

  const scopes = getShopifyOAuthScopes();
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
