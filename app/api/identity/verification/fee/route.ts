import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DISABLED = {
  error: "Business verification does not require a payment. Contact Support for review.",
  code: "verification_payment_disabled",
  paymentRequired: false,
};

/** Verification fees are retired. This route must not start a charge. */
export async function GET() {
  return NextResponse.json(DISABLED, { status: 410 });
}

export async function POST() {
  return NextResponse.json(DISABLED, { status: 410 });
}
