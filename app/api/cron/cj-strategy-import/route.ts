import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { assertCjQuotaAvailableForBackground } from "@/lib/cj/quota-circuit";
import {
  releaseHeavyWorkerLock,
  tryAcquireHeavyWorkerLock,
} from "@/lib/cj/premium-intelligence/worker-coordinator";
import { runStrategyImport } from "@/lib/cj/premium-intelligence/strategy-import";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Hourly — 2 strategy keywords, at most 6 new products, only trending + verified + video + in stock. */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  if (!(await assertCjQuotaAvailableForBackground())) {
    return NextResponse.json({ ok: true, skipped: true, reason: "cj_api_quota_circuit_open" });
  }

  const lock = await tryAcquireHeavyWorkerLock("list_sync", { metadata: { source: "cj-strategy-import-cron" } });
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: true, reason: lock.reason });
  }

  try {
    const result = await runStrategyImport();
    await releaseHeavyWorkerLock(lock.runId, {
      status: result.failed > 0 ? "partial" : "success",
      total_fetched: result.searched,
      total_saved: result.published,
      metadata: { strategyImport: result },
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message || err.name || "Error" : String(err);
    console.error("[cj-strategy-import] failed", err);
    await releaseHeavyWorkerLock(lock.runId, { status: "failed", error_message: message.slice(0, 500) });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
