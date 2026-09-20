import { NextResponse } from "next/server";
import {
  exchangeTwitchCode,
  mapTwitchOAuthError,
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
    liveStudioLog("warn", "twitch_oauth_denied", {
      error: oauthError.slice(0, 80),
    });
    const msg = mapTwitchOAuthError(oauthError, errorDescription);
    return NextResponse.redirect(
      `${origin}${withReturnQuery(DEFAULT_RETURN, { dest_error: msg })}`
    );
  }

  if (!code || !state) {
    liveStudioLog("warn", "twitch_oauth_failed", {
      reason: "missing_code_or_state",
    });
    return NextResponse.redirect(
      `${origin}${withReturnQuery(DEFAULT_RETURN, {
        dest_error: mapTwitchOAuthError(null, null),
      })}`
    );
  }

  const consumed = await consumeOAuthState({ state, platform: "twitch" });
  if (!consumed) {
    liveStudioLog("warn", "twitch_oauth_failed", {
      reason: "invalid_or_expired_state",
    });
    return NextResponse.redirect(
      `${origin}${withReturnQuery(DEFAULT_RETURN, {
        dest_error: "Invalid or expired Twitch authorization state.",
      })}`
    );
  }

  const returnPath = safeReturnPath(consumed.returnPath);
  const redirectUri = integrationCallbackUrl("twitch", origin);
  const exchanged = await exchangeTwitchCode({ code, redirectUri });
  if (!exchanged.ok) {
    liveStudioLog("warn", "twitch_oauth_failed", {
      userId: consumed.userId,
      reason: "token_exchange_failed",
      permanent: exchanged.permanent === true,
    });
    return NextResponse.redirect(
      `${origin}${withReturnQuery(returnPath, { dest_error: exchanged.error })}`
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
      metadata: {
        tokenValidatedAt: new Date().toISOString(),
        tokenValidationStatus: "valid",
        twitchLogin: exchanged.value.login,
      },
    });
  } catch (e) {
    liveStudioLog("error", "twitch_oauth_failed", {
      userId: consumed.userId,
      reason: "persist_failed",
    });
    return NextResponse.redirect(
      `${origin}${withReturnQuery(returnPath, {
        dest_error:
          e instanceof Error ? e.message : "Could not save Twitch connection",
      })}`
    );
  }

  liveStudioLog("info", "twitch_oauth_success", {
    userId: consumed.userId,
  });
  liveStudioLog("info", "twitch_token_valid", {
    userId: consumed.userId,
  });
  liveStudioLog("info", "twitch_connection_created", {
    userId: consumed.userId,
  });

  return NextResponse.redirect(
    `${origin}${withReturnQuery(returnPath, { dest_connected: "twitch" })}`
  );
}
