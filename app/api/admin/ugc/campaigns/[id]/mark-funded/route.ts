import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { isUuid, requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { writeAuditEvent } from "@/services/ops/audit";
import { recordUgcActivity } from "@/lib/ugc/platform/activity";
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

  const body = (await req.json().catch(() => ({}))) as { method?: unknown; reference?: unknown; reason?: unknown };
  const METHODS = new Set(["bank_transfer", "mobile_money", "cash", "card", "crypto", "other"]);
  const method = typeof body.method === "string" && METHODS.has(body.method) ? body.method : "other";
  const reference = typeof body.reference === "string" ? body.reference.trim().slice(0, 120) : "";
  const note = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  const reasonResult = { reason: [method.replace("_", " "), reference, note].filter(Boolean).join(" · ") };

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
    // One escrow record per campaign: record the full budget as held.
    const { data: existing } = await db
      .from("ugc_campaign_escrow")
      .select("id")
      .eq("campaign_id", id)
      .limit(1)
      .maybeSingle();
    const record = {
      amount: before.budgetUsd,
      currency: "USD",
      status: "held",
      locked_amount: before.budgetUsd,
      payment_method: `admin_${method}`,
      deposited_at: now,
    };
    const { error: writeError } = existing?.id
      ? await db.from("ugc_campaign_escrow").update(record).eq("id", existing.id)
      : await db.from("ugc_campaign_escrow").insert({
          ...record,
          campaign_id: id,
          deposited_by: auth.user.id,
          payment_ref: reference || `ADMIN-${Date.now()}`,
        });
    if (writeError) return NextResponse.json({ error: "Could not record the funding." }, { status: 500 });
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
    title: "Campaign funded",
    description: "The budget is held in escrow. The campaign is live.",
    actorUserId: auth.user.id,
    metadata: {},
  });

  return NextResponse.json({
    ok: true,
    idempotent: gap <= 0,
    status,
    recordedUsd: Math.max(0, gap),
    funding: {
      state: "funded",
      heldUsd: before.budgetUsd,
      coveragePct: 100,
      remainingUsd: Math.max(0, before.budgetUsd - before.spentUsd),
    },
  });
}
