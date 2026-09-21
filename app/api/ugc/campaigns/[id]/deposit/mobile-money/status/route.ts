import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";
import {
  verifyFlutterwaveTransaction,
  FlutterwaveAPIError,
} from "@/lib/payments/Transaction-verify";
import { isFlutterwaveSuccessfulStatus } from "@/lib/flutterwave";
import { confirmUgcEscrowPayment } from "@/lib/ugc/confirm-escrow-payment";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/ugc/campaigns/[id]/deposit/mobile-money/status?txRef=
 * Polling fallback for UGC MoMo funding. Webhook/callback remain authoritative.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: campaignId } = await params;
  const txRef = req.nextUrl.searchParams.get("txRef");
  if (!txRef) {
    return NextResponse.json({ error: "txRef is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireCampaignPermission(user.id, campaignId, "finance.payout");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const db = createServiceRoleClient();

  const { data: escrow } = await db
    .from("ugc_campaign_escrow")
    .select("id, status, amount, currency, payment_ref, payment_method")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (escrow?.status === "held" || escrow?.status === "funded" || escrow?.status === "released") {
    return NextResponse.json({
      status: "successful",
      paymentStatus: escrow.status,
      campaignId,
      txRef,
      amount: Number(escrow.amount),
      currency: escrow.currency ?? PLATFORM_CURRENCY,
    });
  }

  if (escrow?.status === "failed" || escrow?.status === "cancelled") {
    return NextResponse.json({
      status: "failed",
      paymentStatus: escrow.status,
      message: "The payment failed.",
      campaignId,
      txRef,
    });
  }

  const { data: tx } = await db
    .from("transactions")
    .select("id, status, amount, currency, amount_usd, metadata")
    .eq("provider_transaction_id", txRef)
    .eq("provider", "flutterwave")
    .eq("type", "ugc_escrow")
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const meta =
    tx.metadata && typeof tx.metadata === "object" && !Array.isArray(tx.metadata)
      ? (tx.metadata as Record<string, unknown>)
      : {};

  if (meta.method && meta.method !== "mobile_money") {
    return NextResponse.json({ error: "Not a Mobile Money funding payment" }, { status: 400 });
  }

  if (tx.status === "failed") {
    return NextResponse.json({
      status: "failed",
      paymentStatus: "failed",
      message: "The payment failed.",
      campaignId,
      txRef,
    });
  }

  const flwId =
    typeof meta.flw_transaction_id === "number" || typeof meta.flw_transaction_id === "string"
      ? String(meta.flw_transaction_id)
      : null;

  try {
    const verified = await verifyFlutterwaveTransaction(flwId || txRef);
    const data = verified.data;
    const flwStatus = String(verified.status || data?.status || "").toLowerCase();

    if (isFlutterwaveSuccessfulStatus(flwStatus)) {
      const expectedLocal = Number(tx.amount);
      const expectedLocalCurrency = String(tx.currency).toUpperCase();
      const paidLocal = Number(data.amount);
      const paidCurrency = String(data.currency ?? "").toUpperCase();
      const localOk =
        Number.isFinite(paidLocal) &&
        Math.abs(paidLocal - expectedLocal) < 0.01 &&
        paidCurrency === expectedLocalCurrency;

      if (!localOk) {
        console.error("[ugc-momo/status] local amount mismatch", {
          campaignId,
          txRef,
          expectedLocal,
          expectedLocalCurrency,
          paidLocal,
          paidCurrency,
        });
        return NextResponse.json({
          status: "pending",
          paymentStatus: escrow?.status ?? "pending",
          message: "Your payment is awaiting confirmation.",
          campaignId,
          txRef,
        });
      }

      const usdAmount =
        tx.amount_usd != null && Number.isFinite(Number(tx.amount_usd))
          ? Number(tx.amount_usd)
          : Number(escrow?.amount ?? 0);

      const result = await confirmUgcEscrowPayment(db, {
        paymentRef: txRef,
        providerTransactionId: txRef,
        campaignId,
        amount: usdAmount,
        currency: PLATFORM_CURRENCY,
        provider: "flutterwave",
      });

      if (result.handled && (result.activated || result.alreadyHeld)) {
        return NextResponse.json({
          status: "successful",
          paymentStatus: "held",
          campaignId,
          txRef,
          amount: usdAmount,
          currency: PLATFORM_CURRENCY,
          activated: result.activated,
        });
      }

      return NextResponse.json({
        status: "pending",
        paymentStatus: escrow?.status ?? "pending",
        message: "Waiting for Mobile Money confirmation…",
        campaignId,
        txRef,
      });
    }

    if (flwStatus === "failed" || flwStatus === "cancelled") {
      const now = new Date().toISOString();
      await db
        .from("transactions")
        .update({ status: "failed", updated_at: now })
        .eq("id", tx.id)
        .eq("status", "pending");
      return NextResponse.json({
        status: "failed",
        paymentStatus: "failed",
        message:
          flwStatus === "cancelled"
            ? "The payment was cancelled."
            : "The payment failed.",
        campaignId,
        txRef,
      });
    }

    return NextResponse.json({
      status: "pending",
      paymentStatus: escrow?.status ?? "pending",
      message: "Waiting for Mobile Money confirmation…",
      campaignId,
      txRef,
      amount: Number(escrow?.amount ?? 0),
      currency: escrow?.currency ?? PLATFORM_CURRENCY,
    });
  } catch (err) {
    if (err instanceof FlutterwaveAPIError && err.isNotFound) {
      return NextResponse.json({
        status: "pending",
        paymentStatus: escrow?.status ?? "pending",
        message: "Waiting for Mobile Money confirmation…",
        campaignId,
        txRef,
      });
    }
    console.warn("[ugc-momo/status] verify failed", {
      campaignId,
      txRef,
      message: err instanceof Error ? err.message.slice(0, 160) : String(err),
    });
    return NextResponse.json({
      status: "pending",
      paymentStatus: escrow?.status ?? "pending",
      message: "Waiting for Mobile Money confirmation…",
      campaignId,
      txRef,
    });
  }
}
