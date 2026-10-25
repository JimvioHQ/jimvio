import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { logger } from "@/lib/ops/logger";
import { runCronCycle } from "@/services/growth/engine-control";

export const dynamic = "force-dynamic";

/** Daily heartbeat. A paused engine or an engaged kill switch returns before planning or sending. */
export async function GET(request: NextRequest) {
  const authError = assertCronAuthorized(request);
  if (authError) return authError;

  const result = await runCronCycle();
  if (!result.ok) {
    const status = "status" in result && typeof result.status === "number" ? result.status : 500;
    logger.error("growth_engine_cron_failed", { status, error: result.error });
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  logger.info("growth_engine_cron_finished", {
    status: result.summary.status,
    tasksRun: result.summary.tasksRun,
    tasksSkipped: result.summary.tasksSkipped,
    errors: result.summary.errors.length,
  });
  return NextResponse.json(result);
}
