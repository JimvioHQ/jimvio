import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { runDailyScoreRecalc } from "@/lib/cj/premium-intelligence/refresh-jobs";
import {
  cjIntelligenceDisabledPayload,
  isCjProductIntelligenceProcessingEnabled,
} from "@/lib/cj/intelligence-kill-switch";

export const runtime = "nodejs";
export const maxDuration = 300;


/** Disabled unless CJ_PRODUCT_INTELLIGENCE_ENABLED=true. */
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  if (!isCjProductIntelligenceProcessingEnabled()) {
    return NextResponse.json(cjIntelligenceDisabledPayload({ rescored: 0 }));
  }

  try {
    const result = await runDailyScoreRecalc();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
