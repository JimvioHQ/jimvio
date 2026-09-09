import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/require-session";

/**
 * Authenticated Cloudinary proxy. Does not expose arbitrary public IDs
 * without a session. Sensitive digital assets must use signed download flows.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSessionUser();
    if ("error" in session) return session.error;

    const publicId = decodeURIComponent((await params).id || "").trim();
    if (!publicId || publicId.includes("..") || publicId.startsWith("/")) {
      return NextResponse.json({ error: "Invalid file id" }, { status: 400 });
    }

    // Only allow Jimvio-managed Cloudinary folders.
    const allowedPrefixes = [
      "jimvio/",
      "community/",
      "avatars/",
      "products/",
      "ugc/",
      "live/",
    ];
    if (!allowedPrefixes.some((p) => publicId.startsWith(p))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
    if (!cloudName) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download");

    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: cloudName,
      api_key: process.env.CLOUDINARY_API_KEY!,
      api_secret: process.env.CLOUDINARY_API_SECRET!,
    });

    const url = cloudinary.url(publicId, {
      secure: true,
      resource_type: "auto",
      sign_url: true,
      type: "authenticated",
    });

    const response = await fetch(url);
    if (!response.ok) {
      // Fall back to upload type for public assets in allowlisted folders.
      const publicUrl = cloudinary.url(publicId, {
        secure: true,
        resource_type: "auto",
      });
      const publicRes = await fetch(publicUrl);
      if (!publicRes.ok) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      return streamFile(publicRes, publicId, download === "1");
    }

    return streamFile(response, publicId, download === "1");
  } catch (err) {
    console.error("File proxy error:", err instanceof Error ? err.message : "error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function streamFile(response: Response, publicId: string, forceDownload: boolean) {
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=3600",
  };
  if (forceDownload) {
    headers["Content-Disposition"] =
      `attachment; filename="${publicId.split("/").pop() || "file"}"`;
  } else {
    headers["Content-Disposition"] = "inline";
  }
  return new NextResponse(response.body, { status: 200, headers });
}
