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

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, status, host_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "live" && session.status !== "scheduled") {
    return NextResponse.json({ error: "Session is not live" }, { status: 400 });
  }

  const { data: participant, error } = await supabase
    .from("live_session_participants")
    .upsert({
      session_id: sessionId,
      user_id: user.id,
      role: session.host_id === user.id ? "host" : "viewer",
      joined_at: new Date().toISOString(),
    }, {
      onConflict: "session_id,user_id",
    })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Increment viewer count
  await supabase.rpc("increment_viewer_count", { session_id: sessionId });

  // Update session status if scheduled
  if (session.status === "scheduled") {
    await supabase
      .from("live_sessions")
      .update({
        status: "live",
        started_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  }

  return NextResponse.json({ participant });
}