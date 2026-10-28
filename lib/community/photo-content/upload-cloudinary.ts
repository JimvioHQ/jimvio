/**
 * Server-side Cloudinary upload for editorial community photos.
 */
import { createHash } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import type { ValidatedImage } from "./validate-image";
import type { LicensedPhotoSpec, PhotoMediaProvenance } from "./types";
import { serverCloudinaryCloudName } from "@/services/media/cloudinary-account";

export type CloudinaryPhotoUpload = {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

export function hasCloudinaryCredentials(): boolean {
  const cloudName =
    serverCloudinaryCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || "";
  const looksReal = (v: string) =>
    v.length >= 4 && !v.includes("SENSITIVE") && !v.includes("***");
  return Boolean(
    looksReal(cloudName) && looksReal(apiKey) && looksReal(apiSecret)
  );
}

function requireCloudinaryConfig() {
  const cloudName =
    serverCloudinaryCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || "";
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Missing Cloudinary credentials (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)"
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return { cloudName };
}

export function editorialPhotoPublicId(sourceId: string): string {
  const digest = createHash("sha1").update(sourceId).digest("hex").slice(0, 16);
  const safe = sourceId.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 48);
  return `editorial_${safe}_${digest}`;
}

/** Direct SDK upload — requires Cloudinary credentials in the process env. */
export async function uploadValidatedImageToCloudinaryDirect(
  image: ValidatedImage,
  photo: LicensedPhotoSpec
): Promise<CloudinaryPhotoUpload> {
  requireCloudinaryConfig();
  const publicId = editorialPhotoPublicId(photo.sourceId);
  const folder = "jimvio/communities/editorial-photos";
  const fullPublicId = `${folder}/${publicId}`;

  try {
    const existing = await cloudinary.api.resource(fullPublicId, {
      resource_type: "image",
    });
    if (existing?.secure_url) {
      return {
        secureUrl: existing.secure_url as string,
        publicId: existing.public_id as string,
        width: Number(existing.width) || image.width,
        height: Number(existing.height) || image.height,
        bytes: Number(existing.bytes) || image.bytes,
        format: String(existing.format || "jpg"),
      };
    }
  } catch {
    // Not found — upload below
  }

  const dataUri = `data:${image.contentType};base64,${image.buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    public_id: publicId,
    overwrite: false,
    resource_type: "image",
    unique_filename: false,
    use_filename: false,
    context: {
      source_provider: photo.provider,
      source_id: photo.sourceId,
      license: photo.license,
      attribution_url: photo.attributionUrl,
      ...(photo.photographer ? { photographer: photo.photographer } : {}),
    },
    tags: ["jimvio-editorial", "photo-content", photo.provider],
  });

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width ?? image.width,
    height: result.height ?? image.height,
    bytes: result.bytes ?? image.bytes,
    format: result.format ?? "jpg",
  };
}

async function uploadViaOpsEndpoint(
  photo: LicensedPhotoSpec
): Promise<CloudinaryPhotoUpload> {
  const base =
    process.env.JIMVIO_OPS_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.jimvio.com";
  const token =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  if (!token) {
    throw new Error(
      "Missing Cloudinary credentials and SUPABASE_SECRET_KEY for ops upload fallback"
    );
  }

  const res = await fetch(`${base.replace(/\/$/, "")}/api/ops/editorial-media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceUrl: photo.sourceUrl,
      sourceId: photo.sourceId,
      provider: photo.provider,
      attributionUrl: photo.attributionUrl,
      license: photo.license,
      licenseUrl: photo.licenseUrl,
      photographer: photo.photographer,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    data?: CloudinaryPhotoUpload & { secureUrl?: string };
  };
  if (!res.ok || !json.data?.secureUrl) {
    throw new Error(json.error || `ops upload failed HTTP ${res.status}`);
  }
  return {
    secureUrl: json.data.secureUrl,
    publicId: json.data.publicId,
    width: json.data.width,
    height: json.data.height,
    bytes: json.data.bytes,
    format: json.data.format || "jpg",
  };
}

/**
 * Upload validated image bytes to Cloudinary.
 * Uses local credentials when present; otherwise calls the Jimvio ops endpoint.
 */
export async function uploadValidatedImageToCloudinary(
  image: ValidatedImage,
  photo: LicensedPhotoSpec
): Promise<CloudinaryPhotoUpload> {
  if (hasCloudinaryCredentials()) {
    return uploadValidatedImageToCloudinaryDirect(image, photo);
  }
  return uploadViaOpsEndpoint(photo);
}

export function buildMediaProvenance(
  photo: LicensedPhotoSpec,
  upload: CloudinaryPhotoUpload
): PhotoMediaProvenance {
  return {
    sourceProvider: photo.provider,
    sourceId: photo.sourceId,
    sourceUrl: photo.sourceUrl,
    attributionUrl: photo.attributionUrl,
    license: photo.license,
    licenseUrl: photo.licenseUrl,
    photographer: photo.photographer,
    downloadedAt: new Date().toISOString(),
    cloudinaryPublicId: upload.publicId,
    width: upload.width,
    height: upload.height,
    bytes: upload.bytes,
  };
}
