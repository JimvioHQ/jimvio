import { NextResponse } from "next/server";
import { exchangeFacebookCode } from "@/lib/live/destinations/adapters";
import {
  consumeOAuthState,
  integrationCallbackUrl,
  resolveAppOrigin,
} from "@/lib/live/destinations/oauth-state";
import { upsertOAuthDestination } from "@/lib/live/destinations/repository";
import { platformReadiness } from "@/lib/live/destinations/capabilities";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = resolveAppOrigin(req);

  if (platformReadiness("facebook").status === "requires_approval") {
    return NextResponse.redirect(
      `${origin}/communities/live?dest_error=${encodeURIComponent(
        "Facebook Live requires platform approval."
      )}`
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !state) {
    return NextResponse.redirect(
      `${origin}/communities/live?dest_error=${encodeURIComponent("Facebook authorization was cancelled.")}`
    );
  }

  const consumed = await consumeOAuthState({ state, platform: "facebook" });
  if (!consumed) {
    return NextResponse.redirect(
      `${origin}/communities/live?dest_error=${encodeURIComponent("Invalid or expired Facebook authorization state.")}`
    );
  }

  const redirectUri = integrationCallbackUrl("facebook", origin);
  const exchanged = await exchangeFacebookCode({ code, redirectUri });
  if (!exchanged.ok) {
    return NextResponse.redirect(
      `${origin}${consumed.returnPath}?dest_error=${encodeURIComponent(exchanged.error)}`
    );
  }

  try {
    await upsertOAuthDestination({
      userId: consumed.userId,
      platform: "facebook",
      displayName: exchanged.value.pageName,
      providerAccountId: exchanged.value.pageId,
      providerPageId: exchanged.value.pageId,
      avatarUrl: exchanged.value.avatarUrl,
      credentials: exchanged.value.credentials,
    });
  } catch (e) {
    return NextResponse.redirect(
      `${origin}${consumed.returnPath}?dest_error=${encodeURIComponent(
        e instanceof Error ? e.message : "Could not save Facebook connection"
      )}`
    );
  }

  return NextResponse.redirect(
    `${origin}${consumed.returnPath}?dest_connected=facebook`
  );
}
