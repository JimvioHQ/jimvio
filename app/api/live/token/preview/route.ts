import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isLiveKitConfigured, getLiveKitUrl } from "@/lib/live/livekit-config";
import { mintAnonymousViewerToken } from "@/lib/live/livekit-token";
import { assertLiveStudioInfra, LiveStudioEnvError } from "@/lib/live/env";
import { liveStudioLog } from "@/lib/live/observability";
import { isCommunityUuid } from "@/lib/community/resolve-community";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/live/token/preview
 * Body: { sessionId: string }
 *
 * Public Live only — issues a hidden, view-only LiveKit JWT for anonymous preview.
 * Never grants publish / data / stage control.
 */
export async function POST(req: Request) {
  try {
    assertLiveStudioInfra();
  } catch (e) {
    if (e instanceof LiveStudioEnvError) {
      return NextResponse.json({ error: e.message, missing: e.missing }, { status: 503 });
    }
    throw e;
  }

  if (!isLiveKitConfigured()) {
    return NextResponse.json({ error: "LiveKit is not configured" }, { status: 503 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(`live-token-preview:${ip}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many preview requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { sessionId?: string };
  const sessionId = body.sessionId?.trim();
  if (!sessionId || !isCommunityUuid(sessionId)) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const db = createServiceRoleClient();
  const { data: session } = await db
    .from("live_sessions")
    .select("id, status, privacy")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const privacy = String(session.privacy ?? "").toLowerCase();
  if (privacy !== "public") {
    liveStudioLog("warn", "token_denied", {
      reason: "preview_not_public",
      sessionId,
    });
    return NextResponse.json({ error: "Preview unavailable" }, { status: 403 });
  }

  if (String(session.status) !== "live") {
    return NextResponse.json({ error: "Session is not live" }, { status: 400 });
  }

  try {
    const minted = await mintAnonymousViewerToken({ sessionId });
    liveStudioLog("info", "token_mint", {
      sessionId,
      role: "viewer",
      canPublish: false,
      anonymous: true,
      roomName: minted.roomName,
    });
    return NextResponse.json({
      token: minted.token,
      url: getLiveKitUrl(),
      roomName: minted.roomName,
      identity: minted.identity,
      role: minted.role,
      canPublish: false,
      anonymous: true,
      sessionId,
    });
  } catch (e) {
    liveStudioLog("error", "token_failed", {
      sessionId,
      error: e instanceof Error ? e.message : "mint_failed",
      anonymous: true,
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Token mint failed" },
      { status: 500 }
    );
  }
}
