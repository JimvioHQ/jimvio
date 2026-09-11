import { NextRequest, NextResponse } from "next/server";

/** Canonical support entry — redirects to Help Center (public). */
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/help", req.url), 308);
}
