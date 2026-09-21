import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  verifyFlutterwaveTransaction,
  FlutterwaveAPIError,
} from "@/lib/payments/Transaction-verify";
import { isFlutterwaveSuccessfulStatus } from "@/lib/flutterwave";
import { completeWalletDeposit } from "@/lib/wallet-os/complete-deposit";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/wallet/os/deposits/mobile-money/status?depositId=&txRef=
 * Polling fallback for wallet MoMo deposits. Webhook remains authoritative.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const depositId = req.nextUrl.searchParams.get("depositId");
  const txRef = req.nextUrl.searchParams.get("txRef");
  if (!depositId || !txRef) {
    return NextResponse.json({ error: "depositId and txRef are required" }, { status: 400 });
  }

  const db = createServiceRoleClient();

  const { data: deposit } = await db
    .from("wallet_deposits")
    .select("id, user_id, amount, currency, status, reference, method")
    .eq("id", depositId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!deposit) {
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }

  if (deposit.status === "completed") {
    return NextResponse.json({
      status: "successful",
      paymentStatus: "completed",
      depositId,
      txRef,
      amount: Number(deposit.amount),
      currency: deposit.currency ?? PLATFORM_CURRENCY,
    });
  }

  if (deposit.status === "failed" || deposit.status === "cancelled") {
    return NextResponse.json({
      status: "failed",
      paymentStatus: deposit.status,
      message: "The payment failed.",
      depositId,
      txRef,
    });
  }

  const { data: tx } = await db
    .from("transactions")
    .select("id, status, amount, currency, amount_usd, metadata")
    .eq("provider_transaction_id", txRef)
    .eq("provider", "flutterwave")
    .eq("type", "wallet_deposit")
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const meta =
    tx.metadata && typeof tx.metadata === "object" && !Array.isArray(tx.metadata)
      ? (tx.metadata as Record<string, unknown>)
      : {};

  if (meta.method && meta.method !== "mobile_money") {
    return NextResponse.json({ error: "Not a Mobile Money deposit" }, { status: 400 });
  }

  if (tx.status === "failed") {
    return NextResponse.json({
      status: "failed",
      paymentStatus: "failed",
      message: "The payment failed.",
      depositId,
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
        console.error("[wallet-momo/status] local amount mismatch", {
          depositId,
          txRef,
          expectedLocal,
          expectedLocalCurrency,
          paidLocal,
          paidCurrency,
        });
        return NextResponse.json({
          status: "pending",
          paymentStatus: deposit.status,
          message: "Your payment is awaiting confirmation.",
          depositId,
          txRef,
        });
      }

      const usdAmount =
        tx.amount_usd != null && Number.isFinite(Number(tx.amount_usd))
          ? Number(tx.amount_usd)
          : Number(deposit.amount);

      const result = await completeWalletDeposit(db, {
        depositId,
        providerReference: txRef,
        provider: "flutterwave",
        verifiedAmount: usdAmount,
        verifiedCurrency: PLATFORM_CURRENCY,
      });

      return NextResponse.json({
        status: result.credited || deposit.status === "completed" ? "successful" : "pending",
        paymentStatus: result.credited ? "completed" : deposit.status,
        depositId,
        txRef,
        amount: usdAmount,
        currency: PLATFORM_CURRENCY,
      });
    }

    if (flwStatus === "failed" || flwStatus === "cancelled") {
      const now = new Date().toISOString();
      await db
        .from("transactions")
        .update({ status: "failed", updated_at: now })
        .eq("id", tx.id)
        .eq("status", "pending");
      await db
        .from("wallet_deposits")
        .update({ status: "failed", updated_at: now })
        .eq("id", depositId)
        .eq("status", "pending");
      return NextResponse.json({
        status: "failed",
        paymentStatus: "failed",
        message:
          flwStatus === "cancelled"
            ? "The payment was cancelled."
            : "The payment failed.",
        depositId,
        txRef,
      });
    }

    return NextResponse.json({
      status: "pending",
      paymentStatus: deposit.status,
      message: "Waiting for Mobile Money confirmation…",
      depositId,
      txRef,
      amount: Number(deposit.amount),
      currency: deposit.currency ?? PLATFORM_CURRENCY,
    });
  } catch (err) {
    if (err instanceof FlutterwaveAPIError && err.isNotFound) {
      return NextResponse.json({
        status: "pending",
        paymentStatus: deposit.status,
        message: "Waiting for Mobile Money confirmation…",
        depositId,
        txRef,
      });
    }
    console.warn("[wallet-momo/status] verify failed", {
      depositId,
      txRef,
      message: err instanceof Error ? err.message.slice(0, 160) : String(err),
    });
    return NextResponse.json({
      status: "pending",
      paymentStatus: deposit.status,
      message: "Waiting for Mobile Money confirmation…",
      depositId,
      txRef,
    });
  }
}
