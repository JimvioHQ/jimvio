import { NextRequest, NextResponse } from "next/server";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import { connectShopifyStore } from "@/lib/dropshipping/stores/connect-shopify";
import { normalizeShopifyDomain } from "@/lib/platform-shopify";

export const dynamic = "force-dynamic";

type OAuthState = {
  vendorId: string;
  userId: string;
  nonce: string;
  shop: string;
};

/**
 * Shopify OAuth callback. Requires SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET.
 * If not configured, returns a clear JSON error (not a silent failure).
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: "Shopify OAuth is not configured.",
        code: "OAUTH_NOT_CONFIGURED",
        hint: "Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET, or use token-connect via POST /api/dropshipping/stores.",
      },
      { status: 501 }
    );
  }

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("shop");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieState = req.cookies.get("jimvio_shopify_oauth_state")?.value;

  if (oauthError) {
    return NextResponse.redirect(
      new URL(
        `/dropshipping/integrations?error=${encodeURIComponent(oauthError)}`,
        url.origin
      )
    );
  }

  if (!code || !shop || !stateParam || !cookieState || stateParam !== cookieState) {
    return NextResponse.json(
      { error: "Invalid OAuth callback. Start again from Integrations." },
      { status: 400 }
    );
  }

  let state: OAuthState;
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8")) as OAuthState;
  } catch {
    return NextResponse.json({ error: "OAuth state could not be parsed." }, { status: 400 });
  }

  const domain = normalizeShopifyDomain(shop);
  if (normalizeShopifyDomain(state.shop) !== domain) {
    return NextResponse.json(
      { error: "OAuth shop domain does not match the authorize request." },
      { status: 400 }
    );
  }

  const tokenRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenJson = (await tokenRes.json().catch(() => null)) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!tokenRes.ok || !tokenJson?.access_token) {
    return NextResponse.json(
      {
        error:
          tokenJson?.error_description ||
          tokenJson?.error ||
          "Shopify did not return an access token.",
      },
      { status: 400 }
    );
  }

  const db = dsAdminDb();
  const scopes = (tokenJson.scope || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const result = await connectShopifyStore(db, {
    vendorId: state.vendorId,
    shopDomain: domain,
    accessToken: tokenJson.access_token,
    scopes,
  });

  const clear = NextResponse.redirect(
    result.ok
      ? new URL(`/dropshipping/stores?connected=${result.storeId}`, url.origin)
      : new URL(
          `/dropshipping/integrations?error=${encodeURIComponent(result.error)}`,
          url.origin
        )
  );
  clear.cookies.set("jimvio_shopify_oauth_state", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return clear;
}
