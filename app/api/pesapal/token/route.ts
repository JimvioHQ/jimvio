import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * SECURITY: This endpoint previously returned a live PesaPal access token
 * to unauthenticated callers. It is permanently disabled.
 * Server-side code must call getPesapalToken() directly — never via HTTP.
 */
export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
