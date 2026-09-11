import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { youtubeAuthUrl } from "@/lib/live/destinations/adapters";
import { platformReadiness } from "@/lib/live/destinations/capabilities";
import {
  createOAuthState,
  integrationCallbackUrl,
  resolveAppOrigin,
} from "@/lib/live/destinations/oauth-state";
import { isEncryptionConfigured } from "@/lib/live/destinations/encryption";
import { liveStudioLog } from "@/lib/live/observability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", resolveAppOrigin(req)));
  }

  const readiness = platformReadiness("youtube");
  if (readiness.status === "requires_approval") {
    return NextResponse.json(
      { error: readiness.message ?? "YouTube is not configured" },
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
  const returnPath = url.searchParams.get("return") ?? "/communities/live?open=settings";
  const origin = resolveAppOrigin(req);
  const redirectUri = integrationCallbackUrl("youtube", origin);
  const { state } = await createOAuthState({
    userId: user.id,
    platform: "youtube",
    returnPath,
  });

  const authUrl = youtubeAuthUrl({ state, redirectUri });
  if (!authUrl) {
    return NextResponse.json(
      {
        error:
          "YouTube OAuth is not configured or redirect URI is invalid for production.",
      },
      { status: 503 }
    );
  }

  liveStudioLog("info", "youtube_oauth_start", {
    userId: user.id,
    redirectHost: new URL(redirectUri).host,
  });

  return NextResponse.redirect(authUrl);
}
