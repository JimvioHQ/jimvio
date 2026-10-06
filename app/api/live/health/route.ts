import { NextResponse } from "next/server";
import { getEgressStorageReport, getLiveStudioEnvReport } from "@/lib/live/env";

export const dynamic = "force-dynamic";

/**
 * GET /api/live/health
 * Reports Live Studio infrastructure readiness without exposing secrets.
 */
export async function GET() {
  const report = getLiveStudioEnvReport();
  const egressStorage = getEgressStorageReport();
  return NextResponse.json(
    {
      ok: report.ok,
      service: "live_studio",
      missing: report.missing,
      present: report.present,
      egressStorage,
      migrations: [
        "080_live_studio.sql (deprecated stub)",
        "081_live_recordings.sql (deprecated stub)",
        "082_live_schema_repair.sql",
        "083_live_recordings_repair.sql",
      ],
      hint: report.ok
        ? egressStorage.configured
          ? "Infrastructure env present"
          : "LiveKit ok; set LIVEKIT_EGRESS_S3_* for recording storage"
        : "Set missing secrets, apply migrations, configure LiveKit egress + webhook",
    },
    { status: report.ok ? 200 : 503 }
  );
}
