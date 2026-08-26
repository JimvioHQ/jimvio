import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCommunityUuid } from "@/lib/community/resolve-community";
import { rateLimit } from "@/lib/ops/rate-limit";
import { liveStudioLog } from "@/lib/live/observability";
import { canViewLiveSession, getSession } from "@/services/live/session-service";
import { LIVE_SHARE_CLIENT_MESSAGE } from "@/lib/live/share-messages";
import { shareLiveToInbox } from "@/services/live/share-live";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  if (!isCommunityUuid(sessionId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(`live-share:${user.id}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many share attempts — try again shortly" },
      { status: 429 }
    );
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canViewLiveSession(user.id, session);
  if (!allowed) {
    liveStudioLog("warn", "security_denied", {
      action: "live_share",
      sessionId,
      userId: user.id,
      reason: "no_view_access",
    });
    return NextResponse.json(
      { error: LIVE_SHARE_CLIENT_MESSAGE.no_access, code: "no_access" },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    conversationId?: string;
    url?: string;
    senderId?: string;
    liveId?: string;
    communityId?: string;
  };

  // Client-supplied sender / URL / live / community IDs are ignored.
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId : "";

  const result = await shareLiveToInbox({
    supabase,
    session,
    senderId: user.id,
    conversationId,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status }
    );
  }

  liveStudioLog("info", "unhandled", {
    action: "live_share",
    sessionId,
    userId: user.id,
  });
  return NextResponse.json({ ok: true, url: result.url });
}
