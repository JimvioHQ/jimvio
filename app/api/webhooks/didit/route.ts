import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  canTransitionDiditStatus,
  diditWebhookSecret,
  fingerprintEvent,
  normalizeDiditStatus,
  vendorStatusPatchFromDiditBusinessWebhook,
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

    const vendorStatusPatch = vendorStatusPatchFromDiditBusinessWebhook(status);
    if (vendorStatusPatch) {
      await admin.from("vendors").update(vendorStatusPatch).eq("user_id", userId);
    } else if (status === "Approved") {
      await admin
        .from("vendors")
        .update({
          physical_selling_requested_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .is("physical_selling_requested_at", null);
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

  if (status === "Approved" || status === "Declined") {
    const { notifyUser } = await import("@/lib/notifications/notify-user");
    await notifyUser(admin, {
      userId,
      type: "system",
      title: status === "Approved" ? "Verification approved" : "Verification update",
      message:
        status === "Approved"
          ? "Your verification was approved."
          : "Your verification was not approved.",
      actionUrl: "/identity/verification",
      eventKey: `verification.${businessSession ? "business" : "personal"}.${status}:${sessionId}`,
      email: {
        kind: "verification_decision",
        decision: status === "Approved" ? "approved" : "rejected",
        scope: businessSession ? "business" : "personal",
        idempotencyKey: `verification.${businessSession ? "business" : "personal"}.${status}:${sessionId}`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
