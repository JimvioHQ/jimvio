/**
 * Rules for the Supabase Storage upload fallback (bucket `media`), used when
 * Cloudinary rejects an upload. Shared by the API route and its tests.
 */
export const MEDIA_BUCKET = "media";
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;

export const MEDIA_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
  "application/pdf",
]);

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/webm": "weba",
  "audio/ogg": "ogg",
  "application/pdf": "pdf",
};

export function validateMediaUpload(input: {
  contentType: string;
  size: number;
}): string | null {
  if (!MEDIA_ALLOWED_TYPES.has(input.contentType)) return "This file type cannot be uploaded";
  if (!Number.isFinite(input.size) || input.size <= 0) return "Empty file";
  if (input.size > MEDIA_MAX_BYTES) return "File is larger than 50 MB";
  return null;
}

/** Storage path: <folder>/<userId>/<random>.<ext> — no user-supplied names. */
export function buildMediaPath(folder: string, userId: string, contentType: string, random: string): string {
  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+|\/+$/g, "") || "uploads";
  return `${safeFolder}/${userId}/${random}.${EXT[contentType] ?? "bin"}`;
}
