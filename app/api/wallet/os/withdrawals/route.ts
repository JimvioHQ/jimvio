import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { getWalletSecurityStatus, verifyWalletPin } from "@/lib/wallet-os/security";
import { logWalletActivity } from "@/lib/wallet-os/activity";
import { listPayoutMethods, requestWithdrawal } from "@/services/creator-economy/payouts";

export const dynamic = "force-dynamic";

const MIN_WITHDRAWAL = 1;

/**
 * GET /api/wallet/os/withdrawals — thin read wrapper around the `payouts`
 * table (same source of truth as `/api/creator/payouts`).
 */
export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data, error: fetchError } = await db
    .from("payouts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const withdrawals = (data ?? []).map((row: {
    id: string;
    amount: number | string;
    fee: number | string | null;
    net_amount: number | string | null;
    currency: string | null;
    status: string;
    payout_method: string | null;
    payout_account: string | null;
    provider_reference: string | null;
    notes: string | null;
    created_at: string;
    processed_at: string | null;
    release_date: string | null;
  }) => ({
    id: row.id,
    amount: Number(row.amount ?? 0),
    fee: Number(row.fee ?? 0),
    netAmount: Number(row.net_amount ?? row.amount ?? 0),
    currency: row.currency ?? "RWF",
    status: row.status,
    payoutMethod: row.payout_method ?? null,
    payoutAccount: row.payout_account ?? null,
    providerReference: row.provider_reference ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    processedAt: row.processed_at ?? null,
    releaseDate: row.release_date ?? null,
  }));

  return NextResponse.json({ withdrawals });
}

/**
 * POST /api/wallet/os/withdrawals — creates a withdrawal request.
 *
 * Wraps the existing `requestWithdrawal` service (used by
 * `/api/creator/payouts`) when the user has a saved payout method; otherwise
 * inserts into `payouts` directly (mirrors `/api/vendor/payout/request`).
 * Never mutates `/api/creator/payouts` behaviour.
 */
export async function POST(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let body: {
    amount?: number;
    methodId?: string;
    payoutMethod?: string;
    payoutAccount?: string;
    pin?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
    return NextResponse.json({ error: `Enter a valid amount (minimum ${MIN_WITHDRAWAL})` }, { status: 400 });
  }

  const wallet = await ensureWallet(user.id, db);
  if (Number(wallet.available_balance) < amount) {
    return NextResponse.json({ error: "Insufficient available balance" }, { status: 400 });
  }

  const security = await getWalletSecurityStatus(user.id, db);
  if (security.locked) {
    return NextResponse.json(
      { error: "Wallet is temporarily locked after too many failed PIN attempts", lockedUntil: security.lockedUntil },
      { status: 423 },
    );
  }

  let requireTwoFa = false;
  if (security.pinSet) {
    if (!body.pin) {
      return NextResponse.json({ error: "PIN is required for withdrawals", requirePin: true }, { status: 400 });
    }
    const verification = await verifyWalletPin(user.id, String(body.pin));
    if (!verification.valid) {
      return NextResponse.json(
        { error: "Incorrect PIN", attemptsRemaining: verification.attemptsRemaining, locked: verification.locked },
        { status: 401 },
      );
    }
  } else if (security.requireTwoFactorWithdraw) {
    // No PIN configured yet but 2FA is required by default — flag it so the UI can prompt setup.
    requireTwoFa = true;
  }

  try {
    let payout: unknown;
    const methods = await listPayoutMethods(user.id);
    const method = body.methodId
      ? methods.find((item: { id: string }) => item.id === body.methodId)
      : methods.find((item: { is_default: boolean }) => item.is_default);

    if (method) {
      payout = await requestWithdrawal({ userId: user.id, amount, methodId: method.id });
    } else {
      const payoutMethod = String(body.payoutMethod ?? "").trim();
      const payoutAccount = String(body.payoutAccount ?? "").trim();
      if (!payoutMethod || !payoutAccount) {
        return NextResponse.json(
          { error: "Save a payout method first, or provide payoutMethod and payoutAccount" },
          { status: 400 },
        );
      }

      const { data: inserted, error: insertError } = await db
        .from("payouts")
        .insert({
          user_id: user.id,
          type: "wallet_withdrawal",
          amount,
          fee: 0,
          net_amount: amount,
          currency: wallet.currency ?? "USD",
          status: "pending",
          payout_method: payoutMethod,
          payout_account: payoutAccount,
          notes: "Wallet OS withdrawal request",
        })
        .select()
        .single();
      if (insertError) throw insertError;

      const { error: updateError } = await db
        .from("wallets")
        .update({
          available_balance: Number(wallet.available_balance) - amount,
          pending_balance: Number(wallet.pending_balance ?? 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      if (updateError) {
        await db.from("payouts").delete().eq("id", inserted.id);
        throw updateError;
      }

      payout = inserted;
    }

    await logWalletActivity({
      userId: user.id,
      action: "withdrawal_requested",
      surface: "withdrawals",
      amount,
      currency: wallet.currency ?? "USD",
      metadata: { payout },
      db,
    });

    return NextResponse.json({ payout, requireTwoFa });
  } catch (err) {
    console.error("POST /api/wallet/os/withdrawals failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create withdrawal" },
      { status: 400 },
    );
  }
}
