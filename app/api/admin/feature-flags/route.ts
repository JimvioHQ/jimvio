import { NextRequest, NextResponse } from "next/server";
import { listFlags, setFlag } from "@/lib/ops/feature-flags";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";
import { writeAuditEvent } from "@/services/ops/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  return NextResponse.json(await listFlags());
}

export async function PUT(request: NextRequest) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json();
  if (typeof body.key !== "string" || !/^[a-z0-9._-]+$/i.test(body.key)) {
    return NextResponse.json({ error: "Invalid flag key" }, { status: 400 });
  }
  const flag = await setFlag(body.key, {
    enabled: Boolean(body.enabled),
    description: typeof body.description === "string" ? body.description.slice(0, 500) : null,
    rollout_percent: Math.max(0, Math.min(100, Number(body.rollout_percent ?? 100))),
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
  }, auth.user.id);
  await writeAuditEvent({ actorId: auth.user.id, action: "feature_flag.updated", entityType: "platform_feature_flags", entityId: flag.key, metadata: { enabled: flag.enabled, rollout_percent: flag.rollout_percent } });
  return NextResponse.json(flag);
}
