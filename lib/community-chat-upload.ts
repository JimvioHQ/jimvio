/**
 * lib/community-chat-upload.ts
 * Upload community chat files to Cloudinary instead of Supabase Storage.
 */

export type ChatAttachmentPayload = {
  url:  string;
  name: string;
  mime: string;
  size: number;
  publicId?: string;
};

/** Upload a file for community chat directly to Cloudinary via the signed upload API. */
export async function uploadCommunityChatFile(
  _communityId: string,
  _roomId: string,
  file: File
): Promise<ChatAttachmentPayload> {
  // 1. Get a signed upload signature from the server
  const sigRes = await fetch("/api/uploads/signature", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ folder: "jimvio/communities" }),
  });

  if (!sigRes.ok) {
    const j = await sigRes.json().catch(() => ({}));
    throw new Error(j?.error ?? "Failed to get upload signature");
  }

  const { data: sig } = await sigRes.json();

  // 2. Determine resource type (audio files are uploaded as "video" resource type in Cloudinary)
  const resourceType = file.type.startsWith("video/") || file.type.startsWith("audio/") ? "video" : "image";

  // 3. Upload directly from browser to Cloudinary
  const formData = new FormData();
  formData.append("file",      file);
  formData.append("api_key",   sig.apiKey);
  formData.append("timestamp", sig.timestamp);
  formData.append("signature", sig.signature);
  formData.append("folder",    sig.folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;
  const uploadRes = await fetch(endpoint, { method: "POST", body: formData });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Cloudinary upload failed");
  }

  const data = await uploadRes.json();

  return {
    url:      data.secure_url,
    name:     file.name,
    mime:     file.type || "application/octet-stream",
    size:     file.size,
    publicId: data.public_id,
  };
}
