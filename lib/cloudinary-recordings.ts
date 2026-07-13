// Cloudinary upload helpers for live recordings
// Usage: import { uploadRecordingToCloudinary } from "@/lib/cloudinary-recordings";

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export async function uploadRecordingToCloudinary(
  filePath: string,
  sessionId: string,
  options: {
    folder?: string;
    resourceType?: "video" | "auto";
    publicId?: string;
  } = {}
): Promise<UploadResult> {
  const folder = options.folder || `jimvio/live-recordings/${sessionId}`;
  const publicId = options.publicId || `recording_${sessionId}_${Date.now()}`;

  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId,
    resource_type: options.resourceType || "video",
    chunk_size: 6000000, // 6MB chunks for large files
    eager: [
      { format: "m3u8", streaming_profile: "hd" }, // HLS
      { format: "mp4", quality: "auto" }, // MP4 fallback
    ],
    eager_async: true,
    notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cloudinary/recording`,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    duration: result.duration,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

export async function uploadThumbnailToCloudinary(
  filePath: string,
  sessionId: string
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `jimvio/live-recordings/${sessionId}/thumbnails`,
    public_id: `thumb_${sessionId}_${Date.now()}`,
    resource_type: "image",
    transformation: [
      { width: 1280, height: 720, crop: "fill" },
      { quality: "auto" },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

export async function deleteCloudinaryAsset(publicId: string, resourceType: "video" | "image" = "video"): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return true;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
}

export async function getCloudinaryVideoInfo(publicId: string) {
  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: "video" });
    return {
      url: result.secure_url,
      duration: result.duration,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      createdAt: result.created_at,
    };
  } catch (error) {
    console.error("Cloudinary get info error:", error);
    return null;
  }
}