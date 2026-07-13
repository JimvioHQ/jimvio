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

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, host_id, status, stream_key")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.host_id !== user.id) {
    return NextResponse.json({ error: "Only host can control recording" }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body; // "start" | "stop"

  if (action === "start") {
    if (session.status !== "live") {
      return NextResponse.json({ error: "Session must be live to record" }, { status: 400 });
    }

    const recordingId = crypto.randomUUID();
    const recordingKey = `recording_${sessionId}_${Date.now()}`;

    const { data: recording, error } = await supabase
      .from("live_recordings")
      .insert({
        id: recordingId,
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

    await supabase
      .from("live_sessions")
      .update({ 
        recording_started_at: new Date().toISOString(),
        recording_url: recordingId,
      })
      .eq("id", sessionId);

    // Return Cloudinary upload details for client-side upload
    const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
    const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

    return NextResponse.json({
      recording: {
        id: recording.id,
        recordingKey,
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/video/upload`,
        uploadParams: {
          public_id: recordingKey,
          resource_type: "video",
          eager: "f_auto,m3u8",
          eager_async: true,
          eager_notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cloudinary`,
        },
      },
    });
  }

  if (action === "stop") {
    const { data: sessionData } = await supabase
      .from("live_sessions")
      .select("recording_url, recording_started_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (!sessionData?.recording_url) {
      return NextResponse.json({ error: "No active recording" }, { status: 400 });
    }

    await supabase
      .from("live_recordings")
      .update({
        ended_at: new Date().toISOString(),
        status: "processing",
      })
      .eq("id", sessionData.recording_url);

    await supabase
      .from("live_sessions")
      .update({ 
        recording_ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

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

  const { data: recordings } = await supabase
    .from("live_recordings")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ recordings: recordings || [] });
}