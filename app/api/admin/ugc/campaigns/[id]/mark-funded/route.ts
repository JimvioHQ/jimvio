import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { isUuid, requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { writeAuditEvent } from "@/services/ops/audit";
import { recordUgcActivity } from "@/lib/ugc/platform/activity";
import { requireAdminReason } from "@/lib/admin/portal-policy";
import { campaignFunding, type EscrowRow } from "@/lib/ugc/escrow-funding";

export const dynamic = "force-dynamic";

/**
 * Admin confirms the brand's money was received outside the checkout
 * (bank transfer, cash, mobile money to Jimvio). Records the missing amount
 * as held escrow in USD so the campaign is fully funded, then makes it active.
 * Payouts can only draw on what is recorded here, so this is audited.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const reasonResult = requireAdminReason(typeof body.reason === "string" ? body.reason : "");
  if (!reasonResult.ok) return NextResponse.json({ error: reasonResult.error }, { status: 400 });

  const db = createServiceRoleClient();
  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, title, status, total_budget, spent_budget")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  if (["cancelled", "completed"].includes(String(campaign.status))) {
    return NextResponse.json({ error: "This campaign is closed and cannot be funded." }, { status: 409 });
  }
  if (!(Number(campaign.total_budget ?? 0) > 0)) {
    return NextResponse.json({ error: "Set a campaign budget before marking it funded." }, { status: 400 });
  }

  const { data: escrowRows } = await db
    .from("ugc_campaign_escrow")
    .select("status, amount, currency, refunded_amount")
    .eq("campaign_id", id);
  const before = campaignFunding({
    escrow: (escrowRows ?? []) as EscrowRow[],
    totalBudget: campaign.total_budget,
    spentBudget: campaign.spent_budget,
  });
  const gap = Math.round((before.budgetUsd - before.heldUsd) * 100) / 100;
  const now = new Date().toISOString();
  const h = await headers();
  const meta = {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  };

  if (gap > 0) {
    const { error: insertError } = await db.from("ugc_campaign_escrow").insert({
      campaign_id: id,
      deposited_by: auth.user.id,
      amount: gap,
      currency: "USD",
      status: "held",
      payment_method: "admin_manual",
      payment_ref: `ADMIN-${Date.now()}`,
      deposited_at: now,
    });
    if (insertError) return NextResponse.json({ error: "Could not record the funding." }, { status: 500 });
  }

  let status = String(campaign.status);
  if (status === "draft" || status === "paused" || status === "pending_funding") {
    const { data: updated } = await db
      .from("ugc_campaigns")
      .update({ status: "active", updated_at: now })
      .eq("id", id)
      .eq("status", status)
      .select("status")
      .maybeSingle();
    if (updated?.status) status = String(updated.status);
  }

  await writeAuditEvent({
    actorId: auth.user.id,
    action: "ugc.campaign.mark_funded",
    entityType: "ugc_campaigns",
    entityId: id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      reason: reasonResult.reason,
      recorded_usd: Math.max(0, gap),
      held_before_usd: before.heldUsd,
      budget_usd: before.budgetUsd,
      previous_status: campaign.status,
      new_status: status,
    },
  });
  await recordUgcActivity(db, {
    campaignId: id,
    eventType: "campaign_funded",
    title: "Campaign marked as funded by Jimvio",
    description: reasonResult.reason,
    actorUserId: auth.user.id,
    metadata: { recorded_usd: Math.max(0, gap) },
  });

  return NextResponse.json({
    ok: true,
    idempotent: gap <= 0,
    status,
    recordedUsd: Math.max(0, gap),
    funding: { state: "funded", heldUsd: before.budgetUsd, coveragePct: 100 },
  });
}
