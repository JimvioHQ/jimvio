import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  formatPawaPayAmount,
  getPawaPayConfig,
  normalizePawaPayMsisdn,
  pawaPayPostJsonWithServerLogs,
  type PawaPayDepositInitBody,
  type PawaPayDepositInitResponse,
} from "@/lib/pawapay";

export const dynamic = "force-dynamic";

/**
 * PawaPay Merchant API **v2** (`POST /v2/deposits`) expects:
 * - `depositId`: UUID (unique per attempt — we use crypto.randomUUID())
 * - `amount`: string
 * - `currency`: e.g. "RWF"
 * - `payer.type`: **"MMO"** (mobile money), not "MSISDN"
 * - `payer.accountDetails.phoneNumber`: MSISDN digits
 * - `payer.accountDetails.provider`: MMO code, e.g. **"MTN_MOMO_RWA"** (not the informal "MTN_RWA")
 *
 * Docs: https://docs.pawapay.io/v2/api-reference/deposits/initiate-deposit
 *
 * Example valid body:
 * {
 *   "depositId": "550e8400-e29b-41d4-a716-446655440000",
 *   "amount": "100",
 *   "currency": "RWF",
 *   "payer": { "type": "MMO", "accountDetails": { "phoneNumber": "250788123456", "provider": "MTN_MOMO_RWA" } },
 *   "customerMessage": "Test"
 * }
 */
const DEFAULT_RW_MTN_PROVIDER = "MTN_MOMO_RWA";

/**
 * POST JSON: { "phone": "2507XXXXXXXX", "amount": 100 }
 * See /pawapay-sandbox UI and docs/pawapay-sandbox-ngrok.md
 */
export async function POST(req: Request) {
  try {
    getPawaPayConfig();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PawaPay not configured" },
      { status: 500 }
    );
  }

  let body: { phone?: string; amount?: number | string };
  try {
    body = (await req.json()) as { phone?: string; amount?: number | string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const amountNum = typeof body.amount === "string" ? parseFloat(body.amount) : Number(body.amount);

  if (!phone) {
    return NextResponse.json({ error: "Missing phone" }, { status: 400 });
  }
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const depositId = randomUUID();
  const msisdn = normalizePawaPayMsisdn(phone, "250");
  if (msisdn.length < 10) {
    return NextResponse.json(
      { error: "Enter a valid Rwanda mobile number (e.g. 2507XXXXXXXX or 07XXXXXXXX)" },
      { status: 400 }
    );
  }

  const provider = process.env.PAWAPAY_DEFAULT_PROVIDER?.trim() || DEFAULT_RW_MTN_PROVIDER;

  const payload: PawaPayDepositInitBody = {
    depositId,
    amount: formatPawaPayAmount(amountNum),
    currency: "RWF",
    payer: {
      type: "MMO",
      accountDetails: {
        phoneNumber: msisdn,
        provider,
      },
    },
    customerMessage: "Jimvio sandbox demo",
  };

  try {
    const { data: init, baseUrl, isSandbox, status: httpStatus, rawText } = await pawaPayPostJsonWithServerLogs<
      PawaPayDepositInitResponse
    >("/v2/deposits", payload, "api/deposit");

    return NextResponse.json({
      ok: true,
      depositId: init.depositId ?? depositId,
      status: init.status,
      failureReason: init.failureReason ?? null,
      httpStatus,
      debug: {
        baseUrlUsed: baseUrl,
        isSandbox,
        /** If false, deposits will not appear under the sandbox dashboard */
        sandboxDashboardExpected: isSandbox,
      },
      request: {
        currency: payload.currency,
        provider,
        phoneNumber: msisdn,
        amount: payload.amount,
        depositId: payload.depositId,
        payerType: payload.payer.type,
      },
      raw: init,
      /** Truncated; full body is in server logs */
      rawResponseText: rawText.length > 2000 ? `${rawText.slice(0, 2000)}…` : rawText,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Deposit failed";
    console.error("[api/deposit] failed:", message);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint:
          "Check server terminal for full logs. Use sandbox URL https://api.sandbox.pawapay.io + sandbox token; view deposits at https://dashboard.sandbox.pawapay.io (Deposits).",
      },
      { status: 502 }
    );
  }
}
