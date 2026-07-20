import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";
import { listSuspendedUsers, listUnifiedReports, resolveReport } from "@/services/ops/trust-safety";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const [reports, suspendedUsers] = await Promise.all([listUnifiedReports(), listSuspendedUsers()]);
  return NextResponse.json({ reports, suspendedUsers });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json();
  if (!["ugc_reports", "community_content_reports"].includes(body.source) || typeof body.id !== "string") {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }
  await resolveReport({ source: body.source, id: body.id, actorId: auth.user.id, resolution: body.resolution });
  return NextResponse.json({ ok: true });
}
