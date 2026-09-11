import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import { runSyncJob } from "@/lib/dropshipping/sync/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Process pending ds_sync_jobs (inventory / price / tracking / connection tests).
 * Schedule: every 5 minutes via vercel.json.
 */
export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const db = dsAdminDb();
  const now = new Date().toISOString();

  const { data: jobs, error } = await db
    .from("ds_sync_jobs")
    .select("id, job_type, vendor_id, store_id, attempts")
    .eq("status", "pending")
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load sync jobs." },
      { status: 500 }
    );
  }

  const results: Array<{ jobId: string; ok: boolean; error?: string }> = [];

  for (const job of jobs ?? []) {
    const result = await runSyncJob(db, job.id);
    results.push({
      jobId: job.id,
      ok: result.ok,
      error: result.error,
    });
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    processed: results.length,
    results,
  });
}
