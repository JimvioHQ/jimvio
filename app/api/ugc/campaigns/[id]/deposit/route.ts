import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { randomUUID } from "crypto";

const MIN_FUNDING_RWF = 1000;

/**
 * POST /api/ugc/campaigns/[id]/deposit
 * Funds campaign escrow (min RWF 1,000) then auto-activates when held.
 * Backward compatible: still accepts `{ phone }` for mobile-money style funding.
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

  const { data: existingEscrow } = await db
    .from("ugc_campaign_escrow")
    .select("id, amount, status")
    .eq("campaign_id", id)
    .eq("status", "held")
    .maybeSingle();

  if (existingEscrow) {
    // Already funded — ensure active
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

  const budget = Number(campaign.total_budget) || MIN_FUNDING_RWF;
  const requested =
    typeof body.amount === "number" && Number.isFinite(body.amount)
      ? Number(body.amount)
      : budget;
  const amount = Math.max(MIN_FUNDING_RWF, requested, budget);

  const escrowInsert = await db.from("ugc_campaign_escrow").insert({
    campaign_id: id,
    deposited_by: user.id,
    amount,
    currency: "RWF",
    status: "held",
    payment_method,
    payment_ref: `TX_${payment_method}_${randomUUID()}`,
  });

  if (escrowInsert.error) {
    return NextResponse.json({ error: escrowInsert.error.message }, { status: 500 });
  }

  const { error: activateErr } = await db
    .from("ugc_campaigns")
    .update({ status: "active" })
    .eq("id", id);

  if (activateErr) {
    return NextResponse.json(
      {
        success: true,
        funded: true,
        activated: false,
        error: activateErr.message,
        message: "Funds locked — activation failed. Retry activate from Campaign Center.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    success: true,
    funded: true,
    activated: true,
    amount,
    currency: "RWF",
    payment_method,
    message: "Campaign funded and activated successfully.",
  });
}
