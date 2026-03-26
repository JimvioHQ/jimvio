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

const DEFAULT_TEST_AMOUNT = 100;
const DEFAULT_PROVIDER = "MTN_MOMO_RWA";

/**
 * GET — environment check (no API call).
 * POST — sends one fixed sandbox deposit with a **new** depositId each time (isolates token / URL issues).
 */
export async function GET() {
  try {
    const cfg = getPawaPayConfig();
    return NextResponse.json({
      ok: true,
      baseUrl: cfg.baseUrl,
      isSandbox: cfg.isSandbox,
      hasToken: Boolean(process.env.PAWAPAY_API_TOKEN?.trim()),
      message:
        "POST to this URL to send a test deposit. Set PAWAPAY_TEST_PHONE (e.g. 2507XXXXXXXX) in .env.local for the MSISDN.",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "PawaPay not configured" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    getPawaPayConfig();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "PawaPay not configured" },
      { status: 500 }
    );
  }

  const rawPhone = process.env.PAWAPAY_TEST_PHONE?.trim() || "250788000000";
  const phone = normalizePawaPayMsisdn(rawPhone, "250");
  if (phone.length < 10) {
    return NextResponse.json(
      { ok: false, error: "Set PAWAPAY_TEST_PHONE to a valid Rwanda MSISDN (e.g. 2507XXXXXXXX)" },
      { status: 400 }
    );
  }

  const depositId = randomUUID();
  const amountStr = formatPawaPayAmount(DEFAULT_TEST_AMOUNT);

  const payload: PawaPayDepositInitBody = {
    depositId,
    amount: amountStr,
    currency: "RWF",
    payer: {
      type: "MMO",
      accountDetails: {
        phoneNumber: phone,
        provider: process.env.PAWAPAY_DEFAULT_PROVIDER?.trim() || DEFAULT_PROVIDER,
      },
    },
    customerMessage: "Jimvio test-pawapay",
  };

  try {
    const { data: init, baseUrl, isSandbox, status: httpStatus, rawText } = await pawaPayPostJsonWithServerLogs<
      PawaPayDepositInitResponse
    >("/v2/deposits", payload, "api/test-pawapay");

    return NextResponse.json({
      ok: true,
      depositId: init.depositId ?? depositId,
      status: init.status,
      httpStatus,
      baseUrl,
      isSandbox,
      payloadSent: payload,
      raw: init,
      rawResponseText: rawText.length > 2000 ? `${rawText.slice(0, 2000)}…` : rawText,
      note: "Check terminal logs and sandbox dashboard → Deposits. Use a real sandbox test MSISDN via PAWAPAY_TEST_PHONE if this fails.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Test deposit failed";
    return NextResponse.json({ ok: false, error: message, payloadAttempted: payload }, { status: 502 });
  }
}
