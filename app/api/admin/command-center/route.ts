import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";
import { listAuditEvents } from "@/services/ops/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ events: await listAuditEvents(12) });
}
