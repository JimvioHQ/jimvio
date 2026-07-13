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

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, status, stream_key, privacy, community_id, space_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "live" && session.status !== "scheduled") {
    return NextResponse.json({ error: "Session is not live", status: session.status }, { status: 400 });
  }

  if (!session.stream_key) {
    return NextResponse.json({ error: "Stream not configured" }, { status: 400 });
  }

  const mediaServerHttps = process.env.MEDIA_SERVER_HTTPS_URL || "https://live.example.com";
  const streamKey = session.stream_key;

  const hlsUrl = `${mediaServerHttps}/hls/${streamKey}.m3u8`;
  const dashUrl = `${mediaServerHttps}/dash/${streamKey}.mpd`;
  const whepUrl = `${mediaServerHttps}/whep/${streamKey}`;

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    playbackUrls: {
      hls: hlsUrl,
      dash: dashUrl,
      whep: whepUrl,
    },
    streamKey,
  });
}