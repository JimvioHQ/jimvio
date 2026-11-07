import { NextRequest, NextResponse } from "next/server";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";
import {
  campaignFundingChargeUsd,
  checkMinCampaignFunding,
  MIN_CAMPAIGN_FUNDING_USD,
} from "@/lib/ugc/min-funding";
import { campaignFunding } from "@/lib/ugc/escrow-funding";

export const dynamic = "force-dynamic";

/**
 * POST /api/ugc/campaigns/[id]/budget-increase
 * Validates a live campaign budget top-up. Does NOT raise total_budget until
 * escrow payment is confirmed — returns the incremental amount that must be funded.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabaseAuth = await import("@/lib/supabase/server").then((m) => m.createClient());
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { newBudget?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newBudget = Number(body.newBudget);
  if (!Number.isFinite(newBudget) || newBudget <= 0) {
    return NextResponse.json({ error: "Enter a valid new budget amount (USD)." }, { status: 400 });
  }

  const access = await requireCampaignPermission(user.id, id, "finance.payout");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data: campaign } = await access.db
    .from("ugc_campaigns")
    .select("id, status, total_budget, spent_budget, brand_id")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  if (!["active", "paused"].includes(String(campaign.status))) {
    return NextResponse.json(
      {
        error: "Budget top-up is only available for active or paused campaigns. Drafts use Fund & Activate.",
        code: "INVALID_STATUS",
      },
      { status: 400 },
    );
  }

  const current = Number(campaign.total_budget ?? 0);
  if (newBudget <= current + 0.009) {
    return NextResponse.json(
      { error: `New budget must be greater than the current budget ($${current.toFixed(2)}).` },
      { status: 400 },
    );
  }

  const minCheck = checkMinCampaignFunding(newBudget, "USD");
  if (!minCheck.ok) {
    return NextResponse.json(
      {
        error: minCheck.message,
        code: "MIN_FUNDING_USD",
        requiredUsd: MIN_CAMPAIGN_FUNDING_USD,
      },
      { status: 400 },
    );
  }

  const { data: escrowRows } = await access.db
    .from("ugc_campaign_escrow")
    .select("status, amount, currency, refunded_amount")
    .eq("campaign_id", id);

  const funding = campaignFunding({
    escrow: escrowRows ?? [],
    totalBudget: current,
    spentBudget: campaign.spent_budget,
  });

  const targetHeld = campaignFundingChargeUsd(newBudget, "USD");
  const incremental = Math.round((targetHeld - funding.heldUsd) * 100) / 100;
  if (incremental <= 0.009) {
    return NextResponse.json(
      {
        error: "Escrow already covers the requested budget. No additional payment is required.",
        code: "ALREADY_COVERED",
        heldUsd: funding.heldUsd,
        newBudget,
      },
      { status: 400 },
    );
  }

  // Persist a pending top-up intent in escrow ledger (append-only) without raising budget yet.
  await access.db.from("ugc_escrow_ledger").insert({
    brand_id: campaign.brand_id,
    campaign_id: id,
    entry_type: "adjust",
    amount: incremental,
    currency: "USD",
    actor_user_id: user.id,
    reference: `pending_budget_increase`,
    metadata: {
      purpose: "pending_budget_increase",
      from_budget: current,
      to_budget: newBudget,
      incremental_usd: incremental,
    },
  });

  return NextResponse.json({
    success: true,
    campaignId: id,
    currentBudget: current,
    newBudget,
    incrementalUsd: incremental,
    heldUsd: funding.heldUsd,
    fundUrl: `/ugc/campaign-center/${id}/fund?topUp=${encodeURIComponent(String(incremental))}&newBudget=${encodeURIComponent(String(newBudget))}`,
    message:
      "Complete payment for the incremental amount. Budget updates only after confirmed escrow.",
  });
}
