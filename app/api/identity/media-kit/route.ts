import { NextRequest, NextResponse } from "next/server";
import { getIdentityByUsername } from "@/lib/identity/resolve";
import { buildMediaKitPdf } from "@/lib/identity/media-kit-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/identity/media-kit?username=...
 * Streams a branded, downloadable PDF media kit for the given creator.
 * Privacy-gated the same way as `/api/identity/[username]` — a restricted
 * (non-viewable) profile returns 403 rather than leaking any detail.
 */
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const identity = await getIdentityByUsername(username);
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (identity.restricted) {
    return NextResponse.json({ error: "This profile is private" }, { status: 403 });
  }

  const pdf = await buildMediaKitPdf(identity);
  const safeName = username.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="jimvio-media-kit-${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(pdf.length),
    },
  });
}
