import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOST_SUFFIXES = [
  "res.cloudinary.com",
  "cloudinary.com",
];

function isAllowedDownloadHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const filename = request.nextUrl.searchParams.get("filename") || "download";

  if (!url) {
    return NextResponse.json({ error: "No URL" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!isAllowedDownloadHost(parsed.hostname)) {
    return NextResponse.json({ error: "Forbidden host" }, { status: 403 });
  }

  const safeName = filename
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  const downloadUrl = url.includes("/raw/upload/")
    ? url.replace("/raw/upload/", `/raw/upload/fl_attachment:${safeName}/`)
    : url.replace("/upload/", `/upload/fl_attachment:${safeName}/`);

  // Re-validate after rewrite
  try {
    const rewritten = new URL(downloadUrl);
    if (!isAllowedDownloadHost(rewritten.hostname) || rewritten.protocol !== "https:") {
      return NextResponse.json({ error: "Forbidden host" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  return NextResponse.redirect(downloadUrl, 302);
}
