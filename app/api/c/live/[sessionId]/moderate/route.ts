import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUserAccessLiveSession } from "@/lib/actions/live-sessions";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json();
  const { action, targetUserId, messageId, reason, durationMinutes = 10 } = body;

  if (!action || !targetUserId) {
    return NextResponse.json({ error: "Action and targetUserId required" }, { status: 400 });
  }

  // Check if user is host or moderator
  const { data: moderator } = await supabase
    .from("live_moderators")
    .select("role, permissions")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: session } = await supabase
    .from("live_sessions")
    .select("host_id")
    .eq("id", sessionId)
    .maybeSingle();

  const isHost = session?.host_id === user.id;
  const isMod = moderator && (moderator.role === "moderator" || moderator.role === "cohost");
  const permissions = moderator?.permissions || {};

  if (!isHost && !isMod) {
    return NextResponse.json({ error: "Not authorized to moderate" }, { status: 403 });
  }

  if (action === "timeout") {
    if (!isHost && !permissions.timeout) {
      return NextResponse.json({ error: "No timeout permission" }, { status: 403 });
    }
    // Timeout: update participant with timeout info
    const until = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("live_session_participants")
      .update({ 
        metadata: { 
          timeout_until: until,
          timeout_reason: reason || "Timed out by moderator",
        }
      })
      .eq("session_id", sessionId)
      .eq("user_id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, until });
  }

  if (action === "ban") {
    if (!isHost && !permissions.ban) {
      return NextResponse.json({ error: "No ban permission" }, { status: 403 });
    }
    // Ban: remove participant and prevent rejoin
    const { error } = await supabase
      .from("live_session_participants")
      .update({ 
        left_at: new Date().toISOString(),
        metadata: { 
          banned: true,
          ban_reason: reason || "Banned by moderator",
        }
      })
      .eq("session_id", sessionId)
      .eq("user_id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "delete_message") {
    if (!isHost && !permissions.delete_messages) {
      return NextResponse.json({ error: "No delete permission" }, { status: 403 });
    }
    if (!messageId) {
      return NextResponse.json({ error: "Message ID required" }, { status: 400 });
    }
    const { error } = await supabase
      .from("live_session_messages")
      .delete()
      .eq("id", messageId)
      .eq("session_id", sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "promote_moderator") {
    if (!isHost) {
      return NextResponse.json({ error: "Only host can promote moderators" }, { status: 403 });
    }
    const { error } = await supabase
      .from("live_moderators")
      .upsert({
        session_id: sessionId,
        user_id: targetUserId,
        role: "moderator",
        permissions: { timeout: true, ban: true, delete_messages: true, manage_polls: true },
        added_by: user.id,
      }, {
        onConflict: "session_id,user_id",
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "demote_moderator") {
    if (!isHost) {
      return NextResponse.json({ error: "Only host can demote moderators" }, { status: 403 });
    }
    const { error } = await supabase
      .from("live_moderators")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}