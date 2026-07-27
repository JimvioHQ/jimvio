import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";
import {
  canViewLiveSession,
  getParticipant,
  getSession,
  listLiveSessionMessages,
  postLiveSessionMessage,
} from "@/services/live/session-service";

export const dynamic = "force-dynamic";

/**
 * Creator Live (and any session without a community room) chat
 * backed by live_session_messages.
 */
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

  const messages = await listLiveSessionMessages(sessionId, 100);
  return NextResponse.json({ messages });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`live-chat:${user.id}`, 90, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many messages — try again shortly" },
      { status: 429 }
    );
  }

  const session = await getSession(sessionId);
  if (!session || session.status !== "live") {
    return NextResponse.json({ error: "Session not live" }, { status: 400 });
  }
  const allowed = await canViewLiveSession(user.id, session);
  if (!allowed) return NextResponse.json({ error: "No access" }, { status: 403 });

  const me = await getParticipant(sessionId, user.id);
  if (!me || (me.status !== "joined" && me.status !== "invited")) {
    return NextResponse.json({ error: "Join the session first" }, { status: 403 });
  }

  const settings = (session.settings ?? {}) as {
    chat?: { slow_mode_seconds?: number };
  };
  const slow = Math.max(0, Number(settings.chat?.slow_mode_seconds ?? 0));
  if (slow > 0) {
    const recent = await listLiveSessionMessages(sessionId, 1, user.id);
    const last = recent[0];
    if (last?.created_at) {
      const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
      if (elapsed < slow) {
        return NextResponse.json(
          { error: `Slow mode — wait ${Math.ceil(slow - elapsed)}s` },
          { status: 429 }
        );
      }
    }
  }

  const body = (await req.json().catch(() => ({}))) as {
    body?: string;
    reply_to_id?: string | null;
    reply_to_body?: string | null;
    reply_to_sender?: string | null;
  };
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });

  const result = await postLiveSessionMessage({
    sessionId,
    userId: user.id,
    body: text,
    replyToId: body.reply_to_id ?? null,
    replyToBody: body.reply_to_body ?? null,
    replyToSender: body.reply_to_sender ?? null,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ message: result.message });
}
