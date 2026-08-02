import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";
import { roleCan } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

const ENTRY_TYPES = new Set(["fund", "lock", "release", "refund", "adjust", "dispute_hold"]);

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const canFinance =
    roleCan("owner", "finance.payout") || roleCan("finance", "finance.payout");
  if (!canFinance) {
    return NextResponse.json({ error: "Forbidden — owner/finance required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const campaignId = String(body.campaign_id ?? "").trim();
  const entryType = String(body.entry_type ?? "").trim().toLowerCase();
  const amount = Number(body.amount);
  const reference = typeof body.reference === "string" ? body.reference : null;

  if (!campaignId) return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
  if (!ENTRY_TYPES.has(entryType)) {
    return NextResponse.json({ error: "Invalid entry_type" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
  }

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, brand_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.brand_id !== vendor.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: escrow } = await db
    .from("ugc_campaign_escrow")
    .select("id, amount, locked_amount, released_amount, refunded_amount, status")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const funded = Number(escrow?.amount ?? 0);
  const locked = Number(escrow?.locked_amount ?? 0);
  const released = Number(escrow?.released_amount ?? 0);
  const refunded = Number(escrow?.refunded_amount ?? 0);

  let nextAmount = funded;
  let nextLocked = locked;
  let nextReleased = released;
  let nextRefunded = refunded;
  let nextStatus = escrow?.status ?? "held";

  if (entryType === "fund") {
    nextAmount = funded + amount;
    nextStatus = "held";
  } else if (entryType === "lock") {
    nextLocked = locked + amount;
  } else if (entryType === "release") {
    nextReleased = released + amount;
    nextLocked = Math.max(0, locked - amount);
    nextStatus = "released";
  } else if (entryType === "refund") {
    nextRefunded = refunded + amount;
    nextAmount = Math.max(0, funded - amount);
    nextStatus = "refunded";
  } else if (entryType === "dispute_hold") {
    nextLocked = locked + amount;
  } else if (entryType === "adjust") {
    nextAmount = Math.max(0, funded + amount);
  }

  const balanceAfter = nextAmount - nextLocked - nextReleased;

  if (escrow) {
    await db
      .from("ugc_campaign_escrow")
      .update({
        amount: nextAmount,
        locked_amount: nextLocked,
        released_amount: nextReleased,
        refunded_amount: nextRefunded,
        status: nextStatus,
      })
      .eq("id", escrow.id);
  } else if (entryType === "fund") {
    await db.from("ugc_campaign_escrow").insert({
      campaign_id: campaignId,
      amount: nextAmount,
      locked_amount: nextLocked,
      released_amount: nextReleased,
      refunded_amount: nextRefunded,
      status: nextStatus,
      currency: "USD",
      deposited_at: new Date().toISOString(),
    });
  } else {
    return NextResponse.json({ error: "No escrow record — fund first" }, { status: 409 });
  }

  const { data: entry, error: iErr } = await db
    .from("ugc_escrow_ledger")
    .insert({
      campaign_id: campaignId,
      brand_id: vendor.id,
      entry_type: entryType,
      amount,
      currency: "USD",
      balance_after: balanceAfter,
      reference,
      actor_user_id: user.id,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    })
    .select()
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  return NextResponse.json(
    {
      entry,
      escrow: {
        amount: nextAmount,
        locked_amount: nextLocked,
        released_amount: nextReleased,
        refunded_amount: nextRefunded,
        status: nextStatus,
        balance_after: balanceAfter,
      },
    },
    { status: 201 }
  );
}
