import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  diditWebhookSecret,
  fingerprintEvent,
  verifyDiditWebhook,
} from "@/lib/identity/didit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/webhooks/didit
 * Raw body → signature verify → idempotent status apply → 2xx fast.
 * Never trusts client callbacks alone for verification success.
 */
export async function POST(req: NextRequest) {
  const secret = diditWebhookSecret();
  if (!secret) {
    console.error("[didit webhook] DIDIT_WEBHOOK_SECRET missing");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const verified = verifyDiditWebhook({
    rawBody,
    parsed,
    signatureV2: req.headers.get("x-signature-v2") || req.headers.get("X-Signature-V2"),
    signature: req.headers.get("x-signature") || req.headers.get("X-Signature"),
    signatureSimple:
      req.headers.get("x-signature-simple") || req.headers.get("X-Signature-Simple"),
    timestamp: req.headers.get("x-timestamp") || req.headers.get("X-Timestamp"),
    secret,
  });

  if (!verified.ok) {
    console.warn("[didit webhook] rejected", { reason: verified.error });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const envelope = parsed as {
    event_id?: string;
    session_id?: string;
    business_session_id?: string;
    status?: string;
    webhook_type?: string;
    vendor_data?: string;
    session_kind?: string;
    metadata?: Record<string, unknown>;
    decision?: unknown;
  };

  const sessionId = String(envelope.session_id || envelope.business_session_id || "");
  const status = String(envelope.status || "");
  const webhookType = String(envelope.webhook_type || "");
  const sessionKind = String(envelope.session_kind || "").toLowerCase();
  const metaPurpose = String(envelope.metadata?.purpose || "").toLowerCase();
  const isBusinessSession =
    sessionKind === "business" ||
    metaPurpose === "business" ||
    Boolean(envelope.business_session_id && !envelope.session_id);
  const eventId =
    String(envelope.event_id || "").trim() ||
    fingerprintEvent([sessionId, status, webhookType, String(envelope.vendor_data || "")]);

  // Acknowledge quickly; apply idempotently
  const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const { error: insertEventError } = await admin.from("jip_didit_webhook_events").insert({
    event_id: eventId,
    session_id: sessionId || null,
    webhook_type: webhookType || null,
    status: status || null,
  });

  if (insertEventError) {
    // Unique violation → already processed
    if (String(insertEventError.code) === "23505" || /duplicate|unique/i.test(insertEventError.message)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[didit webhook] event log failed", { code: insertEventError.code });
  }

  if (!sessionId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Resolve user: vendor_data (preferred) or existing session row
  let userId = String(envelope.vendor_data || "").trim() || null;
  if (!userId) {
    const { data: existing } = await admin
      .from("jip_didit_sessions")
      .select("user_id")
      .eq("session_id", sessionId)
      .maybeSingle();
    userId = (existing as { user_id?: string } | null)?.user_id ?? null;
  }

  if (!userId) {
    console.warn("[didit webhook] unknown session", { hasSession: Boolean(sessionId) });
    return NextResponse.json({ ok: true, unmatched: true });
  }

  // Minimal decision summary — never store full document payloads
  const decisionSummary =
    envelope.decision && typeof envelope.decision === "object"
      ? { received: true, at: new Date().toISOString() }
      : {};

  await admin.from("jip_didit_sessions").upsert(
    {
      user_id: userId,
      session_id: sessionId,
      status: status || "In Progress",
      vendor_data: userId,
      last_event_id: eventId,
      decision_summary: decisionSummary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );

  if (status === "Approved") {
    if (isBusinessSession) {
      // Business verification (KYB) → unlock physical product selling
      await admin
        .from("vendors")
        .update({
          verification_status: "verified",
          verified_at: new Date().toISOString(),
          verification_notes: "Didit business verification approved",
        })
        .eq("user_id", userId);
    } else {
      await admin
        .from("jip_identity")
        .update({
          identity_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      await admin
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", userId);
    }
  } else if (status === "Declined" && isBusinessSession) {
    await admin
      .from("vendors")
      .update({
        verification_status: "rejected",
        verification_notes: "Didit business verification declined",
      })
      .eq("user_id", userId)
      .neq("verification_status", "verified");
  } else if (status === "Declined") {
    // Do not flip personal verified on
    await admin
      .from("jip_identity")
      .update({ updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  return NextResponse.json({ ok: true });
}
