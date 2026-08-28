import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { requireBrandWorkspace, brandIdFromRequest } from "@/lib/ugc/enterprise/brand-access";
import { requireBrandPermission } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

/** User-facing ledger may lock/hold existing funds. Funding and adjustments require payment webhooks. */
const ALLOWED_ENTRY_TYPES = new Set(["lock", "release", "refund", "dispute_hold"]);

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id, brandIdFromRequest(req));
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;

  const perm = await requireBrandPermission(db, vendor.id, user.id, "finance.payout");
  if (!perm.ok) {
    return NextResponse.json({ error: "Forbidden — owner/finance required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const campaignId = String(body.campaign_id ?? "").trim();
  const entryType = String(body.entry_type ?? "").trim().toLowerCase();
  const amount = Number(body.amount);
  const reference = typeof body.reference === "string" ? body.reference : null;

  if (!campaignId) return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
  if (entryType === "fund" || entryType === "adjust") {
    return NextResponse.json(
      { error: "Escrow funding must come from a verified payment, not this endpoint" },
      { status: 403 },
    );
  }
  if (!ALLOWED_ENTRY_TYPES.has(entryType)) {
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

  if (!escrow) {
    return NextResponse.json({ error: "No escrow record — fund first" }, { status: 409 });
  }

  const funded = Number(escrow.amount ?? 0);
  const locked = Number(escrow.locked_amount ?? 0);
  const released = Number(escrow.released_amount ?? 0);
  const refunded = Number(escrow.refunded_amount ?? 0);
  const available = Math.max(0, funded - locked - released - refunded);

  let nextAmount = funded;
  let nextLocked = locked;
  let nextReleased = released;
  let nextRefunded = refunded;
  let nextStatus = escrow.status ?? "held";

  if (entryType === "lock" || entryType === "dispute_hold") {
    if (amount > available) {
      return NextResponse.json({ error: "Amount exceeds available escrow" }, { status: 409 });
    }
    nextLocked = locked + amount;
  } else if (entryType === "release") {
    if (amount > locked) {
      return NextResponse.json({ error: "Amount exceeds locked escrow" }, { status: 409 });
    }
    nextReleased = released + amount;
    nextLocked = Math.max(0, locked - amount);
    if (nextLocked === 0 && nextReleased > 0) nextStatus = "released";
  } else if (entryType === "refund") {
    if (amount > available) {
      return NextResponse.json({ error: "Amount exceeds available escrow" }, { status: 409 });
    }
    nextRefunded = refunded + amount;
    nextAmount = Math.max(0, funded - amount);
    nextStatus = nextAmount === 0 ? "refunded" : nextStatus;
  }

  const balanceAfter = nextAmount - nextLocked - nextReleased;

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
