import axios from "axios";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY!;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET!;

export type CloudinaryFolder =
  | "jimvio/products"
  | "jimvio/avatars"
  | "jimvio/banners"
  | "jimvio/clips"
  | "jimvio/community"
  | "jimvio/campaigns";

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resource_type: "image" | "video" | "raw";
  created_at: string;
  thumbnail_url?: string;
  duration?: number;
}

export class CloudinaryService {
  private getSignature(paramsToSign: Record<string, string>): string {
    const crypto = require("crypto");
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join("&");
    return crypto
      .createHash("sha256")
      .update(sortedParams + CLOUDINARY_API_SECRET)
      .digest("hex");
  }

  async uploadImage(
    file: File | Blob,
    folder: CloudinaryFolder = "jimvio/products",
    publicId?: string
  ): Promise<{ success: boolean; data?: CloudinaryUploadResult; error?: string }> {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const paramsToSign: Record<string, string> = {
        folder,
        timestamp,
        ...(publicId && { public_id: publicId }),
      };

      const signature = this.getSignature(paramsToSign);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", CLOUDINARY_API_KEY);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", folder);
      if (publicId) formData.append("public_id", publicId);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      return { success: true, data: response.data };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { success: false, error: error.response?.data?.error?.message || "Upload failed" };
      }
      return { success: false, error: "Unexpected upload error" };
    }
  }

  async uploadVideo(
    file: File | Blob,
    folder: CloudinaryFolder = "jimvio/clips"
  ): Promise<{ success: boolean; data?: CloudinaryUploadResult; error?: string }> {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const paramsToSign: Record<string, string> = { folder, timestamp };
      const signature = this.getSignature(paramsToSign);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", CLOUDINARY_API_KEY);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", folder);
      formData.append("resource_type", "video");

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 300000, // 5 minutes for large videos
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { success: false, error: error.response?.data?.error?.message || "Video upload failed" };
      }
      return { success: false, error: "Unexpected upload error" };
    }
  }

  async deleteFile(publicId: string, resourceType: "image" | "video" = "image") {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const paramsToSign = { public_id: publicId, timestamp };
      const signature = this.getSignature(paramsToSign);

      const formData = new FormData();
      formData.append("public_id", publicId);
      formData.append("api_key", CLOUDINARY_API_KEY);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);

      await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`,
        formData
      );

      return { success: true };
    } catch {
      return { success: false, error: "Delete failed" };
    }
  }

  getOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "auto" | "webp" | "jpg" | "png";
    crop?: "fill" | "fit" | "scale" | "thumb";
  } = {}): string {
    const transformations = [];
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format) transformations.push(`f_${options.format}`);
    if (options.crop) transformations.push(`c_${options.crop}`);

    const t = transformations.length > 0 ? transformations.join(",") + "/" : "";
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${t}${publicId}`;
  }

  getVideoThumbnailUrl(publicId: string, second = 0): string {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/so_${second},w_400,h_225,c_fill,f_jpg/${publicId}.jpg`;
  }

  async generateUploadSignature(folder: CloudinaryFolder) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign: Record<string, string> = { folder, timestamp };
    const signature = this.getSignature(paramsToSign);
    return { timestamp, signature, apiKey: CLOUDINARY_API_KEY, cloudName: CLOUDINARY_CLOUD_NAME, folder };
  }
}

export const cloudinaryService = new CloudinaryService();
