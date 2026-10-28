import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { imageExtension, MAX_IMAGE_BYTES, sniffImageMime } from "@/lib/editorial/images";
import { uploadOriginAllowed } from "@/lib/editorial/publish";
import { serverCloudinaryCloudName } from "@/services/media/cloudinary-account";

export const runtime = "nodejs";

function sameOrigin(request: NextRequest) {
  return uploadOriginAllowed({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    secFetchSite: request.headers.get("sec-fetch-site"),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cloudName = serverCloudinaryCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Image upload is not configured. Paste an https image URL instead." },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file, or paste an https image URL." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Images must be 4 MB or smaller." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(bytes);
  if (!mime) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP, or GIF image." }, { status: 400 });
  }

  try {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    const uploaded = await cloudinary.uploader.upload(
      `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`,
      {
        folder: "jimvio/editorial",
        resource_type: "image",
        unique_filename: true,
        overwrite: false,
        format: imageExtension(mime),
      },
    );
    const url = typeof uploaded.secure_url === "string" ? uploaded.secure_url : "";
    if (!url.startsWith("https://")) {
      return NextResponse.json({ error: "The image could not be stored." }, { status: 502 });
    }
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "The image store rejected this file. Try a smaller JPEG, PNG, WebP, or GIF, or paste an https URL." },
      { status: 502 },
    );
  }
}
