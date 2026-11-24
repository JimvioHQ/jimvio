import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-helpers";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

function serviceClient() {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  let body: { eventId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventId = body.eventId?.trim();
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const db = serviceClient();
  const { data: event, error: eventError } = await db
    .from("webhook_events")
    .select("id, provider, status, payload, attempt_count, dead_letter")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: "Could not load webhook event" }, { status: 500 });
  }
  if (!event || event.provider !== "cj") {
    return NextResponse.json({ error: "CJ webhook event not found" }, { status: 404 });
  }
  if (event.status === "processed") {
    return NextResponse.json({ ok: true, status: "processed", alreadyProcessed: true });
  }
  if (event.status !== "failed" && event.status !== "error") {
    return NextResponse.json({ error: "Only failed CJ webhook events can be replayed" }, { status: 409 });
  }
  if (event.dead_letter || Number(event.attempt_count ?? 0) >= 5) {
    return NextResponse.json({ error: "Webhook event reached its retry limit" }, { status: 409 });
  }

  const storedPayload = event.payload as { rawBody?: unknown } | null;
  const rawBody = typeof storedPayload?.rawBody === "string" ? storedPayload.rawBody : "";
  if (!rawBody) {
    return NextResponse.json({ error: "Stored event does not contain a replayable raw body" }, { status: 409 });
  }

  const { data: credentialRow, error: credentialError } = await db
    .from("platform_settings")
    .select("value")
    .eq("key", "cj_credentials")
    .maybeSingle();

  if (credentialError) {
    return NextResponse.json({ error: "CJ webhook credentials are unavailable" }, { status: 503 });
  }

  const credentials = (credentialRow?.value ?? {}) as { open_id?: unknown; openId?: unknown };
  const openId = credentials.open_id ?? credentials.openId;
  if (openId == null || String(openId).trim() === "") {
    return NextResponse.json({ error: "CJ webhook signature secret is not configured" }, { status: 503 });
  }

  const signature = createHmac("sha256", String(openId)).update(rawBody).digest("base64");
  const endpoint = new URL("/api/webhooks/cj", req.url);

  const replayResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      sign: signature,
    },
    body: rawBody,
    cache: "no-store",
  });

  if (!replayResponse.ok) {
    const responseBody = await replayResponse.text().catch(() => "");
    return NextResponse.json(
      { error: "CJ replay request was rejected", status: replayResponse.status, detail: responseBody.slice(0, 300) },
      { status: 502 },
    );
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const { data: latest, error: latestError } = await db
      .from("webhook_events")
      .select("status, processing_status, attempt_count, dead_letter, error")
      .eq("id", eventId)
      .maybeSingle();

    if (latestError) {
      return NextResponse.json({ error: "Could not verify replay result" }, { status: 500 });
    }
    if (latest?.status === "processed") {
      return NextResponse.json({
        ok: true,
        status: "processed",
        attemptCount: latest.attempt_count,
      });
    }
    if (latest?.status === "failed" || latest?.status === "dead_letter" || latest?.dead_letter) {
      return NextResponse.json(
        {
          ok: false,
          status: latest.status,
          error: latest.error ?? "CJ webhook processing failed",
          attemptCount: latest.attempt_count,
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    status: "processing",
    message: "Replay accepted; check the webhook event status again shortly.",
  }, { status: 202 });
}
