/**
 * services/media/cloudinary.ts
 * ─────────────────────────────────────────────────────
 * Central Cloudinary service for the whole Jimvio platform.
 *
 * ▸ Server-side  → uses `cloudinary-server.ts`
 * ▸ Client-side  → calls /api/uploads/signature to get a signed upload URL, then
 *                   posts directly to Cloudinary (no file goes through your server)
 *
 * Env vars required:
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   (public – used in browser)
 */

// ─── Folder type ─────────────────────────────────────────────────────────────
export type CloudinaryFolder =
  | "jimvio/products"
  | "jimvio/avatars"
  | "jimvio/banners"
  | "jimvio/clips"
  | "jimvio/campaigns"
  | "jimvio/chat"
  | "jimvio/communities"
  | "jimvio/documents";

export const ALL_CLOUDINARY_FOLDERS: CloudinaryFolder[] = [
  "jimvio/products",
  "jimvio/avatars",
  "jimvio/banners",
  "jimvio/clips",
  "jimvio/campaigns",
  "jimvio/chat",
  "jimvio/communities",
  "jimvio/documents",
];

// ─── Upload result type ───────────────────────────────────────────────────────
export interface CloudinaryUploadResult {
  public_id:     string;
  secure_url:    string;
  url:           string;
  width:         number;
  height:        number;
  format:        string;
  bytes:         number;
  resource_type: "image" | "video" | "raw";
  created_at:    string;
  thumbnail_url?: string;
  duration?:     number;
}

export interface CloudinarySignature {
  timestamp:  string;
  signature:  string;
  apiKey:     string;
  cloudName:  string;
  folder:     CloudinaryFolder;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function getCloudName(): string {
  return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
}

// ────────────────────────────────────────────────────────────────────────────
// CloudinaryService
// ────────────────────────────────────────────────────────────────────────────

export class CloudinaryService {

  // ── Client-side direct upload (uses pre-signed params) ─────────────────
  async uploadDirect(
    file: File | Blob,
    signatureParams: CloudinarySignature,
    resourceType: "image" | "video" | "raw" = "image",
    onProgress?: (pct: number) => void
  ): Promise<{ success: boolean; data?: CloudinaryUploadResult; error?: string }> {
    const formData = new FormData();
    formData.append("file",      file);
    formData.append("api_key",   signatureParams.apiKey);
    formData.append("timestamp", signatureParams.timestamp);
    formData.append("signature", signatureParams.signature);
    formData.append("folder",    signatureParams.folder);

    const endpoint = `https://api.cloudinary.com/v1_1/${signatureParams.cloudName}/${resourceType}/upload`;

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: true, data: JSON.parse(xhr.responseText) });
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            resolve({ success: false, error: err?.error?.message ?? "Upload failed" });
          } catch {
            resolve({ success: false, error: "Upload failed" });
          }
        }
      };

      xhr.onerror = () => resolve({ success: false, error: "Network error" });
      xhr.send(formData);
    });
  }

  // ── URL helpers ─────────────────────────────────────────────────────────

  /** Build an optimized image URL from a public_id or an existing Cloudinary URL */
  getOptimizedUrl(
    publicIdOrUrl: string,
    options: {
      width?:   number;
      height?:  number;
      quality?: number | "auto";
      format?:  "auto" | "webp" | "jpg" | "png" | "avif";
      crop?:    "fill" | "fit" | "scale" | "thumb" | "pad";
      gravity?: "auto" | "face" | "center";
    } = {}
  ): string {
    const parts: string[] = [];
    if (options.width)   parts.push(`w_${options.width}`);
    if (options.height)  parts.push(`h_${options.height}`);
    if (options.quality) parts.push(`q_${options.quality}`);
    if (options.format)  parts.push(`f_${options.format}`);
    if (options.crop)    parts.push(`c_${options.crop}`);
    if (options.gravity) parts.push(`g_${options.gravity}`);

    const t = parts.length > 0 ? parts.join(",") + "/" : "";
    const cloud = getCloudName();

    // Already a full Cloudinary URL? inject transformations
    if (publicIdOrUrl.includes("res.cloudinary.com")) {
      return publicIdOrUrl.replace("/image/upload/", `/image/upload/${t}`);
    }

    return `https://res.cloudinary.com/${cloud}/image/upload/${t}${publicIdOrUrl}`;
  }

  /** Video thumbnail from public_id */
  getVideoThumbnailUrl(publicId: string, second = 0): string {
    const cloud = getCloudName();
    return `https://res.cloudinary.com/${cloud}/video/upload/so_${second},w_400,h_225,c_fill,f_jpg/${publicId}.jpg`;
  }

  /** Detect if a URL is a Cloudinary URL */
  isCloudinaryUrl(url?: string | null): boolean {
    return Boolean(url?.includes("res.cloudinary.com"));
  }

  /**
   * Smart image src: if the URL is already Cloudinary, optimize it.
   * If it's a Supabase / external URL, return it as-is.
   */
  smartSrc(
    url?: string | null,
    opts: Parameters<CloudinaryService["getOptimizedUrl"]>[1] = {}
  ): string | undefined {
    if (!url) return undefined;
    if (this.isCloudinaryUrl(url)) return this.getOptimizedUrl(url, opts);
    return url;
  }
}

export const cloudinaryService = new CloudinaryService();

