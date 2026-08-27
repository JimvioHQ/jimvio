import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { randomUUID } from "crypto";
import {
  assertCampaignReadyForFunding,
  campaignWizardErrorPayload,
} from "@/lib/ugc/campaign-wizard-validation";
import { ensureWallet } from "@/lib/wallet-os/ensure";

const MIN_FUNDING_RWF = 1000;

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

async function refundWalletDebit(
  db: ServiceClient,
  userId: string,
  amount: number,
  availableAfterDebit: number,
) {
  await db
    .from("wallets")
    .update({ available_balance: availableAfterDebit + amount })
    .eq("user_id", userId)
    .eq("available_balance", availableAfterDebit);
}

async function debitWalletForEscrow(
  db: ServiceClient,
  userId: string,
  amount: number,
): Promise<{ ok: true; availableAfter: number } | { ok: false; error: string; status: number }> {
  const wallet = await ensureWallet(userId, db);
  const available = Number(wallet.available_balance ?? 0);
  if (available < amount) {
    return {
      ok: false,
      error: `Insufficient wallet balance. Need RWF ${amount.toLocaleString()}, have RWF ${available.toLocaleString()}.`,
      status: 400,
    };
  }

  const { data: rows, error } = await db
    .from("wallets")
    .update({ available_balance: available - amount })
    .eq("user_id", userId)
    .eq("available_balance", available)
    .select("id, available_balance");

  if (error || !rows?.length) {
    return { ok: false, error: "Insufficient wallet balance.", status: 400 };
  }

  return { ok: true, availableAfter: Number(rows[0].available_balance ?? available - amount) };
}

async function markEscrowHeld(
  db: ServiceClient,
  opts: {
    campaignId: string;
    userId: string;
    amount: number;
    paymentRef: string;
    existingId?: string;
  },
) {
  const now = new Date().toISOString();
  if (opts.existingId) {
    return db
      .from("ugc_campaign_escrow")
      .update({
        status: "held",
        amount: opts.amount,
        currency: "RWF",
        payment_method: "wallet",
        payment_ref: opts.paymentRef,
        locked_amount: opts.amount,
        deposited_at: now,
      })
      .eq("id", opts.existingId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
  }

  return db
    .from("ugc_campaign_escrow")
    .insert({
      campaign_id: opts.campaignId,
      deposited_by: opts.userId,
      amount: opts.amount,
      currency: "RWF",
      status: "held",
      payment_method: "wallet",
      payment_ref: opts.paymentRef,
      locked_amount: opts.amount,
      deposited_at: now,
    })
    .select("id")
    .maybeSingle();
}

async function recordEscrowTransaction(
  db: ServiceClient,
  userId: string,
  campaignId: string,
  amount: number,
) {
  try {
    await db.from("transactions").insert({
      user_id: userId,
      type: "ugc_escrow",
      amount: -amount,
      currency: "RWF",
      status: "completed",
      direction: "debit",
      reference: campaignId,
      description: `UGC campaign escrow ${campaignId}`,
    });
  } catch {
    /* ledger is additive — escrow row is the source of truth */
  }
}

/**
 * POST /api/ugc/campaigns/[id]/deposit
 * Wallet method: debit available balance, lock escrow as held, activate.
 * Flutterwave / crypto: record a pending escrow intent until payment confirms.
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

  if ((payment_method === "mobile_money" || payment_method === "flutterwave") && !phone) {
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
      pending: false,
      message: "Campaign already funded and activated.",
    });
  }

  const { data: pendingEscrow } = await db
    .from("ugc_campaign_escrow")
    .select("id, amount, status")
    .eq("campaign_id", id)
    .eq("status", "pending")
    .maybeSingle();

  const budget = Number(campaign.total_budget) || MIN_FUNDING_RWF;
  const amount = Math.max(MIN_FUNDING_RWF, budget);

  if (payment_method === "wallet") {
    const debit = await debitWalletForEscrow(db, user.id, amount);
    if (!debit.ok) {
      return NextResponse.json({ error: debit.error }, { status: debit.status });
    }

    const paymentRef = `WALLET_${randomUUID()}`;
    const held = await markEscrowHeld(db, {
      campaignId: id,
      userId: user.id,
      amount,
      paymentRef,
      existingId: pendingEscrow?.id,
    });

    if (held.error) {
      if (held.error.code === "23505") {
        const { data: existing } = await db
          .from("ugc_campaign_escrow")
          .select("id, status")
          .eq("campaign_id", id)
          .maybeSingle();
        await refundWalletDebit(db, user.id, amount, debit.availableAfter);
        if (existing?.status === "held") {
          if (campaign.status !== "active") {
            await db.from("ugc_campaigns").update({ status: "active" }).eq("id", id);
          }
          return NextResponse.json({
            success: true,
            already_funded: true,
            activated: true,
            pending: false,
            message: "Campaign already funded and activated.",
          });
        }
        return NextResponse.json(
          { error: "Escrow already exists for this campaign." },
          { status: 409 },
        );
      }
      await refundWalletDebit(db, user.id, amount, debit.availableAfter);
      return NextResponse.json({ error: held.error.message }, { status: 500 });
    }

    if (!held.data) {
      await refundWalletDebit(db, user.id, amount, debit.availableAfter);
      return NextResponse.json(
        { error: "Could not lock escrow. Please retry." },
        { status: 409 },
      );
    }

    await db.from("ugc_campaigns").update({ status: "active" }).eq("id", id);
    await recordEscrowTransaction(db, user.id, id, amount);

    return NextResponse.json({
      success: true,
      funded: true,
      activated: true,
      pending: false,
      amount,
      currency: "RWF",
      payment_method,
      message: "Wallet escrow locked. Campaign is active.",
    });
  }

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
    if (escrowInsert.error.code === "23505") {
      const { data: existing } = await db
        .from("ugc_campaign_escrow")
        .select("id, amount, status")
        .eq("campaign_id", id)
        .maybeSingle();
      if (existing?.status === "held") {
        if (campaign.status !== "active") {
          await db.from("ugc_campaigns").update({ status: "active" }).eq("id", id);
        }
        return NextResponse.json({
          success: true,
          already_funded: true,
          activated: true,
          pending: false,
          message: "Campaign already funded and activated.",
        });
      }
      return NextResponse.json({
        success: true,
        funded: false,
        activated: false,
        pending: true,
        amount: existing?.amount ?? amount,
        currency: "RWF",
        payment_method,
        message: "Escrow intent already pending payment confirmation.",
      });
    }
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
