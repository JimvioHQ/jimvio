import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  acceptSpeaker,
  acceptInvite,
  admitViewer,
  admitAllWaiting,
  averageViewers,
  cancelLiveSession,
  canViewLiveSession,
  createPoll,
  emitLiveReaction,
  endLiveSession,
  getSession,
  inviteSpeaker,
  joinLiveSession,
  leaveLiveSession,
  listParticipants,
  listSessionRecordings,
  muteParticipant,
  rejectSpeaker,
  removeSpeaker,
  requestSpeak,
  sessionDurationSeconds,
  setParticipantRole,
  setWaitingRoomEnabled,
  startScheduledLive,
  transferHost,
  updateLiveChatSettings,
  updateSelfMedia,
  type LiveChatSettings,
} from "@/services/live/session-service";
import type { LiveStageRole } from "@/lib/live/roles";
import { liveStudioLog } from "@/lib/live/observability";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

type ActionBody = {
  action?: string;
  targetUserId?: string;
  micOn?: boolean;
  camOn?: boolean;
  handRaised?: boolean;
  sharing?: boolean;
  question?: string;
  options?: string[];
  role?: LiveStageRole;
  emoji?: string;
  chatSettings?: LiveChatSettings;
  enabled?: boolean;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canViewLiveSession(user.id, session);
  if (!allowed) {
    liveStudioLog("warn", "security_denied", {
      action: "session_get",
      sessionId: id,
      userId: user.id,
      reason: "not_member",
    });
    return NextResponse.json({ error: "No access" }, { status: 403 });
  }

  const url = new URL(req.url);
  const includeRecordings = url.searchParams.get("recordings") === "1";

  const [participants, recordings] = await Promise.all([
    listParticipants(id),
    includeRecordings ? listSessionRecordings(id) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    session,
    participants,
    recordings: recordings ?? undefined,
    metrics: {
      durationSeconds: sessionDurationSeconds(session),
      peakViewers: session.peak_viewers ?? 0,
      averageViewers: averageViewers(session),
      totalWatchSeconds: session.total_watch_seconds ?? 0,
      engagementEvents: session.engagement_events ?? 0,
      viewerCount: session.viewer_count ?? participants.filter((p) => p.status === "joined").length,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`live-session:${user.id}`, 60, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many live actions — try again shortly" },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as ActionBody;
  const action = body.action;

  switch (action) {
    case "join": {
      const result = await joinLiveSession(id, user.id);
      if ("error" in result) {
        liveStudioLog("warn", "session_join", { sessionId: id, userId: user.id, error: result.error });
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      liveStudioLog("info", "session_join", { sessionId: id, userId: user.id });
      return NextResponse.json(result);
    }
    case "leave": {
      const result = await leaveLiveSession(id, user.id);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "end": {
      const result = await endLiveSession(id, user.id);
      if ("error" in result) {
        liveStudioLog("warn", "security_denied", {
          action: "session_end",
          sessionId: id,
          userId: user.id,
          error: result.error,
        });
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      liveStudioLog("info", "session_end", { sessionId: id, userId: user.id });
      return NextResponse.json(result);
    }
    case "start": {
      const result = await startScheduledLive(id, user.id);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "cancel": {
      const result = await cancelLiveSession(id, user.id);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "invite": {
      if (!body.targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
      const result = await inviteSpeaker(id, user.id, body.targetUserId, body.role ?? "speaker");
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "request": {
      const result = await requestSpeak(id, user.id);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "accept-invite": {
      const result = await acceptInvite(id, user.id);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "accept": {
      if (!body.targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
      const result = await acceptSpeaker(id, user.id, body.targetUserId);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "reject": {
      if (!body.targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
      const result = await rejectSpeaker(id, user.id, body.targetUserId);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "remove": {
      if (!body.targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
      const result = await removeSpeaker(id, user.id, body.targetUserId);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "mute": {
      if (!body.targetUserId || typeof body.micOn !== "boolean") {
        return NextResponse.json({ error: "targetUserId and micOn required" }, { status: 400 });
      }
      const result = await muteParticipant(id, user.id, body.targetUserId, body.micOn);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "media": {
      const result = await updateSelfMedia(id, user.id, {
        ...(typeof body.micOn === "boolean" ? { mic_on: body.micOn } : {}),
        ...(typeof body.camOn === "boolean" ? { cam_on: body.camOn } : {}),
        ...(typeof body.sharing === "boolean" ? { sharing: body.sharing } : {}),
      });
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "poll": {
      const result = await createPoll(id, user.id, body.question ?? "", body.options ?? []);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "promote":
    case "set-role": {
      if (!body.targetUserId || !body.role) {
        return NextResponse.json({ error: "targetUserId and role required" }, { status: 400 });
      }
      const result = await setParticipantRole(id, user.id, body.targetUserId, body.role);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "transfer-host": {
      if (!body.targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
      const result = await transferHost(id, user.id, body.targetUserId);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "react": {
      const result = await emitLiveReaction(id, user.id, body.emoji ?? "");
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "report": {
      const session = await getSession(id);
      if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const allowed = await canViewLiveSession(user.id, session);
      if (!allowed) return NextResponse.json({ error: "No access" }, { status: 403 });
      const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
      const db = createServiceRoleClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any).from("live_session_signals").insert({
        session_id: id,
        from_user_id: user.id,
        to_user_id: session.host_id,
        signal_type: "report",
        payload: { reason: "user_report", at: new Date().toISOString() },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      liveStudioLog("info", "session_report", { sessionId: id, userId: user.id });
      return NextResponse.json({ ok: true });
    }
    case "chat-settings": {
      if (!body.chatSettings) {
        return NextResponse.json({ error: "chatSettings required" }, { status: 400 });
      }
      const result = await updateLiveChatSettings(id, user.id, body.chatSettings);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "admit": {
      if (!body.targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
      const result = await admitViewer(id, user.id, body.targetUserId);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "admit-all": {
      const result = await admitAllWaiting(id, user.id);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    case "waiting-room": {
      const enabled = Boolean((body as { enabled?: boolean }).enabled);
      const result = await setWaitingRoomEnabled(id, user.id, enabled);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
