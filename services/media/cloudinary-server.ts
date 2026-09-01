import { v2 as cloudinarySDK } from "cloudinary";
import { CloudinaryFolder, CloudinarySignature } from "./cloudinary";

// Ensure SDK is configured
cloudinarySDK.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure:     true,
});

export type CloudinaryAccessType = "public" | "private" | "authenticated";

/** Cloudinary `type` param included in signed uploads. */
export function cloudinaryUploadType(
  accessType: CloudinaryAccessType = "public",
): "upload" | "private" | "authenticated" {
  return accessType === "public" ? "upload" : accessType;
}

// HMAC-SHA256 signature for signed uploads
function buildSignature(paramsToSign: Record<string, string>): string {
  const crypto = require("crypto") as typeof import("crypto");
  const sorted = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join("&");
  return crypto
    .createHash("sha256")
    .update(sorted + process.env.CLOUDINARY_API_SECRET!)
    .digest("hex");
}

export const cloudinaryServer = {
  // Generate signed upload params (for client-direct uploads)
  generateUploadSignature(
    folder: CloudinaryFolder,
    accessType: CloudinaryAccessType = "public",
  ): CloudinarySignature {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const type = cloudinaryUploadType(accessType);
    const paramsToSign: Record<string, string> = { folder, timestamp, type };
    const signature = buildSignature(paramsToSign);
    return {
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
      folder,
      type,
    };
  },

  // Server-side: delete file
  async deleteFile(
    publicId: string,
    resourceType: "image" | "video" | "raw" = "image"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await cloudinarySDK.uploader.destroy(publicId, { resource_type: resourceType });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? "Delete failed" };
    }
  }
};
