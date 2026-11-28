import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { randomUUID } from "crypto";
import {
  assertCampaignReadyForFunding,
  campaignWizardErrorPayload,
} from "@/lib/ugc/campaign-wizard-validation";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";
import { emitUgcEvent } from "@/lib/ugc/enterprise/events";
import { createFlutterwavePaymentLink } from "@/lib/flutterwave";
import { generateTxRef } from "@/lib/payments/tx-ref";
import { createNowPaymentsInvoice } from "@/lib/nowpayments";
import { createBinancePayOrder } from "@/lib/binance-pay";
import { orderTotalsForUsdGateway } from "@/lib/money";
import { normalizeWalletDepositMethod } from "@/lib/payments/wallet-deposit-method";
import { safeDepositInitiateError } from "@/lib/payments/safe-payment-error";
import { BINANCE_PAY_MAINTENANCE_ENABLED, binancePayMaintenancePayload } from "@/lib/payments/binance-pay-maintenance";
import { campaignFunding } from "@/lib/ugc/escrow-funding";
import {
  campaignFundingChargeUsd,
  checkMinCampaignFunding,
  MIN_CAMPAIGN_FUNDING_USD,
} from "@/lib/ugc/min-funding";

/** Canonical UGC external funding methods (wallet is separate). */
function normalizeUgcPaymentMethod(raw: string): string {
  const key = String(raw ?? "").trim().toLowerCase();
  if (key === "wallet") return "wallet";
  const depositLike = normalizeWalletDepositMethod(key);
  if (depositLike === "nowpayments" || depositLike === "crypto") return "crypto";
  if (depositLike === "binancepay") return "binancepay";
  if (depositLike === "flutterwave" || depositLike === "mobile_money") {
    return depositLike === "mobile_money" ? "mobile_money" : "flutterwave";
  }
  if (["flutterwave", "wallet", "crypto", "mobile_money", "binancepay"].includes(key)) {
    return key;
  }
  return "flutterwave";
}

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

async function refundWalletDebit(
  db: ServiceClient,
  userId: string,
  amount: number,
  availableAfterDebit: number,
): Promise<boolean> {
  const { data: rows } = await db
    .from("wallets")
    .update({ available_balance: availableAfterDebit + amount })
    .eq("user_id", userId)
    .eq("available_balance", availableAfterDebit)
    .select("id");
  return Boolean(rows?.length);
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
      error: `Insufficient wallet balance. Need $${amount.toFixed(2)}, have $${available.toFixed(2)}.`,
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
        currency: "USD",
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
      currency: "USD",
      status: "held",
      payment_method: "wallet",
      payment_ref: opts.paymentRef,
      locked_amount: opts.amount,
      deposited_at: now,
    })
    .select("id")
    .maybeSingle();
}

