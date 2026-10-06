import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canRecord } from "@/lib/live/roles";
import { parseParticipantPermissions } from "@/lib/live/participant-permissions";
import { assertLiveStudioInfra, LiveStudioEnvError } from "@/lib/live/env";
import { liveStudioLog } from "@/lib/live/observability";
import { getParticipant, getSession, canViewLiveSession, listSessionRecordings } from "@/services/live/session-service";
import { startSessionEgress, stopSessionEgress } from "@/lib/live/egress";

export const dynamic = "force-dynamic";

/**
 * POST /api/live/sessions/[id]/recording
 * Body: { action: "start" | "stop" }
 * Any joined participant may start/stop LiveKit room-composite Egress when
 * session recording permission allows it. Host/co-host always may.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    assertLiveStudioInfra();
  } catch (e) {
    if (e instanceof LiveStudioEnvError) {
      liveStudioLog("error", "recording_failed", {
        sessionId,
        reason: "env_missing",
        missing: e.missing.join(","),
      });
      return NextResponse.json({ error: e.message, missing: e.missing }, { status: 503 });
    }
    throw e;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    liveStudioLog("warn", "security_denied", { action: "recording", reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") {
    liveStudioLog("warn", "recording_failed", { sessionId, reason: "session_not_live" });
    return NextResponse.json({ error: "Session not live" }, { status: 400 });
  }

  const me = await getParticipant(sessionId, user.id);
  const role = me?.role ?? (session.host_id === user.id ? "host" : "viewer");
  const perms = parseParticipantPermissions(
    (session.settings ?? {}) as Record<string, unknown>
  );
  if (!canRecord(role, { allowParticipantRecording: perms.allowRecording })) {
    liveStudioLog("warn", "security_denied", {
      action: "recording_egress",
      sessionId,
      userId: user.id,
      role,
    });
    return NextResponse.json(
      { error: "Recording is disabled by the host." },
      { status: 403 }
    );
  }

  if (body.action === "start") {
    const result = await startSessionEgress({
      sessionId,
      communityId: session.community_id,
      userId: user.id,
    });
    if ("error" in result) {
      liveStudioLog("error", "recording_failed", {
        sessionId,
        userId: user.id,
        action: "start",
        error: result.error,
      });
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    liveStudioLog("info", "recording_start", {
      sessionId,
      userId: user.id,
      egressId: result.egressId,
      recordingId: result.recordingId,
    });
    return NextResponse.json(result);
  }

  if (body.action === "stop") {
    const result = await stopSessionEgress({ sessionId, userId: user.id });
    if ("error" in result) {
      liveStudioLog("error", "recording_failed", {
        sessionId,
        userId: user.id,
        action: "stop",
        error: result.error,
      });
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    liveStudioLog("info", "recording_stop", {
      sessionId,
      userId: user.id,
      recordingId: result.recordingId,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "action must be start|stop" }, { status: 400 });
}

/** GET — list recording metadata / replay entries for a session. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canViewLiveSession(user.id, session);
  if (!allowed) return NextResponse.json({ error: "No access" }, { status: 403 });

  const recordings = await listSessionRecordings(sessionId);
  const ready = recordings.find((r) => r.status === "ready" && r.cloudinary_url);
  return NextResponse.json({
    recordings,
    recordingStatus: recordings.some((r) =>
      r.status === "recording" || r.status === "active" || r.status === "starting"
    )
      ? "recording"
      : ready
        ? "ready"
        : recordings.length > 0
          ? "processing"
          : "none",
    replayUrl: ready?.cloudinary_url ?? session.recording_url ?? null,
  });
}
