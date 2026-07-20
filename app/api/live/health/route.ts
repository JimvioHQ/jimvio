import { NextResponse } from "next/server";
import { getLiveStudioEnvReport } from "@/lib/live/env";

export const dynamic = "force-dynamic";

/**
 * GET /api/live/health
 * Reports Live Studio infrastructure readiness without exposing secrets.
 */
export async function GET() {
  const report = getLiveStudioEnvReport();
  return NextResponse.json(
    {
      ok: report.ok,
      service: "live_studio",
      missing: report.missing,
      present: report.present,
      migrations: [
        "080_live_studio.sql (deprecated stub)",
        "081_live_recordings.sql (deprecated stub)",
        "082_live_schema_repair.sql",
        "083_live_recordings_repair.sql",
      ],
      hint: report.ok
        ? "Infrastructure env present"
        : "Set missing secrets, apply migrations, configure LiveKit egress + webhook",
    },
    { status: report.ok ? 200 : 503 }
  );
}
