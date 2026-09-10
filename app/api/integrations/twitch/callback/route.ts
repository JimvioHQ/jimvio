import { NextResponse } from "next/server";
import { exchangeTwitchCode } from "@/lib/live/destinations/adapters";
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
      `${origin}/communities/live?dest_error=${encodeURIComponent("Twitch authorization was cancelled.")}`
    );
  }

  const consumed = await consumeOAuthState({ state, platform: "twitch" });
  if (!consumed) {
    return NextResponse.redirect(
      `${origin}/communities/live?dest_error=${encodeURIComponent("Invalid or expired Twitch authorization state.")}`
    );
  }

  const redirectUri = integrationCallbackUrl("twitch", origin);
  const exchanged = await exchangeTwitchCode({ code, redirectUri });
  if (!exchanged.ok) {
    liveStudioLog("warn", "security_denied", {
      action: "twitch_oauth",
      reason: "exchange_failed",
    });
    return NextResponse.redirect(
      `${origin}${consumed.returnPath}?dest_error=${encodeURIComponent(exchanged.error)}`
    );
  }

  try {
    await upsertOAuthDestination({
      userId: consumed.userId,
      platform: "twitch",
      displayName: exchanged.value.displayName,
      providerAccountId: exchanged.value.accountId,
      providerChannelId: exchanged.value.login,
      avatarUrl: exchanged.value.avatarUrl,
      credentials: exchanged.value.credentials,
    });
  } catch (e) {
    return NextResponse.redirect(
      `${origin}${consumed.returnPath}?dest_error=${encodeURIComponent(
        e instanceof Error ? e.message : "Could not save Twitch connection"
      )}`
    );
  }

  return NextResponse.redirect(
    `${origin}${consumed.returnPath}?dest_connected=twitch`
  );
}
