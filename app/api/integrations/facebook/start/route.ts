import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { facebookAuthUrl } from "@/lib/live/destinations/adapters";
import { platformReadiness } from "@/lib/live/destinations/capabilities";
import {
  createOAuthState,
  integrationCallbackUrl,
  resolveAppOrigin,
} from "@/lib/live/destinations/oauth-state";
import { isEncryptionConfigured } from "@/lib/live/destinations/encryption";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const readiness = platformReadiness("facebook");
  if (readiness.status === "requires_approval") {
    return NextResponse.json(
      {
        error:
          readiness.message ??
          "Facebook Live requires Meta Live Video API access and App Review.",
        status: "requires_approval",
      },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", resolveAppOrigin(req)));
  }

  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      { error: "LIVE_DESTINATION_ENCRYPTION_KEY is required" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const returnPath = url.searchParams.get("return") ?? "/communities/live";
  const origin = resolveAppOrigin(req);
  const redirectUri = integrationCallbackUrl("facebook", origin);
  const { state } = await createOAuthState({
    userId: user.id,
    platform: "facebook",
    returnPath,
  });

  const authUrl = facebookAuthUrl({ state, redirectUri });
  if (!authUrl) {
    return NextResponse.json(
      { error: "Facebook Live requires platform approval." },
      { status: 403 }
    );
  }

  return NextResponse.redirect(authUrl);
}
