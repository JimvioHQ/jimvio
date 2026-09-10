import { NextResponse } from "next/server";
import { exchangeYouTubeCode } from "@/lib/live/destinations/adapters";
import {
  consumeOAuthState,
  integrationCallbackUrl,
  resolveAppOrigin,
} from "@/lib/live/destinations/oauth-state";
import { upsertOAuthDestination } from "@/lib/live/destinations/repository";
import { liveStudioLog } from "@/lib/live/observability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = resolveAppOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !state) {
    return NextResponse.redirect(
      `${origin}/communities/live?dest_error=${encodeURIComponent("YouTube authorization was cancelled.")}`
    );
  }

  const consumed = await consumeOAuthState({ state, platform: "youtube" });
  if (!consumed) {
    return NextResponse.redirect(
      `${origin}/communities/live?dest_error=${encodeURIComponent("Invalid or expired YouTube authorization state.")}`
    );
  }

  const redirectUri = integrationCallbackUrl("youtube", origin);
  const exchanged = await exchangeYouTubeCode({ code, redirectUri });
  if (!exchanged.ok) {
    liveStudioLog("warn", "security_denied", {
      action: "youtube_oauth",
      reason: "exchange_failed",
    });
    return NextResponse.redirect(
      `${origin}${consumed.returnPath}?dest_error=${encodeURIComponent(exchanged.error)}`
    );
  }

  try {
    await upsertOAuthDestination({
      userId: consumed.userId,
      platform: "youtube",
      displayName: exchanged.value.channelTitle,
      providerAccountId: exchanged.value.channelId,
      providerChannelId: exchanged.value.channelId,
      avatarUrl: exchanged.value.avatarUrl,
      credentials: exchanged.value.credentials,
    });
  } catch (e) {
    return NextResponse.redirect(
      `${origin}${consumed.returnPath}?dest_error=${encodeURIComponent(
        e instanceof Error ? e.message : "Could not save YouTube connection"
      )}`
    );
  }

  return NextResponse.redirect(
    `${origin}${consumed.returnPath}?dest_connected=youtube`
  );
}
