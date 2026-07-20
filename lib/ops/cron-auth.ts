import { NextResponse } from "next/server";

/** Authorize cron callers. Production requires CRON_SECRET; accepts Bearer or x-cron-secret. */
export function assertCronAuthorized(request: Request): NextResponse | null {
  const production =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const secret = process.env.CRON_SECRET;

  if (production && !secret) {
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }

  if (!secret) return null;

  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const authorized =
    auth === `Bearer ${secret}` || headerSecret === secret;

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
