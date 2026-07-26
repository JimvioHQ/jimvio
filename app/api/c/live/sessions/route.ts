import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createLiveSession,
  getActiveLiveForUser,
  sendDueLiveReminders,
  type LiveChatSettings,
  type LiveSessionPrivacy,
} from "@/services/live/session-service";
import { liveStudioLog } from "@/lib/live/observability";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/** POST — create / schedule a live session. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    liveStudioLog("warn", "security_denied", { action: "session_create", reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(`live-create:${user.id}`, 10, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many live starts — try again shortly" },
      { status: 429 }
    );
  }

  // Opportunistic scheduled reminders (no separate cron required).
  void sendDueLiveReminders(15).catch(() => undefined);

  const body = (await req.json().catch(() => ({}))) as {
    communityId?: string;
    roomId?: string | null;
    spaceId?: string | null;
    title?: string;
    privacy?: LiveSessionPrivacy;
    scheduledAt?: string | null;
    chatSettings?: LiveChatSettings;
  };

  if (!body.communityId) {
    return NextResponse.json({ error: "communityId required" }, { status: 400 });
  }

  const result = await createLiveSession({
    userId: user.id,
    communityId: body.communityId,
    roomId: body.roomId,
    spaceId: body.spaceId,
    title: body.title,
    privacy: body.privacy,
    scheduledAt: body.scheduledAt,
    chatSettings: body.chatSettings,
  });

  if ("error" in result) {
    liveStudioLog("error", "session_create", {
      userId: user.id,
      communityId: body.communityId,
      error: result.error,
    });
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  liveStudioLog("info", "session_create", {
    userId: user.id,
    sessionId: result.session.id,
    communityId: body.communityId,
    status: result.session.status,
  });
  return NextResponse.json({ session: result.session });
}

/** GET — list active sessions for the current user */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  void sendDueLiveReminders(15).catch(() => undefined);

  const sessions = await getActiveLiveForUser(user.id);
  return NextResponse.json({ sessions });
}
