import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { isUuid, requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { writeAuditEvent } from "@/services/ops/audit";
import { recordUgcActivity } from "@/lib/ugc/platform/activity";
import {
  assertCampaignReadyForFunding,
  campaignWizardErrorPayload,
} from "@/lib/ugc/campaign-wizard-validation";
import {
  adminActivateOverrideError,
  canAdminActivateOverride,
  isAdminActivateIdempotent,
} from "@/lib/ugc/admin-activate-override";
import { requireAdminReason } from "@/lib/admin/portal-policy";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  };
}

async function escrowState(db: ReturnType<typeof createServiceRoleClient>, campaignId: string) {
  const { data } = await db
    .from("ugc_campaign_escrow")
    .select("status")
    .eq("campaign_id", campaignId);
  if ((data ?? []).some((r) => r.status === "held")) return "held";
  if ((data ?? []).some((r) => r.status === "pending")) return "pending";
  return "unfunded";
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const reasonResult = requireAdminReason(
    body && typeof body === "object" && typeof (body as { reason?: unknown }).reason === "string"
      ? (body as { reason: string }).reason
      : "",
  );

  const db = createServiceRoleClient();
  const { data: campaign, error: loadError } = await db
    .from("ugc_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: "Could not load campaign." }, { status: 500 });
  }
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const fundingBefore = await escrowState(db, id);
  const meta = await requestMeta();
  const previousStatus = String(campaign.status ?? "");

  if (!isAdminActivateIdempotent(previousStatus) && !reasonResult.ok) {
    return NextResponse.json({ error: reasonResult.error }, { status: 400 });
  }
  const reason = reasonResult.ok ? reasonResult.reason : null;

  if (isAdminActivateIdempotent(previousStatus)) {
    await writeAuditEvent({
      actorId: auth.user.id,
      action: "ugc.campaign.activate_override",
      entityType: "ugc_campaigns",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: {
        idempotent: true,
        previous_status: previousStatus,
        new_status: previousStatus,
        previous_funding_state: fundingBefore,
        resulting_funding_state: fundingBefore,
        reason,
      },
    });
    return NextResponse.json({
      ok: true,
      idempotent: true,
      campaign: { ...campaign, escrow_state: fundingBefore },
    });
  }

  const blocked = adminActivateOverrideError(previousStatus);
  if (blocked) {
    return NextResponse.json({ error: blocked.error }, { status: blocked.status });
  }

  if (previousStatus === "draft") {
    const ready = assertCampaignReadyForFunding(campaign as Record<string, unknown>);
    if (!ready.success) {
      return NextResponse.json(campaignWizardErrorPayload(ready), { status: 400 });
    }
  }

  if (!canAdminActivateOverride(previousStatus)) {
    return NextResponse.json({ error: "This campaign cannot be activated from its current state." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await db
    .from("ugc_campaigns")
    .update({
      status: "active",
      activated_by_admin: true,
      admin_activated_at: now,
      admin_activated_by: auth.user.id,
      admin_activation_reason: reason,
      updated_at: now,
    })
    .eq("id", id)
    .in("status", ["draft", "paused"])
    .select("*")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: "Could not activate campaign." }, { status: 500 });
  }

  if (!updated) {
    const { data: raced } = await db.from("ugc_campaigns").select("*").eq("id", id).maybeSingle();
    if (raced?.status === "active") {
      return NextResponse.json({
        ok: true,
        idempotent: true,
        campaign: { ...raced, escrow_state: fundingBefore },
      });
    }
    return NextResponse.json({ error: "Could not activate campaign." }, { status: 409 });
  }

  const fundingAfter = await escrowState(db, id);

  await writeAuditEvent({
    actorId: auth.user.id,
    action: "ugc.campaign.activate_override",
    entityType: "ugc_campaigns",
    entityId: id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      idempotent: false,
      previous_status: previousStatus,
      new_status: "active",
      previous_funding_state: fundingBefore,
      resulting_funding_state: fundingAfter,
      spent_budget: campaign.spent_budget,
      total_budget: campaign.total_budget,
      reason,
    },
  });

  await recordUgcActivity(db, {
    campaignId: id,
    eventType: "campaign_activated",
    title: "Campaign activated by admin",
    description: reason ?? "Activated without recording funding.",
    actorUserId: auth.user.id,
    metadata: {
      override: true,
      previous_status: previousStatus,
      funding_state: fundingAfter,
    },
  });

  return NextResponse.json({
    ok: true,
    idempotent: false,
    campaign: { ...updated, escrow_state: fundingAfter },
  });
}
