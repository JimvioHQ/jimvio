import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { runIngestCycle } from "@/lib/editorial/ingest/run";

export const dynamic = "force-dynamic";

/**
 * Authorized ingestion cycle.
 * This route is not listed in vercel.json. A hosted schedule is not active
 * until a release explicitly adds it.
 */
export async function GET(request: NextRequest) {
  const authError = assertCronAuthorized(request);
  if (authError) return authError;

  try {
    const result = await runIngestCycle();
    if (result.unavailable) {
      return NextResponse.json({ ok: false, error: "Media ingestion storage is not ready" }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      skipped: result.skipped,
      counts: result.counts,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Ingest cycle failed" }, { status: 500 });
  }
}
