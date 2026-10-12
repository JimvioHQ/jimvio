import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { handleResendAuthDiagnostic } from "@/lib/email/resend-auth-diagnostic";
import { rateLimit } from "@/lib/ops/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function GET(request: Request) {
  const ipLimited = rateLimit(`resend-auth-check:ip:${clientIp(request)}`, 20, 60_000);
  if (!ipLimited.allowed) {
    return NextResponse.json(
      {
        ok: false,
        httpStatus: null,
        errorName: "rate_limited",
        errorMessage: "Too many requests",
      },
      { status: 429, headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } },
    );
  }

  const auth = await assertPlatformAdmin();
  return handleResendAuthDiagnostic(auth);
}
