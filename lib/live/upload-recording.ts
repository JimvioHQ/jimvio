/**
 * Recording upload hook — posts a finished recording blob via Cloudinary signature upload.
 */

import { uploadCommunityChatFile } from "@/lib/community-chat-upload";

export type RecordingUploadResult =
  | { ok: true; url: string }
  | { ok: true; url: null; localOnly: true }
  | { ok: false; error: string };

export async function uploadLiveRecording(
  blob: Blob,
  opts: { communityId: string; roomId: string; filename?: string }
): Promise<RecordingUploadResult> {
  try {
    const filename = opts.filename ?? `jimvio-live-${Date.now()}.webm`;
    const file = new File([blob], filename, { type: blob.type || "video/webm" });
    const uploaded = await uploadCommunityChatFile(opts.communityId, opts.roomId, file);
    if (uploaded?.url) return { ok: true, url: uploaded.url };
    return { ok: true, url: null, localOnly: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}
