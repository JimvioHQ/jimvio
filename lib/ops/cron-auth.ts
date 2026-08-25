import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function secretsEqual(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Authorize cron callers. Hosted Preview/Production always require CRON_SECRET. */
export function assertCronAuthorized(request: Request): NextResponse | null {
  const hosted = Boolean(process.env.VERCEL_ENV);
  const production =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const secret = process.env.CRON_SECRET;

  if (process.env.VERCEL_ENV === "preview") {
    return NextResponse.json({ error: "Cron is disabled on Preview" }, { status: 403 });
  }

  if ((hosted || production) && !secret) {
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }

  if (!secret) return null;

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  const headerSecret = request.headers.get("x-cron-secret") ?? "";
  const authorized = secretsEqual(bearer, secret) || secretsEqual(headerSecret, secret);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
