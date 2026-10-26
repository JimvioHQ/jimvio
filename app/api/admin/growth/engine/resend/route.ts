import { NextResponse } from "next/server";
import { diagnoseResend } from "@/lib/growth/engine/resend-diagnostic";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";

export const dynamic = "force-dynamic";

/** Admin-only Resend domains read. This route does not send email or run a Growth Engine cycle. */
export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const result = await diagnoseResend();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