async function initiateExternalCheckout(
  db: ServiceClient,
  opts: {
    req: NextRequest;
    user: { id: string; email?: string | null };
    campaignId: string;
    amount: number;
    paymentMethod: string;
    phone: string;
    topUp?: {
      fromBudget: number;
      toBudget: number | null;
      incrementalUsd: number;
      previousHeld: number;
    };
  },
): Promise<{ ok: true; checkoutUrl: string | null; paymentRef: string } | { ok: false; error: string; status: number }> {
  const origin =
    opts.req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://www.jimvio.com";
  const appUrl = origin.replace(/\/$/, "");
  const purpose = opts.topUp ? "ugc_escrow_topup" : "ugc_escrow";
  // Flutterwave meta must be string values; DB transaction metadata keeps numbers.
  const flutterwaveMeta: Record<string, string> = opts.topUp
    ? {
        purpose,
        campaign_id: opts.campaignId,
        from_budget: String(opts.topUp.fromBudget),
        to_budget: String(opts.topUp.toBudget ?? ""),
        incremental_usd: String(opts.topUp.incrementalUsd),
        previous_held: String(opts.topUp.previousHeld),
      }
    : { purpose, campaign_id: opts.campaignId };
  const topUpMeta = opts.topUp
    ? {
        purpose,
        campaign_id: opts.campaignId,
        from_budget: opts.topUp.fromBudget,
        to_budget: opts.topUp.toBudget,
        incremental_usd: opts.topUp.incrementalUsd,
        previous_held: opts.topUp.previousHeld,
      }
    : { purpose, campaign_id: opts.campaignId };

  if (opts.paymentMethod === "mobile_money") {
    return {
      ok: false,
      error:
        "Select Mobile Money again to open the dedicated Mobile Money funding step.",
      status: 400,
    };
  }

  if (opts.paymentMethod === "flutterwave") {
    const { data: profile } = await db
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", opts.user.id)
      .maybeSingle();
    const txRef = generateTxRef("UGC");
    try {
      const checkoutUrl = await createFlutterwavePaymentLink({
        txRef,
        amount: opts.amount,
        currency: "USD",
        redirectUrl: `${appUrl}/api/payments/flutterwave/callback?campaign=${opts.campaignId}`,
        customerEmail: profile?.email || opts.user.email || "ugc@jimvio.com",
        customerName: profile?.full_name || "Jimvio Brand",
        customerPhone: opts.phone || profile?.phone || "",
        orderDescription: opts.topUp
          ? `UGC budget top-up ${opts.campaignId.slice(0, 8)}`
          : `UGC campaign escrow ${opts.campaignId.slice(0, 8)}`,
        meta: flutterwaveMeta,
        paymentOptions: "card",
      });
      await db.from("transactions").insert({
        user_id: opts.user.id,
        type: "ugc_escrow",
        amount: opts.amount,
        currency: "USD",
        status: "pending",
        direction: "debit",
        provider: "flutterwave",
        provider_transaction_id: txRef,
        reference: opts.campaignId,
        description: opts.topUp
          ? `UGC budget top-up ${opts.campaignId}`
          : `UGC campaign escrow ${opts.campaignId}`,
        metadata: topUpMeta,
      });
      return { ok: true, checkoutUrl, paymentRef: txRef };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not start Flutterwave checkout",
        status: 502,
      };
    }
  }

  if (opts.paymentMethod === "crypto") {
    const { data: profile } = await db
      .from("profiles")
      .select("email")
      .eq("id", opts.user.id)
      .maybeSingle();
    const invoiceTotals = orderTotalsForUsdGateway(opts.amount, "USD");
    try {
      const invoice = await createNowPaymentsInvoice({
        jimvioOrderId: opts.campaignId,
        amount: invoiceTotals.amount,
        currency: invoiceTotals.currency,
        description: opts.topUp
          ? `UGC budget top-up ${opts.campaignId.slice(0, 8)}`
          : `UGC campaign escrow ${opts.campaignId.slice(0, 8)}`,
        buyerEmail: profile?.email || opts.user.email || "",
        successUrl: `${appUrl}/ugc/campaign-center/${opts.campaignId}/fund?crypto=pending`,
        cancelUrl: `${appUrl}/ugc/campaign-center/${opts.campaignId}/fund?crypto=cancel`,
      });
      await db.from("transactions").insert({
        user_id: opts.user.id,
        type: "ugc_escrow",
        amount: opts.amount,
        currency: "USD",
        status: "pending",
        direction: "debit",
        provider: "nowpayments",
        provider_transaction_id: invoice.invoiceId || opts.campaignId,
        reference: opts.campaignId,
        description: opts.topUp
          ? `UGC budget top-up ${opts.campaignId}`
          : `UGC campaign escrow ${opts.campaignId}`,
        metadata: {
          ...topUpMeta,
          invoice_amount: invoiceTotals.amount,
          invoice_currency: invoiceTotals.currency,
          payment_method: "crypto",
        },
      });
      return {
        ok: true,
        checkoutUrl: invoice.invoiceUrl,
        paymentRef: invoice.invoiceId || `NOWP_${opts.campaignId}`,
      };
    } catch (err) {
      return {
        ok: false,
        error: safeDepositInitiateError("nowpayments", err),
        status: 502,
      };
    }
  }

  if (opts.paymentMethod === "binancepay") {
    const payAmount = Number(opts.amount.toFixed(2));
    const merchantTradeNo = `UGC${opts.campaignId.replace(/-/g, "").slice(0, 18)}${Date.now().toString(36)}`
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 32);
    try {
      const binanceOrder = await createBinancePayOrder({
        merchantOrderId: merchantTradeNo,
        orderAmount: payAmount,
        currency: "USDT",
        description: `UGC campaign escrow ${opts.campaignId.slice(0, 8)}`,
        returnUrl: `${appUrl}/ugc/campaign-center/${opts.campaignId}/fund?binance=pending`,
        cancelUrl: `${appUrl}/ugc/campaign-center/${opts.campaignId}/fund?binance=cancel`,
      });
      const checkoutUrl =
        binanceOrder.checkoutUrl ||
        binanceOrder.universalUrl ||
        binanceOrder.qrcodeLink ||
        null;
      if (!checkoutUrl) {
        return {
          ok: false,
          error: "Binance Pay could not be started. Please try again.",
          status: 502,
        };
      }
      await db.from("transactions").insert({
        user_id: opts.user.id,
        type: "ugc_escrow",
        amount: opts.amount,
        currency: "USD",
        status: "pending",
        direction: "debit",
        provider: "binancepay",
        provider_transaction_id: merchantTradeNo,
        reference: opts.campaignId,
        description: `UGC campaign escrow ${opts.campaignId}`,
        metadata: {
          purpose: "ugc_escrow",
          campaign_id: opts.campaignId,
          binance_merchant_trade_no: merchantTradeNo,
          binance_pay_amount: payAmount,
          binance_pay_currency: "USDT",
          wallet_credit_usd: opts.amount,
          payment_method: "binancepay",
        },
      });
      return { ok: true, checkoutUrl, paymentRef: merchantTradeNo };
    } catch (err) {
      return {
        ok: false,
        error: safeDepositInitiateError("binancepay", err),
        status: 502,
      };
    }
  }

  return { ok: true, checkoutUrl: null, paymentRef: `PENDING_${opts.paymentMethod}_${randomUUID()}` };
}

