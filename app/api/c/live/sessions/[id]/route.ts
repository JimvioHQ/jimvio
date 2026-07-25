import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  acceptSpeaker,
  acceptInvite,
  canViewLiveSession,
  createPoll,
  endLiveSession,
  getSession,
  inviteSpeaker,
  joinLiveSession,
  leaveLiveSession,
  listParticipants,
  muteParticipant,
  rejectSpeaker,
  removeSpeaker,
  requestSpeak,
  updateSelfMedia,
} from "@/services/live/session-service";
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
};

export async function GET(
  _req: Request,
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

  const participants = await listParticipants(id);
  return NextResponse.json({ session, participants });
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
    case "invite": {
      if (!body.targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
      const result = await inviteSpeaker(id, user.id, body.targetUserId);
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
        ...(typeof body.handRaised === "boolean" ? { hand_raised: body.handRaised } : {}),
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
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
