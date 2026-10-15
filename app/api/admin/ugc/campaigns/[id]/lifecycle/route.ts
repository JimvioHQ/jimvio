import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { isUuid, requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { writeAuditEvent } from "@/services/ops/audit";
import { requireAdminReason } from "@/lib/admin/portal-policy";
import { ugcLifecycleDecision, ugcLifecyclePatch, type UgcLifecycleAction } from "@/lib/admin/control-policy";

export const dynamic = "force-dynamic";

const ACTIONS = new Set<UgcLifecycleAction>(["pause", "resume", "cancel", "complete"]);

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });

  let body: { action?: unknown; reason?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const action = typeof body.action === "string" ? body.action : "";
  if (!ACTIONS.has(action as UgcLifecycleAction)) {
    return NextResponse.json({ error: "That campaign action is not supported." }, { status: 400 });
  }
  const reason = requireAdminReason(typeof body.reason === "string" ? body.reason : "");
  if (!reason.ok) return NextResponse.json({ error: reason.error }, { status: 400 });

  const db = createServiceRoleClient();
  const { data: campaign, error: loadError } = await db.from("ugc_campaigns").select("id, status, activated_by_admin, spent_budget, total_budget").eq("id", id).maybeSingle();
  if (loadError) return NextResponse.json({ error: "Could not load campaign." }, { status: 500 });
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const { data: escrowRows } = await db.from("ugc_campaign_escrow").select("status").eq("campaign_id", id);
  const escrowHeld = (escrowRows ?? []).some((row) => row.status === "held");
  const decision = ugcLifecycleDecision({
    action: action as UgcLifecycleAction,
    status: String(campaign.status),
    escrowHeld,
    adminActivated: Boolean(campaign.activated_by_admin),
  });
  if (!decision.ok) return NextResponse.json({ error: decision.error }, { status: decision.http });
  if (decision.touchesFunding) {
    return NextResponse.json({ error: "This action cannot change funding." }, { status: 409 });
  }

  const h = await headers();
  const now = new Date().toISOString();
  if (!decision.idempotent) {
    const patch = ugcLifecyclePatch(decision.status, now);
    const { data: updated, error: updateError } = await db
      .from("ugc_campaigns")
      .update(patch)
      .eq("id", id)
      .in("status", decision.from)
      .select("id, status, spent_budget, total_budget")
      .maybeSingle();
    if (updateError) return NextResponse.json({ error: "Could not update campaign." }, { status: 500 });
    if (!updated) return NextResponse.json({ error: "The campaign changed before this action completed." }, { status: 409 });
  }

  await writeAuditEvent({
    actorId: auth.user.id,
    action: `ugc.campaign.${action}`,
    entityType: "ugc_campaigns",
    entityId: id,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
    metadata: {
      reason: reason.reason,
      idempotent: decision.idempotent,
      previous_status: campaign.status,
      new_status: decision.status,
      escrow_held: escrowHeld,
      spent_budget: campaign.spent_budget,
      total_budget: campaign.total_budget,
      funding_changed: false,
    },
  });

  return NextResponse.json({
    ok: true,
    idempotent: decision.idempotent,
    status: decision.status,
    funding_changed: false,
  });
}
