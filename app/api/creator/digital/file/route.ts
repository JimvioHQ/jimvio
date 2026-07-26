import { NextRequest, NextResponse } from "next/server";
import { resolveSignedDownloadFile } from "@/services/creator-economy/digital-products";
import { verifySignedDownloadToken } from "@/lib/commerce/signed-download";

export const dynamic = "force-dynamic";

/** GET — short-lived signed handoff; re-validates purchase access then redirects. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing download token" }, { status: 400 });
  }

  const payload = verifySignedDownloadToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired download link" }, { status: 403 });
  }

  try {
    const file = await resolveSignedDownloadFile({
      accessId: payload.accessId,
      userId: payload.userId,
      productId: payload.productId,
    });
    return NextResponse.redirect(file.url, { status: 302 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download unavailable" },
      { status: 403 }
    );
  }
}
