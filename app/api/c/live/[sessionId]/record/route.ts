import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, host_id, status, stream_key, recording_url, recording_started_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.host_id !== user.id) {
    return NextResponse.json({ error: "Only host can control recording" }, { status: 403 });
  }

  if (session.status !== "live") {
    return NextResponse.json({ error: "Session must be live to record" }, { status: 400 });
  }

  const body = await request.json();
  const action = body.action; // "start" | "stop"

  if (action === "start") {
    if (session.recording_started_at) {
      return NextResponse.json({ error: "Recording already in progress" }, { status: 400 });
    }

    // Create recording record
    const { data: recording, error } = await supabase
      .from("live_recordings")
      .insert({
        session_id: sessionId,
        space_id: (await supabase.from("live_sessions").select("space_id").eq("id", sessionId).single()).data?.space_id,
        community_id: (await supabase.from("live_sessions").select("community_id").eq("id", sessionId).single()).data?.community_id,
        host_id: user.id,
        title: (await supabase.from("live_sessions").select("title").eq("id", sessionId).single()).data?.title || "Live Recording",
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update session with recording info
    await supabase
      .from("live_sessions")
      .update({
        recording_url: `recording_${recording.id}`,
        recording_started_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return NextResponse.json({ 
      recording: {
        id: recording.id,
        startedAt: recording.started_at,
      }
    });
  }

  if (action === "stop") {
    if (!session.recording_started_at) {
      return NextResponse.json({ error: "No recording in progress" }, { status: 400 });
    }

    const endedAt = new Date().toISOString();
    const durationSeconds = Math.floor((new Date(endedAt).getTime() - new Date(session.recording_started_at).getTime()) / 1000);

    // Update recording with end time and duration
    await supabase
      .from("live_recordings")
      .update({
        status: "ready",
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        completed_at: endedAt,
      })
      .eq("session_id", sessionId)
      .eq("status", "processing");

    // Update session
    await supabase
      .from("live_sessions")
      .update({
        recording_ended_at: endedAt,
      })
      .eq("id", sessionId);

    return NextResponse.json({ 
      endedAt,
      durationSeconds,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}