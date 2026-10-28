import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ops/rate-limit";
import { ALL_CLOUDINARY_FOLDERS, type CloudinaryFolder } from "@/services/media/cloudinary";
import {
  MEDIA_BUCKET,
  buildMediaPath,
  validateMediaUpload,
} from "@/lib/uploads/storage-fallback-rules";

export const dynamic = "force-dynamic";

/**
 * POST — one-time signed upload URL in the public `media` bucket. Used only
 * when Cloudinary rejects a public upload, so photos and videos still work.
 * The browser uploads the file directly (no Vercel body-size limit).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`media-upload:${user.id}`, 60, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many uploads — try again shortly" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    folder?: string;
    contentType?: string;
    size?: number;
  } | null;
  const folder = (body?.folder ?? "") as CloudinaryFolder;
  if (!ALL_CLOUDINARY_FOLDERS.includes(folder) || folder === "jimvio/digital-files" || folder === "jimvio/identity") {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }
  const contentType = String(body?.contentType ?? "").toLowerCase();
  const size = Number(body?.size ?? 0);
  const invalid = validateMediaUpload({ contentType, size });
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const path = buildMediaPath(folder, user.id, contentType, randomUUID());
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[uploads/storage] signed URL failed:", error?.message);
    return NextResponse.json({ error: "Upload is temporarily unavailable" }, { status: 503 });
  }
  const { data: pub } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return NextResponse.json({ signedUrl: data.signedUrl, path, publicUrl: pub.publicUrl });
}