async function recordEscrowTransaction(
  db: ServiceClient,
  userId: string,
  campaignId: string,
  amount: number,
  metadata?: Record<string, unknown>,
) {
  try {
    await db.from("transactions").insert({
      user_id: userId,
      type: "ugc_escrow",
      amount: -amount,
      currency: "USD",
      status: "completed",
      direction: "debit",
      reference: campaignId,
      description: `UGC campaign escrow ${campaignId}`,
      ...(metadata ? { metadata } : {}),
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
/** Held escrow must cover the whole budget before a campaign goes live. */
function heldCovers(
  campaign: { total_budget?: number | string | null },
  row: { amount?: number | string | null; currency?: string | null } | null | undefined,
): boolean {
  if (!row) return false;
  return (
    campaignFunding({
      escrow: [{ status: "held", amount: row.amount ?? 0, currency: row.currency ?? "USD" }],
      totalBudget: campaign.total_budget,
      spentBudget: 0,
    }).state === "funded"
  );
}

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
    typeof body.payment_method === "string" ? body.payment_method : "flutterwave";
  const payment_method = normalizeUgcPaymentMethod(paymentMethodRaw);
  if (payment_method === "binancepay" && BINANCE_PAY_MAINTENANCE_ENABLED) {
    return NextResponse.json(binancePayMaintenancePayload(), { status: 503 });
  }
  const isTopUp = body.topUp === true;
  const requestedAmount =
    typeof body.amount === "number" && Number.isFinite(body.amount) ? Number(body.amount) : null;
  const topUpNewBudget =
    typeof body.newBudget === "number" && Number.isFinite(body.newBudget)
      ? Number(body.newBudget)
      : null;

  if (payment_method === "mobile_money") {
    return NextResponse.json(
      {
        error:
          "Select Mobile Money again to open the dedicated Mobile Money funding step.",
        code: "USE_MOMO_DEDICATED_FLOW",
      },
      { status: 400 },
    );
  }

  const access = await requireCampaignPermission(user.id, id, "finance.payout");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const db = access.db;

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const ready = assertCampaignReadyForFunding(campaign as Record<string, unknown>);

  const { data: heldEscrowRow } = await db
    .from("ugc_campaign_escrow")
    .select("id, amount, currency, status")
    .eq("campaign_id", id)
    .eq("status", "held")
    .maybeSingle();

  // Initial fund: if already held and covers budget, activate. Top-ups continue below.
  if (heldEscrowRow && !isTopUp) {
    if (ready.success && heldCovers(campaign, heldEscrowRow) && campaign.status !== "active") {
      await db.from("ugc_campaigns").update({ status: "active" }).eq("id", id);
    }
    return NextResponse.json({
      success: true,
      already_funded: true,
      activated: ready.success,
      pending: false,
      message: ready.success
        ? "Campaign already funded and activated."
        : "Escrow is held. Complete required campaign fields before activation.",
    });
  }

  if (!isTopUp && !ready.success) {
    return NextResponse.json(campaignWizardErrorPayload(ready), { status: 400 });
  }

  if (isTopUp && !["active", "paused"].includes(String(campaign.status))) {
    return NextResponse.json(
      { error: "Budget top-up is only available for active or paused campaigns." },
      { status: 400 },
    );
  }

  const { data: pendingEscrow } = await db
    .from("ugc_campaign_escrow")
    .select("id, amount, status")
    .eq("campaign_id", id)
    .eq("status", "pending")
    .maybeSingle();

  const budget = Number(campaign.total_budget) || 0;
  let amount: number;
  if (isTopUp) {
    if (requestedAmount == null || requestedAmount <= 0) {
      return NextResponse.json({ error: "Top-up amount is required." }, { status: 400 });
    }
    if (topUpNewBudget != null) {
      const minCheck = checkMinCampaignFunding(topUpNewBudget, "USD");
      if (!minCheck.ok) {
        return NextResponse.json(
          { error: minCheck.message, code: "MIN_FUNDING_USD" },
          { status: 400 },
        );
      }
    }
    amount = Math.round(requestedAmount * 100) / 100;
  } else {
    const minCheck = checkMinCampaignFunding(budget, "USD");
    if (!minCheck.ok) {
      return NextResponse.json(
        {
          error: minCheck.message,
          code: "MIN_FUNDING_USD",
          requiredUsd: MIN_CAMPAIGN_FUNDING_USD,
          amountUsd: minCheck.amountUsd,
          rateUsed: minCheck.rateUsed,
        },
        { status: 400 },
      );
    }
    amount = campaignFundingChargeUsd(budget, "USD");
  }

  // ── Live budget top-up (wallet) ──────────────────────────────────────────
  if (isTopUp && payment_method === "wallet") {
    if (!heldEscrowRow) {
      return NextResponse.json(
        { error: "No held escrow to top up. Fund the campaign first." },
        { status: 400 },
      );
    }
    const debit = await debitWalletForEscrow(db, user.id, amount);
    if (!debit.ok) {
      return NextResponse.json({ error: debit.error }, { status: debit.status });
    }

    const prevHeld = Number(heldEscrowRow.amount ?? 0);
    const nextHeld = Math.round((prevHeld + amount) * 100) / 100;
    const paymentRef = `WALLET_TOPUP_${randomUUID()}`;
    const { error: topUpErr } = await db
      .from("ugc_campaign_escrow")
      .update({
        amount: nextHeld,
        locked_amount: nextHeld,
        payment_ref: paymentRef,
        deposited_at: new Date().toISOString(),
      })
      .eq("id", heldEscrowRow.id)
      .eq("status", "held");

    if (topUpErr) {
      await refundWalletDebit(db, user.id, amount, debit.availableAfter);
      return NextResponse.json({ error: topUpErr.message }, { status: 500 });
    }

    if (topUpNewBudget != null) {
      await db
        .from("ugc_campaigns")
        .update({ total_budget: topUpNewBudget })
        .eq("id", id);
    }

    await recordEscrowTransaction(db, user.id, id, amount, {
      purpose: "ugc_escrow_topup",
      campaign_id: id,
      from_budget: budget,
      to_budget: topUpNewBudget,
      incremental_usd: amount,
      previous_held: prevHeld,
      next_held: nextHeld,
    });
    await db.from("ugc_escrow_ledger").insert({
      brand_id: campaign.brand_id,
      campaign_id: id,
      entry_type: "deposit",
      amount,
      currency: "USD",
      actor_user_id: user.id,
      reference: paymentRef,
      metadata: {
        purpose: "budget_increase_confirmed",
        from_budget: budget,
        to_budget: topUpNewBudget,
        incremental_usd: amount,
      },
    });

    return NextResponse.json({
      success: true,
      funded: true,
      activated: campaign.status === "active",
      topUp: true,
      pending: false,
      amount,
      newBudget: topUpNewBudget,
      currency: "USD",
      payment_method,
      message: "Budget top-up confirmed. Escrow and budget updated.",
    });
  }

  // ── Live budget top-up (external checkout) ───────────────────────────────
  if (isTopUp) {
    if (!heldEscrowRow) {
      return NextResponse.json(
        { error: "No held escrow to top up. Fund the campaign first." },
        { status: 400 },
      );
    }
    const checkout = await initiateExternalCheckout(db, {
      req,
      user,
      campaignId: id,
      amount,
      paymentMethod: payment_method,
      phone,
      topUp: {
        fromBudget: budget,
        toBudget: topUpNewBudget,
        incrementalUsd: amount,
        previousHeld: Number(heldEscrowRow.amount ?? 0),
      },
    });
    if (!checkout.ok) {
      return NextResponse.json({ error: checkout.error }, { status: checkout.status });
    }
    return NextResponse.json({
      success: true,
      funded: false,
      activated: false,
      topUp: true,
      pending: true,
      checkout_url: checkout.checkoutUrl,
      amount,
      newBudget: topUpNewBudget,
      currency: "USD",
      payment_method,
      message: "Complete payment. Budget updates only after confirmation.",
    });
  }

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
          .select("id, amount, currency, status")
          .eq("campaign_id", id)
          .maybeSingle();
        const refunded = await refundWalletDebit(db, user.id, amount, debit.availableAfter);
        if (existing?.status === "held") {
          if (ready.success && heldCovers(campaign, existing) && campaign.status !== "active") {
            await db.from("ugc_campaigns").update({ status: "active" }).eq("id", id);
          }
          return NextResponse.json({
            success: true,
            already_funded: true,
            activated: ready.success,
            pending: false,
            message: ready.success
              ? "Campaign already funded and activated."
              : "Escrow is held. Complete required campaign fields before activation.",
          });
        }
        if (!refunded) {
          return NextResponse.json(
            { error: "Could not reverse wallet debit after escrow conflict. Contact support." },
            { status: 500 },
          );
        }
        return NextResponse.json(
          { error: "Escrow already exists for this campaign." },
          { status: 409 },
        );
      }
      const refunded = await refundWalletDebit(db, user.id, amount, debit.availableAfter);
      if (!refunded) {
        return NextResponse.json(
          { error: "Escrow lock failed and wallet debit could not be reversed. Contact support." },
          { status: 500 },
        );
      }
      return NextResponse.json({ error: held.error.message }, { status: 500 });
    }

    if (!held.data) {
      const refunded = await refundWalletDebit(db, user.id, amount, debit.availableAfter);
      if (!refunded) {
        return NextResponse.json(
          { error: "Could not lock escrow and wallet debit could not be reversed. Contact support." },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { error: "Could not lock escrow. Please retry." },
        { status: 409 },
      );
    }

    await db.from("ugc_campaigns").update({ status: "active" }).eq("id", id);
    await recordEscrowTransaction(db, user.id, id, amount);
    try {
      await emitUgcEvent(db, campaign.brand_id, "campaign.funded", {
        campaignId: id,
        amount,
        currency: "USD",
      });
    } catch {
      /* additive */
    }

    return NextResponse.json({
      success: true,
      funded: true,
      activated: true,
      pending: false,
      amount,
      currency: "USD",
      payment_method,
      message: "Wallet escrow locked. Campaign is active.",
    });
  }

  const checkout = await initiateExternalCheckout(db, {
    req,
    user,
    campaignId: id,
    amount,
    paymentMethod: payment_method,
    phone,
  });
  if (!checkout.ok) {
    return NextResponse.json({ error: checkout.error }, { status: checkout.status });
  }

  if (pendingEscrow) {
    await db
      .from("ugc_campaign_escrow")
      .update({ payment_ref: checkout.paymentRef, payment_method })
      .eq("id", pendingEscrow.id)
      .eq("status", "pending");
    return NextResponse.json({
      success: true,
      funded: false,
      activated: false,
      pending: true,
      checkout_url: checkout.checkoutUrl,
      amount: pendingEscrow.amount,
      currency: "USD",
      payment_method,
      message: "Escrow intent already pending payment confirmation.",
    });
  }

  const escrowInsert = await db.from("ugc_campaign_escrow").insert({
    campaign_id: id,
    deposited_by: user.id,
    amount,
    currency: "USD",
    status: "pending",
    payment_method,
    payment_ref: checkout.paymentRef,
  });

  if (escrowInsert.error) {
    if (escrowInsert.error.code === "23505") {
      const { data: existing } = await db
        .from("ugc_campaign_escrow")
        .select("id, amount, currency, status")
        .eq("campaign_id", id)
        .maybeSingle();
      if (existing?.status === "held") {
        if (ready.success && heldCovers(campaign, existing) && campaign.status !== "active") {
          await db.from("ugc_campaigns").update({ status: "active" }).eq("id", id);
        }
        return NextResponse.json({
          success: true,
          already_funded: true,
          activated: ready.success,
          pending: false,
          message: ready.success
            ? "Campaign already funded and activated."
            : "Escrow is held. Complete required campaign fields before activation.",
        });
      }
      return NextResponse.json({
        success: true,
        funded: false,
        activated: false,
        pending: true,
        checkout_url: checkout.checkoutUrl,
        amount: existing?.amount ?? amount,
        currency: "USD",
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
    checkout_url: checkout.checkoutUrl,
    amount,
    currency: "USD",
    payment_method,
    message: "Escrow intent recorded. Campaign activates after payment confirmation.",
  });
}
