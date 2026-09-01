import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ops/rate-limit";
import { getQuantForgWebhookSecret, getQuantForgWebhookSecretMetadata } from "@/lib/integrations/quantforg/constants";
import { publishQuantForgEvent } from "@/lib/integrations/quantforg/publish-event";
import { quantForgWebhookPayloadSchema } from "@/lib/integrations/quantforg/types";
import { verifyQuantForgWebhookAuth } from "@/lib/integrations/quantforg/verify-signature";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/quantforg
 *
 * One-way QuantForg → Jimvio integration. Publishes trading events into the
 * QuantForg Signals Space using the existing community_messages pipeline.
 */
export async function POST(req: NextRequest) {
  const secret = getQuantForgWebhookSecret();
  if (!secret) {
    console.error("[webhook/quantforg] QUANTFORG_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Integration not configured" }, { status: 503 });
  }

  const limited = rateLimit("webhook:quantforg", 120, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const auth = verifyQuantForgWebhookAuth(secret, rawBody, req.headers);
  if (!auth.ok) {
    console.warn("[webhook/quantforg] Auth failed:", auth.reason);
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  const parsed = quantForgWebhookPayloadSchema.safeParse(json);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: "Invalid payload", detail }, { status: 400 });
  }

  try {
    const result = await publishQuantForgEvent(parsed.data);
    if (!result.ok) {
      console.error("[webhook/quantforg] Publish failed:", result.error);
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      {
        ok: true,
        duplicate: result.duplicate,
        message_id: result.messageId,
        event_id: parsed.data.event_id,
        event_type: parsed.data.event_type,
      },
      { status: result.duplicate ? 200 : 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[webhook/quantforg] Unexpected error:", msg);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** Lightweight readiness probe — never exposes secrets. */
export async function GET() {
  const meta = getQuantForgWebhookSecretMetadata();
  return NextResponse.json(
    {
      ok: meta.configured,
      service: "quantforg_webhook",
      endpoint: "/api/webhooks/quantforg",
      secret: meta.configured
        ? { length: meta.length, fingerprint: meta.fingerprint }
        : null,
      hint: meta.configured
        ? "POST signed events with X-QuantForg-Signature or Bearer token"
        : "Set QUANTFORG_WEBHOOK_SECRET in production env",
    },
    { status: meta.configured ? 200 : 503 }
  );
}
