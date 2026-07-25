import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLiveKitConfigured, getLiveKitUrl } from "@/lib/live/livekit-config";
import { mintLiveKitToken } from "@/lib/live/livekit-token";
import { assertLiveStudioInfra, LiveStudioEnvError } from "@/lib/live/env";
import { liveStudioLog } from "@/lib/live/observability";
import type { LiveStageRole } from "@/lib/live/roles";
import {
  getParticipant,
  getSession,
  joinLiveSession,
} from "@/services/live/session-service";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/live/token
 * Body: { sessionId: string }
 *
 * Auth (Supabase) → membership → live role → LiveKit JWT.
 * Never issues tokens without role verification.
 */
export async function POST(req: Request) {
  try {
    assertLiveStudioInfra();
  } catch (e) {
    if (e instanceof LiveStudioEnvError) {
      liveStudioLog("error", "token_failed", { reason: "env_missing", missing: e.missing.join(",") });
      return NextResponse.json({ error: e.message, missing: e.missing }, { status: 503 });
    }
    throw e;
  }

  if (!isLiveKitConfigured()) {
    liveStudioLog("error", "token_failed", { reason: "livekit_unconfigured" });
    return NextResponse.json(
      { error: "LiveKit is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    liveStudioLog("warn", "token_denied", { reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(`live-token:${user.id}`, 40, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many token requests — try again shortly" },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { sessionId?: string };
  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    liveStudioLog("warn", "token_denied", { reason: "missing_session", userId: user.id });
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    liveStudioLog("warn", "token_denied", { reason: "session_not_found", sessionId, userId: user.id });
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "live") {
    liveStudioLog("warn", "token_denied", { reason: "session_not_live", sessionId, userId: user.id });
    return NextResponse.json({ error: "Session is not live" }, { status: 400 });
  }

  let participant = await getParticipant(sessionId, user.id);
  if (!participant || participant.status === "left") {
    const joined = await joinLiveSession(sessionId, user.id);
    if ("error" in joined) {
      liveStudioLog("warn", "token_denied", {
        reason: "join_failed",
        sessionId,
        userId: user.id,
        error: joined.error,
      });
      return NextResponse.json({ error: joined.error }, { status: joined.status });
    }
    participant = joined.participant;
  }

  if (participant.status === "removed" || participant.status === "rejected") {
    liveStudioLog("warn", "security_denied", {
      action: "token",
      sessionId,
      userId: user.id,
      status: participant.status,
    });
    return NextResponse.json({ error: "Not allowed in this session" }, { status: 403 });
  }

  const role: LiveStageRole =
    participant.role || (session.host_id === user.id ? "host" : "viewer");

  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();

  try {
    const minted = await mintLiveKitToken({
      userId: user.id,
      displayName: profile?.full_name || profile?.username || null,
      sessionId,
      role,
    });

    liveStudioLog("info", "token_mint", {
      sessionId,
      userId: user.id,
      role: minted.role,
      canPublish: minted.canPublish,
      roomName: minted.roomName,
    });

    return NextResponse.json({
      token: minted.token,
      url: getLiveKitUrl(),
      roomName: minted.roomName,
      identity: minted.identity,
      role: minted.role,
      canPublish: minted.canPublish,
      sessionId,
    });
  } catch (e) {
    liveStudioLog("error", "token_failed", {
      sessionId,
      userId: user.id,
      error: e instanceof Error ? e.message : "mint_failed",
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Token mint failed" },
      { status: 500 }
    );
  }
}
