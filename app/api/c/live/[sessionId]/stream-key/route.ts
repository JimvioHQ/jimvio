import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, host_id, status, stream_key")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.host_id !== user.id) {
    return NextResponse.json({ error: "Only the host can view stream key" }, { status: 403 });
  }

  const mediaServerUrl = process.env.MEDIA_SERVER_URL || "rtmp://localhost:1935/live";
  const mediaServerHttps = process.env.MEDIA_SERVER_HTTPS_URL || "https://live.example.com";

  let streamKey = session.stream_key;
  if (!streamKey) {
    streamKey = `live_${sessionId.replace(/-/g, "")}_${Date.now().toString(36)}`;
    await supabase
      .from("live_sessions")
      .update({ stream_key: streamKey })
      .eq("id", sessionId);
  }

  const rtmpUrl = mediaServerUrl;
  const srtUrl = mediaServerUrl.replace("rtmp://", "srt://") + `?streamid=${streamKey}`;
  const whipUrl = `${mediaServerHttps}/whip/${streamKey}`;
  const whepUrl = `${mediaServerHttps}/whep/${streamKey}`;
  const hlsUrl = `${mediaServerHttps}/hls/${streamKey}.m3u8`;
  const dashUrl = `${mediaServerHttps}/dash/${streamKey}.mpd`;

  return NextResponse.json({
    streamKey,
    rtmpUrl,
    srtUrl,
    whipUrl,
    whepUrl,
    hlsUrl,
    dashUrl,
    ingestUrls: {
      rtmp: rtmpUrl,
      srt: srtUrl,
      whip: whipUrl,
    },
    playbackUrls: {
      hls: hlsUrl,
      dash: dashUrl,
      whep: whepUrl,
    },
  });
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
    .select("id, host_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.host_id !== user.id) {
    return NextResponse.json({ error: "Only the host can regenerate stream key" }, { status: 403 });
  }

  const newStreamKey = `live_${sessionId.replace(/-/g, "")}_${Date.now().toString(36)}_${Math.random().toString(36).substring(7)}`;

  const { error } = await supabase
    .from("live_sessions")
    .update({ stream_key: newStreamKey, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mediaServerUrl = process.env.MEDIA_SERVER_URL || "rtmp://localhost:1935/live";
  const mediaServerHttps = process.env.MEDIA_SERVER_HTTPS_URL || "https://live.example.com";

  return NextResponse.json({
    streamKey: newStreamKey,
    rtmpUrl: mediaServerUrl,
    srtUrl: mediaServerUrl.replace("rtmp://", "srt://") + `?streamid=${newStreamKey}`,
    whipUrl: `${mediaServerHttps}/whip/${newStreamKey}`,
    whepUrl: `${mediaServerHttps}/whep/${newStreamKey}`,
    hlsUrl: `${mediaServerHttps}/hls/${newStreamKey}.m3u8`,
    dashUrl: `${mediaServerHttps}/dash/${newStreamKey}.mpd`,
  });
}