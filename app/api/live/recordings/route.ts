import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteLiveRecordingForUser,
  getLiveRecordingForUser,
  listUserLiveRecordings,
} from "@/services/live/session-service";
import {
  buildDownloadUrlForLocation,
  buildPlaybackUrlForLocation,
} from "@/lib/live/recording-storage";

export const dynamic = "force-dynamic";

/** GET /api/live/recordings — host's saved recordings library. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await listUserLiveRecordings(user.id, 50);
  const recordings = rows.map((r) => {
    const storage = r.cloudinary_url;
    const ready = r.status === "ready" && Boolean(storage);
    const playUrl =
      ready && storage ? buildPlaybackUrlForLocation(storage) : null;
    const downloadUrl =
      ready && storage
        ? buildDownloadUrlForLocation(
            storage,
            `${(r.title || "live").replace(/[^\w.-]+/g, "-").slice(0, 40)}.mp4`
          )
        : null;
    return { ...r, playUrl, downloadUrl };
  });

  return NextResponse.json({ recordings });
}

/** DELETE /api/live/recordings?id= — remove a recording the user owns/hosts. */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const result = await deleteLiveRecordingForUser(id, user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}

/** POST /api/live/recordings — body { id, action: "play"|"download" } → signed URL */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    action?: "play" | "download";
  };
  const id = body.id?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const recording = await getLiveRecordingForUser(id, user.id);
  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (recording.status !== "ready" || !recording.cloudinary_url) {
    return NextResponse.json(
      { error: "Recording is not ready yet." },
      { status: 409 }
    );
  }

  const action = body.action === "download" ? "download" : "play";
  const url =
    action === "download"
      ? buildDownloadUrlForLocation(
          recording.cloudinary_url,
          `${(recording.title || "live").replace(/[^\w.-]+/g, "-").slice(0, 40)}.mp4`
        )
      : buildPlaybackUrlForLocation(recording.cloudinary_url);

  if (!url) {
    return NextResponse.json(
      { error: "Playback URL unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    url,
    action,
    recordingId: recording.id,
    title: recording.title,
    duration_seconds: recording.duration_seconds,
  });
}
