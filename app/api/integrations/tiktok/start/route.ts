import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isTikTokLoginKitConfigured,
  tiktokAuthUrl,
} from "@/lib/live/destinations/adapters";
import {
  createOAuthState,
  integrationCallbackUrl,
  resolveAppOrigin,
} from "@/lib/live/destinations/oauth-state";
import { isEncryptionConfigured } from "@/lib/live/destinations/encryption";
import { liveStudioLog } from "@/lib/live/observability";

export const dynamic = "force-dynamic";

/**
 * TikTok Login Kit OAuth start.
 * Does NOT enable TikTok LIVE multistream — only account authorization.
 */
export async function GET(req: Request) {
  const origin = resolveAppOrigin(req);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  if (!isTikTokLoginKitConfigured()) {
    liveStudioLog("warn", "tiktok_oauth_start", {
      reason: "not_configured",
      userId: user.id,
    });
    return NextResponse.json(
      {
        error:
          "TikTok Login Kit is not configured. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.",
        status: "not_configured",
      },
      { status: 503 }
    );
  }

  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      { error: "LIVE_DESTINATION_ENCRYPTION_KEY is required" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const returnPath = url.searchParams.get("return") ?? "/communities/live";
  const redirectUri = integrationCallbackUrl("tiktok", origin);

  try {
    const { state } = await createOAuthState({
      userId: user.id,
      platform: "tiktok",
      returnPath,
    });

    const authUrl = tiktokAuthUrl({ state, redirectUri });
    if (!authUrl) {
      liveStudioLog("warn", "tiktok_oauth_start", {
        reason: "invalid_web_redirect_uri",
        userId: user.id,
        redirectHost: (() => {
          try {
            return new URL(redirectUri).host;
          } catch {
            return "invalid";
          }
        })(),
      });
      return NextResponse.json(
        {
          error:
            "TikTok Web Login Kit requires an https redirect URI (not localhost). Check NEXT_PUBLIC_APP_URL.",
          status: "invalid_redirect_uri",
        },
        { status: 503 }
      );
    }

    liveStudioLog("info", "tiktok_oauth_start", {
      userId: user.id,
      redirectHost: new URL(redirectUri).host,
      pkce: false,
    });

    return NextResponse.redirect(authUrl);
  } catch {
    liveStudioLog("error", "tiktok_oauth_start", {
      userId: user.id,
      reason: "state_create_failed",
    });
    return NextResponse.json(
      { error: "Could not start TikTok authorization" },
      { status: 500 }
    );
  }
}
