import { NextResponse } from "next/server";
import { exchangeTikTokCode } from "@/lib/live/destinations/adapters";
import {
  consumeOAuthState,
  integrationCallbackUrl,
  resolveAppOrigin,
} from "@/lib/live/destinations/oauth-state";
import { upsertOAuthDestination } from "@/lib/live/destinations/repository";
import { liveStudioLog } from "@/lib/live/observability";

export const dynamic = "force-dynamic";

/**
 * TikTok Login Kit OAuth callback.
 * Stores encrypted account credentials only — does not enable LIVE streaming.
 */
export async function GET(req: Request) {
  const origin = resolveAppOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (oauthError) {
    liveStudioLog("warn", "tiktok_oauth_denied", {
      error: oauthError.slice(0, 80),
    });
    const msg =
      oauthError === "access_denied"
        ? "TikTok authorization was cancelled."
        : "TikTok authorization failed.";
    return NextResponse.redirect(
      `${origin}/communities/live?dest_error=${encodeURIComponent(
        errorDescription?.slice(0, 160) || msg
      )}`
    );
  }

  if (!code || !state) {
    liveStudioLog("warn", "tiktok_oauth_callback", {
      reason: "missing_code_or_state",
    });
    return NextResponse.redirect(
      `${origin}/communities/live?dest_error=${encodeURIComponent(
        "TikTok authorization was incomplete."
      )}`
    );
  }

  const consumed = await consumeOAuthState({ state, platform: "tiktok" });
  if (!consumed) {
    liveStudioLog("warn", "tiktok_oauth_state_invalid", {});
    return NextResponse.redirect(
      `${origin}/communities/live?dest_error=${encodeURIComponent(
        "Invalid or expired TikTok authorization state."
      )}`
    );
  }

  const redirectUri = integrationCallbackUrl("tiktok", origin);
  const exchanged = await exchangeTikTokCode({ code, redirectUri });
  if (!exchanged.ok) {
    liveStudioLog("warn", "tiktok_oauth_token_exchange_failed", {
      userId: consumed.userId,
      permanent: exchanged.permanent === true,
    });
    return NextResponse.redirect(
      `${origin}${consumed.returnPath}?dest_error=${encodeURIComponent(exchanged.error)}`
    );
  }

  try {
    await upsertOAuthDestination({
      userId: consumed.userId,
      platform: "tiktok",
      displayName: exchanged.value.displayName,
      providerAccountId: exchanged.value.openId,
      providerChannelId: exchanged.value.openId,
      avatarUrl: exchanged.value.avatarUrl,
      credentials: exchanged.value.credentials,
    });
  } catch (e) {
    liveStudioLog("error", "tiktok_oauth_callback", {
      userId: consumed.userId,
      reason: "persist_failed",
    });
    return NextResponse.redirect(
      `${origin}${consumed.returnPath}?dest_error=${encodeURIComponent(
        e instanceof Error ? e.message : "Could not save TikTok connection"
      )}`
    );
  }

  liveStudioLog("info", "tiktok_oauth_success", {
    userId: consumed.userId,
  });

  return NextResponse.redirect(
    `${origin}${consumed.returnPath}?dest_connected=tiktok`
  );
}
