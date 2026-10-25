import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { runCronCycle } from "@/services/growth/engine-control";

export const dynamic = "force-dynamic";

/** Daily heartbeat. The engine stays paused until an admin resumes it, and the kill switch overrides resume. */
export async function GET(request: NextRequest) {
  const authError = assertCronAuthorized(request);
  if (authError) return authError;

  const result = await runCronCycle();
  if (!result.ok) {
    const status = "status" in result && typeof result.status === "number" ? result.status : 500;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json(result);
}
