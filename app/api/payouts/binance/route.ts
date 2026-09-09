import { NextResponse } from "next/server";

/**
 * SECURITY: Direct user→Binance USDT transfer before wallet debit is unsafe
 * (transfer-before-debit + missing decrement_wallet_balance RPC in production).
 * Payouts must go through Wallet OS withdrawals + admin approval.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This payout endpoint is disabled. Use Wallet withdrawals; admins process payouts.",
      code: "PAYOUT_ROUTE_DISABLED",
    },
    { status: 410 },
  );
}
