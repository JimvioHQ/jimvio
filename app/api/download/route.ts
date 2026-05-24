import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const filename = request.nextUrl.searchParams.get("filename") || "download";

  if (!url) {
    return NextResponse.json({ error: "No URL" }, { status: 400 });
  }

  const safeName = filename.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");

  const downloadUrl = url.includes("/raw/upload/")
    ? url.replace("/raw/upload/", `/raw/upload/fl_attachment:${safeName}/`)
    : url.replace("/upload/", `/upload/fl_attachment:${safeName}/`);

  const response = await fetch(downloadUrl);
  const blob = await response.arrayBuffer();

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}
