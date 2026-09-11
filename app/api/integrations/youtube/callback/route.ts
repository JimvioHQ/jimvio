import { NextResponse } from "next/server";
import {
  exchangeYouTubeCode,
  mapYouTubeOAuthError,
} from "@/lib/live/destinations/adapters";
import {
  consumeOAuthState,
  integrationCallbackUrl,
  resolveAppOrigin,
} from "@/lib/live/destinations/oauth-state";
import { upsertOAuthDestination } from "@/lib/live/destinations/repository";
import { liveStudioLog } from "@/lib/live/observability";

export const dynamic = "force-dynamic";

/** Live Destinations management lives in Live Settings. */
const DEFAULT_RETURN = "/communities/live?open=settings";

function safeReturnPath(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return DEFAULT_RETURN;
  if (path.includes("://") || path.includes("\\")) return DEFAULT_RETURN;
  return path.slice(0, 200);
}

/** Append query params without breaking an existing `?open=settings` return path. */
function withReturnQuery(
  returnPath: string,
  params: Record<string, string>
): string {
  const u = new URL(returnPath, "https://www.jimvio.com");
  for (const [key, value] of Object.entries(params)) {
    u.searchParams.set(key, value);
  }
  // Always surface Live Settings after YouTube OAuth so Connected state is visible.
  if (!u.searchParams.has("open")) {
    u.searchParams.set("open", "settings");
  }
  return `${u.pathname}?${u.searchParams.toString()}`;
}

export async function GET(req: Request) {
  const origin = resolveAppOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (oauthError) {
    liveStudioLog("warn", "youtube_oauth_denied", {
      error: oauthError.slice(0, 80),
    });
    const msg = mapYouTubeOAuthError(oauthError, errorDescription);
    return NextResponse.redirect(
      `${origin}${withReturnQuery(DEFAULT_RETURN, { dest_error: msg })}`
    );
  }

  if (!code || !state) {
    liveStudioLog("warn", "youtube_oauth_callback", {
      reason: "missing_code_or_state",
    });
    return NextResponse.redirect(
      `${origin}${withReturnQuery(DEFAULT_RETURN, {
        dest_error: mapYouTubeOAuthError(null, null),
      })}`
    );
  }

  const consumed = await consumeOAuthState({ state, platform: "youtube" });
  if (!consumed) {
    liveStudioLog("warn", "youtube_oauth_state_invalid", {});
    return NextResponse.redirect(
      `${origin}${withReturnQuery(DEFAULT_RETURN, {
        dest_error: "Invalid or expired YouTube authorization state.",
      })}`
    );
  }

  const returnPath = safeReturnPath(consumed.returnPath);
  const redirectUri = integrationCallbackUrl("youtube", origin);
  const exchanged = await exchangeYouTubeCode({ code, redirectUri });
  if (!exchanged.ok) {
    liveStudioLog("warn", "youtube_oauth_token_exchange_failed", {
      userId: consumed.userId,
      permanent: exchanged.permanent === true,
    });
    return NextResponse.redirect(
      `${origin}${withReturnQuery(returnPath, { dest_error: exchanged.error })}`
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
    liveStudioLog("error", "youtube_oauth_callback", {
      userId: consumed.userId,
      reason: "persist_failed",
    });
    return NextResponse.redirect(
      `${origin}${withReturnQuery(returnPath, {
        dest_error:
          e instanceof Error ? e.message : "Could not save YouTube connection",
      })}`
    );
  }

  liveStudioLog("info", "youtube_oauth_success", {
    userId: consumed.userId,
  });

  return NextResponse.redirect(
    `${origin}${withReturnQuery(returnPath, { dest_connected: "youtube" })}`
  );
}
