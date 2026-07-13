import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const payload = await request.json();
    console.log("Cloudinary webhook:", payload.event_type, payload.public_id);

    if (payload.event_type === "upload" && payload.resource_type === "video") {
      const publicId = payload.public_id;
      // Extract session ID from public_id pattern: recording_{sessionId}_timestamp
      const match = publicId.match(/recording_([a-f0-9-]{36})_/);
      if (!match) {
        console.log("Could not extract session ID from:", publicId);
        return NextResponse.json({ received: true });
      }

      const sessionId = match[1];
      const hlsUrl = payload.eager?.find((e: any) => e.format === "m3u8")?.secure_url;
      const mp4Url = payload.eager?.find((e: any) => e.format === "mp4")?.secure_url;

      // Update recording record
      const { error } = await supabase
        .from("live_recordings")
        .update({
          status: "ready",
          hls_url: hlsUrl || null,
          mp4_url: mp4Url || null,
          thumbnail_url: payload.secure_url.replace(/\.[^.]+$/, ".jpg"), // Cloudinary auto-generates thumbnail
          duration_seconds: payload.duration || 0,
          file_size_bytes: payload.bytes || 0,
          completed_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .eq("status", "processing");

      if (error) {
        console.error("Failed to update recording:", error);
      } else {
        console.log("Recording completed for session:", sessionId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Cloudinary webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}