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

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  const { data: clips, error } = await supabase
    .from("live_clips")
    .select(`
      *,
      creator:profiles!creator_id (id, full_name, avatar_url, username)
    `)
    .eq("session_id", sessionId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clips: clips || [] });
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

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, startTimeSeconds, endTimeSeconds, recordingId, tags = [] } = body;

  if (!title || startTimeSeconds === undefined || endTimeSeconds === undefined) {
    return NextResponse.json({ error: "Title, startTimeSeconds, and endTimeSeconds required" }, { status: 400 });
  }

  const duration = endTimeSeconds - startTimeSeconds;
  if (duration <= 0 || duration > 300) {
    return NextResponse.json({ error: "Clip duration must be between 1 and 300 seconds" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, space_id, community_id, host_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // TODO: Generate clip from recording (async job)
  // For now, create clip record with placeholder URLs
  const { data: clip, error } = await supabase
    .from("live_clips")
    .insert({
      session_id: sessionId,
      recording_id: recordingId || null,
      creator_id: user.id,
      title,
      description: description || null,
      start_time_seconds: startTimeSeconds,
      end_time_seconds: endTimeSeconds,
      duration_seconds: duration,
      tags,
      hls_url: null,
      mp4_url: null,
      thumbnail_url: null,
      is_published: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clip });
}