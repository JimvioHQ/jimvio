import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUserAccessLiveSession } from "@/lib/actions/live-sessions";

export const dynamic = "force-dynamic";

export async function GET(
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

  const { data: recordings, error } = await supabase
    .from("live_recordings")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recordings: recordings || [] });
}

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
    .select("id, host_id, title, community_id, space_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.host_id !== user.id) {
    return NextResponse.json({ error: "Only host can create recordings" }, { status: 403 });
  }

  const body = await request.json();
  const { hlsUrl, mp4Url, thumbnailUrl, durationSeconds, fileSizeBytes, startedAt, endedAt } = body;

  const { data: recording, error } = await supabase
    .from("live_recordings")
    .insert({
      session_id: sessionId,
      space_id: session.space_id,
      community_id: session.community_id,
      host_id: user.id,
      title: session.title,
      status: "ready",
      hls_url: hlsUrl,
      mp4_url: mp4Url,
      thumbnail_url: thumbnailUrl,
      duration_seconds: durationSeconds || 0,
      file_size_bytes: fileSizeBytes || 0,
      started_at: startedAt || new Date().toISOString(),
      ended_at: endedAt || new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recording });
}