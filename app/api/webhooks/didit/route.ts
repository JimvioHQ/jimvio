import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  canTransitionDiditStatus,
  diditWebhookSecret,
  fingerprintEvent,
  normalizeDiditStatus,
  verifyDiditWebhook,
} from "@/lib/identity/didit";
import { applyDiditIdentityResult } from "@/lib/identity/apply-didit-result";

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
  const status = normalizeDiditStatus(envelope.status);
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

  const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const { error: insertEventError } = await admin.from("jip_didit_webhook_events").insert({
    event_id: eventId,
    session_id: sessionId || null,
    webhook_type: webhookType || null,
    status: status || null,
  });

  if (insertEventError) {
    if (
      String(insertEventError.code) === "23505" ||
      /duplicate|unique/i.test(insertEventError.message)
    ) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[didit webhook] event log failed", { code: insertEventError.code });
  }

  if (!sessionId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let userId = String(envelope.vendor_data || "").trim() || null;
  let existingPurpose: string | null = null;
  let currentStatus: string | null = null;
  {
    const { data: existing } = await admin
      .from("jip_didit_sessions")
      .select("user_id, status, decision_summary")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (!userId) {
      userId = (existing as { user_id?: string } | null)?.user_id ?? null;
    }
    currentStatus = (existing as { status?: string } | null)?.status ?? null;
    const summary = (existing as { decision_summary?: { purpose?: string } } | null)
      ?.decision_summary;
    if (summary?.purpose) existingPurpose = String(summary.purpose);
  }

  const businessSession = isBusinessSession || existingPurpose === "business";

  if (!userId) {
    console.warn("[didit webhook] unknown session", { hasSession: Boolean(sessionId) });
    return NextResponse.json({ ok: true, unmatched: true });
  }

  if (!canTransitionDiditStatus(currentStatus, status)) {
    return NextResponse.json({ ok: true, skipped: true, reason: "stale_transition" });
  }

  if (businessSession) {
    await admin.from("jip_didit_sessions").upsert(
      {
        user_id: userId,
        session_id: sessionId,
        status: status || "In Progress",
        vendor_data: userId,
        last_event_id: eventId,
        decision_summary: {
          received: true,
          at: new Date().toISOString(),
          purpose: "business",
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" },
    );

    if (status === "Approved") {
      await admin
        .from("vendors")
        .update({
          verification_status: "verified",
          verified_at: new Date().toISOString(),
          verification_notes: "Didit business verification approved",
        })
        .eq("user_id", userId);
    } else if (
      status === "Declined" ||
      status === "Expired" ||
      status === "Abandoned" ||
      status === "KYC Expired"
    ) {
      await admin
        .from("vendors")
        .update({
          verification_status: status === "Declined" ? "rejected" : "pending",
          verification_notes:
            status === "Declined"
              ? "Didit business verification declined"
              : `Didit business verification ${status.toLowerCase()}`,
        })
        .eq("user_id", userId)
        .neq("verification_status", "verified");

      try {
        const { consumeVerificationFeeForVendor } = await import(
          "@/lib/identity/confirm-verification-fee"
        );
        const { data: vendor } = await admin
          .from("vendors")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (vendor?.id) {
          await consumeVerificationFeeForVendor(admin, vendor.id, sessionId);
        }
      } catch (feeErr) {
        console.error("[Didit webhook] fee consume failed", feeErr);
      }
    }
  } else {
    await applyDiditIdentityResult({
      admin,
      userId,
      sessionId,
      status,
      currentStatus,
      eventId,
      purpose: "identity",
    });
  }

  return NextResponse.json({ ok: true });
}
