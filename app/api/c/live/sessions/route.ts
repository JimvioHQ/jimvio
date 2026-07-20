import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLiveSession, getActiveLiveForUser } from "@/services/live/session-service";
import { liveStudioLog } from "@/lib/live/observability";

export const dynamic = "force-dynamic";

/** POST — create / start a live session. Body: { communityId, roomId?, title? } */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    liveStudioLog("warn", "security_denied", { action: "session_create", reason: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    communityId?: string;
    roomId?: string | null;
    title?: string;
  };

  if (!body.communityId) {
    return NextResponse.json({ error: "communityId required" }, { status: 400 });
  }

  const result = await createLiveSession({
    userId: user.id,
    communityId: body.communityId,
    roomId: body.roomId,
    title: body.title,
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

  const sessions = await getActiveLiveForUser(user.id);
  return NextResponse.json({ sessions });
}
