import { NextRequest, NextResponse } from "next/server";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import { connectShopifyStore } from "@/lib/dropshipping/stores/connect-shopify";
import {
  parseAndVerifyShopifyOAuthState,
  safeEqualString,
} from "@/lib/dropshipping/stores/credential-crypto";
import { assertValidShopifyShopDomain } from "@/lib/dropshipping/stores/shopify-domain";
import { parseShopifyScopes } from "@/lib/dropshipping/stores/shopify-scopes";

export const dynamic = "force-dynamic";

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

  const clearCookie = (res: NextResponse) => {
    res.cookies.set("jimvio_shopify_oauth_state", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return res;
  };

  if (oauthError) {
    return clearCookie(
      NextResponse.redirect(
        new URL(
          `/dropshipping/integrations?error=${encodeURIComponent(oauthError)}`,
          url.origin
        )
      )
    );
  }

  if (!code || !shop || !stateParam || !cookieState) {
    return clearCookie(
      NextResponse.json(
        { error: "Invalid OAuth callback. Start again from Integrations." },
        { status: 400 }
      )
    );
  }

  if (!safeEqualString(stateParam, cookieState)) {
    return clearCookie(
      NextResponse.json(
        { error: "OAuth state mismatch. Start Connect again." },
        { status: 400 }
      )
    );
  }

  const verified = parseAndVerifyShopifyOAuthState(stateParam);
  if (!verified.ok) {
    return clearCookie(
      NextResponse.json({ error: verified.error }, { status: 400 })
    );
  }
  const state = verified.payload;

  const domainCheck = assertValidShopifyShopDomain(shop);
  if (!domainCheck.ok) {
    return clearCookie(
      NextResponse.json({ error: domainCheck.error }, { status: 400 })
    );
  }
  const domain = domainCheck.domain;
  if (state.shop !== domain) {
    return clearCookie(
      NextResponse.json(
        { error: "OAuth shop domain does not match the authorize request." },
        { status: 400 }
      )
    );
  }

  // Clear cookie immediately to reduce replay window before token exchange
  // (authorization codes are single-use on Shopify's side)

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
    return clearCookie(
      NextResponse.json(
        {
          error:
            tokenJson?.error_description ||
            tokenJson?.error ||
            "Shopify did not return an access token.",
        },
        { status: 400 }
      )
    );
  }

  const accessToken = tokenJson.access_token;
  // Never log accessToken

  const db = dsAdminDb();
  const scopes = parseShopifyScopes(tokenJson.scope);

  const result = await connectShopifyStore(db, {
    vendorId: state.vendorId,
    shopDomain: domain,
    accessToken,
    scopes,
    registerWebhooks: true,
  });

  const clear = clearCookie(
    NextResponse.redirect(
      result.ok
        ? new URL(`/dropshipping/stores?connected=${result.storeId}`, url.origin)
        : new URL(
            `/dropshipping/integrations?error=${encodeURIComponent(result.error)}`,
            url.origin
          )
    )
  );
  return clear;
}
