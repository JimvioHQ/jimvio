/**
 * lib/community-chat-upload.ts
 * Upload community chat files to Cloudinary instead of Supabase Storage.
 */

import { uploadToMediaStorage } from "@/lib/uploads/storage-fallback";

export type ChatAttachmentPayload = {
  url: string;
  name: string;
  mime: string;
  size: number;
  publicId?: string;
};

function guessMimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (/\.(mp4|m4v)$/.test(lower)) return "video/mp4";
  if (/\.webm$/.test(lower)) return "video/webm";
  if (/\.mov$/.test(lower)) return "video/quicktime";
  if (/\.mkv$/.test(lower)) return "video/x-matroska";
  if (/\.(jpe?g)$/.test(lower)) return "image/jpeg";
  if (/\.png$/.test(lower)) return "image/png";
  if (/\.gif$/.test(lower)) return "image/gif";
  if (/\.webp$/.test(lower)) return "image/webp";
  if (/\.mp3$/.test(lower)) return "audio/mpeg";
  if (/\.wav$/.test(lower)) return "audio/wav";
  return "";
}

/** Pick Cloudinary resource type for chat attachments. */
function cloudinaryResourceType(mime: string, fileName = ""): "image" | "video" | "raw" {
  const resolved = mime || guessMimeFromName(fileName);
  if (resolved.startsWith("image/")) return "image";
  if (resolved.startsWith("video/") || resolved.startsWith("audio/")) return "video";
  // Extension fallback when browsers omit MIME (common on mobile)
  if (/\.(mp4|m4v|webm|mov|mkv|avi)$/i.test(fileName)) return "video";
  if (/\.(jpe?g|png|gif|webp|avif|heic)$/i.test(fileName)) return "image";
  return "raw";
}

/**
 * Force a browser-playable progressive MP4 URL for Cloudinary videos.
 * Also repairs accidental /raw/ or /image/ delivery paths for video assets.
 */
export function toPlayableCommunityVideoUrl(url: string): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;

  let next = url
    .replace("/raw/upload/", "/video/upload/")
    .replace("/image/upload/", "/video/upload/");

  // Insert progressive mp4 transform once (Cloudinary delivers seekable progressive MP4)
  if (next.includes("/video/upload/") && !/\/upload\/[^/]*f_mp4/.test(next)) {
    next = next.replace("/video/upload/", "/video/upload/f_mp4,q_auto/");
  }

  return next;
}

/** Upload a file for community chat directly to Cloudinary via the signed upload API. */
export async function uploadCommunityChatFile(
  communityId: string,
  roomId: string,
  file: File
): Promise<ChatAttachmentPayload> {
  try {
    return await uploadCommunityChatFileToCloudinary(communityId, roomId, file);
  } catch (err) {
    // Cloudinary refused or is unreachable — fall back to Jimvio storage.
    const mime = file.type || guessMimeFromName(file.name) || "application/octet-stream";
    try {
      const stored = await uploadToMediaStorage(
        file.type ? file : new File([file], file.name, { type: mime }),
        "jimvio/communities",
      );
      return { url: stored.url, name: file.name, mime, size: file.size, publicId: stored.path };
    } catch {
      throw err instanceof Error ? err : new Error("Upload failed");
    }
  }
}

async function uploadCommunityChatFileToCloudinary(
  _communityId: string,
  _roomId: string,
  file: File
): Promise<ChatAttachmentPayload> {
  const sigRes = await fetch("/api/uploads/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "jimvio/communities" }),
  });

  if (!sigRes.ok) {
    const j = await sigRes.json().catch(() => ({}));
    throw new Error(j?.error ?? "Failed to get upload signature");
  }

  const { data: sig } = await sigRes.json();

  const mime = file.type || guessMimeFromName(file.name) || "application/octet-stream";
  const resourceType = cloudinaryResourceType(mime, file.name);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", sig.timestamp);
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder);
  if (sig.type) formData.append("type", sig.type);

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;
  const uploadRes = await fetch(endpoint, { method: "POST", body: formData });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Cloudinary upload failed");
  }

  const data = await uploadRes.json();
  const rawUrl = String(data.secure_url ?? "");
  const url = resourceType === "video" ? toPlayableCommunityVideoUrl(rawUrl) : rawUrl;

  return {
    url,
    name: file.name,
    mime,
    size: file.size,
    publicId: data.public_id,
  };
}
