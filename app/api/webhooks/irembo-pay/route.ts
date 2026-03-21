import { NextRequest, NextResponse } from "next/server";
import { processIremboWebhookRequest } from "@/lib/irembo-webhook-handler";

/**
 * Legacy/alternate webhook path — identical behavior to `POST /api/payments/webhook`.
 * Prefer configuring Irembo with `/api/payments/webhook` only to avoid duplicate URLs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-irembopay-signature") || "";

    const result = await processIremboWebhookRequest(body, signature);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Irembo webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
