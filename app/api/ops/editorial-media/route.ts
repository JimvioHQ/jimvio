/**
 * Ops-only endpoint: download a licensed remote image and store it in Cloudinary.
 * Used by `npm run seed:community-content` when local Cloudinary credentials are absent.
 *
 * Auth: Bearer token must match SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  downloadAndValidateImage,
  uploadValidatedImageToCloudinaryDirect,
  type LicensedPhotoSpec,
  type PhotoSourceProvider,
} from "@/lib/community/photo-content";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_HOSTS = new Set([
  "images.unsplash.com",
  "plus.unsplash.com",
  "images.pexels.com",
  "upload.wikimedia.org",
  "commons.wikimedia.org",
]);

function opsAuthorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : req.headers.get("x-jimvio-ops-token")?.trim() || "";
  if (!token) return false;
  const secrets = [
    process.env.SUPABASE_SECRET_KEY?.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  ].filter(Boolean) as string[];
  return secrets.some((s) => s === token);
}

function isAllowedSourceUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(host)) return true;
    return [...ALLOWED_HOSTS].some((h) => host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

type Body = {
  sourceUrl?: string;
  sourceId?: string;
  provider?: PhotoSourceProvider;
  attributionUrl?: string;
  license?: string;
  licenseUrl?: string;
  photographer?: string;
};

export async function POST(req: NextRequest) {
  try {
    if (!opsAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : "";
    if (!sourceUrl || !sourceId) {
      return NextResponse.json({ error: "sourceUrl and sourceId required" }, { status: 400 });
    }
    if (!isAllowedSourceUrl(sourceUrl)) {
      return NextResponse.json({ error: "source host not allowed" }, { status: 400 });
    }

    const photo: LicensedPhotoSpec = {
      sourceId,
      provider:
        body.provider === "pexels" || body.provider === "wikimedia" ? body.provider : "unsplash",
      sourceUrl,
      attributionUrl:
        typeof body.attributionUrl === "string" && body.attributionUrl.trim()
          ? body.attributionUrl.trim()
          : sourceUrl,
      license:
        typeof body.license === "string" && body.license.trim()
          ? body.license.trim()
          : "Unsplash License",
      licenseUrl:
        typeof body.licenseUrl === "string" && body.licenseUrl.trim()
          ? body.licenseUrl.trim()
          : "https://unsplash.com/license",
      photographer:
        typeof body.photographer === "string" && body.photographer.trim()
          ? body.photographer.trim()
          : undefined,
      themes: [],
    };

    const validated = await downloadAndValidateImage(photo.sourceUrl);
    const upload = await uploadValidatedImageToCloudinaryDirect(validated, photo);
    return NextResponse.json({
      success: true,
      data: {
        secureUrl: upload.secureUrl,
        publicId: upload.publicId,
        width: upload.width,
        height: upload.height,
        bytes: upload.bytes,
        format: upload.format,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload failed";
    console.error("[ops/editorial-media]", message);
    const status = /Missing Cloudinary|Unauthorized/i.test(message) ? 503 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
