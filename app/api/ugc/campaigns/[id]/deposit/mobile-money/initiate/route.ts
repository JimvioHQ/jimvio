import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";
import {
  assertCampaignReadyForFunding,
  campaignWizardErrorPayload,
} from "@/lib/ugc/campaign-wizard-validation";
import {
  getMoMoMarketByCountry,
  isMoMoNetworkSupported,
} from "@/lib/payments/flutterwave-mobile-money-capabilities";
import { createMobileMoneyPayment } from "@/lib/payments/flutterwave-mobile-money";
import { FlutterwaveError } from "@/lib/flutterwave";
import { generateTxRef } from "@/lib/payments/tx-ref";
import { buildPaymentSnapshot } from "@/lib/payments/order-payment-utils";
import { resolveTrustedRequestOrigin } from "@/lib/payments/customer-return-origin";
import { getSiteUrl } from "@/lib/site-url";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import {
  campaignFundingChargeUsd,
  checkMinCampaignFunding,
  MIN_CAMPAIGN_FUNDING_USD,
} from "@/lib/ugc/min-funding";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RequestSchema = z.object({
  amount: z.number().finite().min(MIN_CAMPAIGN_FUNDING_USD).max(1_000_000).optional(),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase()),
  network: z.string().trim().max(40).optional().nullable(),
  phone: z.string().trim().min(7).max(24),
});

/**
 * POST /api/ugc/campaigns/[id]/deposit/mobile-money/initiate
 * Global Mobile Money direct charge for UGC campaign funding.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: campaignId } = await params;
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      campaignId,
    );
  if (!isUUID) {
    return NextResponse.json({ error: "Invalid campaign ID format" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof RequestSchema>;
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid Mobile Money funding request.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const market = getMoMoMarketByCountry(body.country);
  if (!market) {
    return NextResponse.json(
      { error: "Mobile Money is not available in this country.", code: "UNSUPPORTED_COUNTRY" },
      { status: 400 },
    );
  }
  if (market.requiresNetwork) {
    if (!body.network || !isMoMoNetworkSupported(market, body.network)) {
      return NextResponse.json(
        {
          error: "This Mobile Money provider is currently unavailable.",
          code: "UNSUPPORTED_NETWORK",
        },
        { status: 400 },
      );
    }
  }

  const access = await requireCampaignPermission(user.id, campaignId, "finance.payout");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const db = access.db;

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const ready = assertCampaignReadyForFunding(campaign as Record<string, unknown>);
  if (!ready.success) {
    return NextResponse.json(campaignWizardErrorPayload(ready), { status: 400 });
  }

  const { data: heldEscrow } = await db
    .from("ugc_campaign_escrow")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("status", "held")
    .maybeSingle();
  if (heldEscrow) {
    return NextResponse.json({
      success: true,
      already_funded: true,
      message: "Campaign already funded.",
    });
  }

  const budget = Number(campaign.total_budget) || 0;
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
  // The full budget is always collected: a campaign goes live only when it is fully funded.
  const amountUsd = Math.max(
    campaignFundingChargeUsd(budget, "USD"),
    body.amount != null ? Math.round(body.amount * 100) / 100 : 0,
  );

  const { data: profile } = await db
    .from("profiles")
    .select("email, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();
  const email = profile?.email || user.email;
  if (!email) {
    return NextResponse.json(
      { error: "Add an email to your account before funding.", code: "BUYER_EMAIL_MISSING" },
      { status: 400 },
    );
  }

  const txRef = generateTxRef("UGCMM");
  const origin = resolveTrustedRequestOrigin(req) || getSiteUrl().replace(/\/$/, "");
  const redirectUrl = `${origin}/api/payments/flutterwave/callback?campaign=${campaignId}`;

  const { data: pendingEscrow } = await db
    .from("ugc_campaign_escrow")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingEscrow?.id) {
    await db
      .from("ugc_campaign_escrow")
      .update({
        amount: amountUsd,
        currency: "USD",
        payment_method: "mobile_money",
        payment_ref: txRef,
      })
      .eq("id", pendingEscrow.id);
  } else {
    await db.from("ugc_campaign_escrow").insert({
      campaign_id: campaignId,
      deposited_by: user.id,
      amount: amountUsd,
      currency: "USD",
      status: "pending",
      payment_method: "mobile_money",
      payment_ref: txRef,
      locked_amount: 0,
    });
  }

  let charge;
  try {
    charge = await createMobileMoneyPayment({
      country: market.countryCode,
      network: body.network,
      phone: body.phone,
      amountUsd,
      orderId: campaignId,
      txRef,
      email,
      fullName: profile?.full_name || "Jimvio Brand",
      redirectUrl,
    });
  } catch (err) {
    const msg =
      err instanceof FlutterwaveError
        ? err.message
        : "We couldn't start the Mobile Money payment.";
    return NextResponse.json(
      { error: msg.slice(0, 200), code: "PAYMENT_INIT_FAILED" },
      {
        status:
          err instanceof FlutterwaveError && err.statusCode < 500
            ? err.statusCode
            : 502,
      },
    );
  }

  const paymentSnapshot = buildPaymentSnapshot({
    orderTotal: amountUsd,
    orderCurrency: PLATFORM_CURRENCY,
    paymentAmount: charge.amount,
    paymentCurrency: charge.currency,
    exchangeRate: charge.exchangeRate,
  });

  await db.from("transactions").insert({
    user_id: user.id,
    type: "ugc_escrow",
    direction: "debit",
    amount: charge.amount,
    currency: charge.currency,
    amount_usd: amountUsd,
    exchange_rate: charge.exchangeRate,
    status: charge.status === "failed" ? "failed" : "pending",
    provider: "flutterwave",
    provider_transaction_id: txRef,
    reference: campaignId,
    description: `UGC Mobile Money funding ${campaignId.slice(0, 8)}`,
    metadata: {
      purpose: "ugc_funding",
      campaign_id: campaignId,
      method: "mobile_money",
      country: charge.country,
      network: charge.network,
      charge_type: charge.chargeType,
      phone_masked: charge.phoneMasked,
      flw_transaction_id: charge.flwTransactionId,
      flw_ref: charge.flwRef,
      payment_snapshot: paymentSnapshot,
    },
  });

  console.info("[ugc-momo/initiate] created", {
    campaignId,
    txRef,
    country: charge.country,
    currency: charge.currency,
    amount: charge.amount,
    amountUsd,
    hasRedirect: Boolean(charge.redirectUrl),
  });

  return NextResponse.json({
    campaignId,
    txRef,
    status: charge.status,
    redirectUrl: charge.redirectUrl,
    checkout_url: charge.redirectUrl,
    amount: charge.amount,
    currency: charge.currency,
    amountUsd,
    country: charge.country,
    network: charge.network,
    phoneMasked: charge.phoneMasked,
    authorizationMode: charge.authorizationMode,
  });
}
