import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { randomUUID } from "crypto";
import {
  assertCampaignReadyForFunding,
  campaignWizardErrorPayload,
} from "@/lib/ugc/campaign-wizard-validation";

const MIN_FUNDING_RWF = 1000;

/**
 * POST /api/ugc/campaigns/[id]/deposit
 * Records a pending escrow intent. Does not credit or activate until a
 * verified payment webhook confirms funds.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    );
  if (!isUUID)
    return NextResponse.json({ error: "Invalid campaign ID format" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const paymentMethodRaw =
    typeof body.payment_method === "string" ? body.payment_method : "mobile_money";
  const payment_method = ["flutterwave", "wallet", "crypto", "mobile_money"].includes(
    paymentMethodRaw,
  )
    ? paymentMethodRaw
    : "mobile_money";

  if (payment_method === "mobile_money" && !phone) {
    return NextResponse.json(
      { error: "A valid funding phone number is required." },
      { status: 400 },
    );
  }

  const db = createServiceRoleClient();

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("*, vendors!brand_id(user_id)")
    .eq("id", id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const vendor = campaign.vendors as unknown as { user_id: string };
  if (vendor.user_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden - User does not own this campaign" },
      { status: 403 },
    );
  }

  if (campaign.status === "draft") {
    const ready = assertCampaignReadyForFunding(campaign as Record<string, unknown>);
    if (!ready.success) {
      return NextResponse.json(campaignWizardErrorPayload(ready), { status: 400 });
    }
  }

  const { data: heldEscrow } = await db
    .from("ugc_campaign_escrow")
    .select("id, amount, status")
    .eq("campaign_id", id)
    .eq("status", "held")
    .maybeSingle();

  if (heldEscrow) {
    if (campaign.status !== "active") {
      await db.from("ugc_campaigns").update({ status: "active" }).eq("id", id);
    }
    return NextResponse.json({
      success: true,
      already_funded: true,
      activated: true,
      message: "Campaign already funded and activated.",
    });
  }

  const { data: pendingEscrow } = await db
    .from("ugc_campaign_escrow")
    .select("id, amount, status")
    .eq("campaign_id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingEscrow) {
    return NextResponse.json({
      success: true,
      funded: false,
      activated: false,
      pending: true,
      amount: pendingEscrow.amount,
      currency: "RWF",
      payment_method,
      message: "Escrow intent already pending payment confirmation.",
    });
  }

  const budget = Number(campaign.total_budget) || MIN_FUNDING_RWF;
  const amount = Math.max(MIN_FUNDING_RWF, budget);

  const escrowInsert = await db.from("ugc_campaign_escrow").insert({
    campaign_id: id,
    deposited_by: user.id,
    amount,
    currency: "RWF",
    status: "pending",
    payment_method,
    payment_ref: `PENDING_${payment_method}_${randomUUID()}`,
  });

  if (escrowInsert.error) {
    return NextResponse.json({ error: escrowInsert.error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    funded: false,
    activated: false,
    pending: true,
    amount,
    currency: "RWF",
    payment_method,
    message: "Escrow intent recorded. Campaign activates after payment confirmation.",
  });
}
