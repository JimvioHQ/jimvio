import { NextResponse } from "next/server";
import type { PlatformAdminDenied, PlatformAdminOk } from "@/lib/auth/platform-admin";
import { checkResendAuthentication, type ResendAuthCheckResult } from "@/lib/email/resend-auth-check";
import { rateLimit } from "@/lib/ops/rate-limit";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

function json(body: ResendAuthCheckResult | { error: string }, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function handleResendAuthDiagnostic(
  auth: PlatformAdminOk | PlatformAdminDenied,
  options?: {
    now?: number;
    check?: typeof checkResendAuthentication;
  },
): Promise<Response> {
  if (!auth.ok) {
    return json(
      { error: auth.status === 401 ? "Unauthorized" : "Forbidden" },
      auth.status,
    );
  }

  const limited = rateLimit(`resend-auth-check:${auth.user.id}`, 3, 60_000, options?.now);
  if (!limited.allowed) {
    return json(
      {
        ok: false,
        httpStatus: null,
        errorName: "rate_limited",
        errorMessage: "Too many requests",
      },
      429,
    );
  }

  const result = await (options?.check ?? checkResendAuthentication)();
  return json(result, 200);
}
