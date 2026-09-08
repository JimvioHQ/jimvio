/**
 * Didit identity verification — server-only helpers.
 * Docs: https://docs.didit.me/integration/api-full-flow
 *        https://docs.didit.me/integration/webhooks
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const DIDIT_SESSION_API = "https://verification.didit.me/v3/session/";

export type DiditSessionStatus =
  | "Approved"
  | "Declined"
  | "In Review"
  | "In Progress"
  | "Not Started"
  | "Abandoned"
  | "Expired"
  | "KYC Expired"
  | "Resubmitted"
  | string;

export function diditConfigured(): boolean {
  return Boolean(
    process.env.DIDIT_API_KEY?.trim() &&
      process.env.DIDIT_WORKFLOW_ID?.trim(),
  );
}

export function diditWebhookSecret(): string | null {
  return process.env.DIDIT_WEBHOOK_SECRET?.trim() || null;
}

/** Customer-facing status from Didit session status. */
export function mapDiditStatusToCustomer(status: string | null | undefined): {
  key: "not_started" | "in_progress" | "in_review" | "verified" | "failed" | "expired";
  label: string;
} {
  const s = String(status ?? "").trim();
  switch (s) {
    case "Approved":
      return { key: "verified", label: "Identity verified" };
    case "Declined":
      return { key: "failed", label: "Verification could not be completed" };
    case "In Review":
      return { key: "in_review", label: "Verification under review" };
    case "In Progress":
    case "Resubmitted":
    case "Not Started":
      return { key: "in_progress", label: "Verification in progress" };
    case "Expired":
    case "KYC Expired":
    case "Abandoned":
      return { key: "expired", label: "Verification expired" };
    default:
      return { key: "not_started", label: "Verify your identity" };
  }
}

function shortenFloats(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shortenFloats);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = shortenFloats(v);
    }
    return out;
  }
  if (typeof value === "number" && !Number.isInteger(value)) {
    // Match Didit’s shortened float canonicalization for V2
    return Number(Number(value).toPrecision(15));
  }
  return value;
}

/** Canonical JSON for X-Signature-V2 (sorted keys, compact, Unicode preserved). */
export function diditCanonicalJson(payload: unknown): string {
  return JSON.stringify(shortenFloats(payload), Object.keys(payload as object).sort?.() ? undefined : undefined);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function diditCanonicalJsonV2(payload: unknown): string {
  return stableStringify(shortenFloats(payload));
}

function hexHmac(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Verify Didit webhook authenticity.
 * Prefer X-Signature-V2 → raw X-Signature → X-Signature-Simple.
 */
export function verifyDiditWebhook(input: {
  rawBody: string;
  parsed: unknown;
  signatureV2?: string | null;
  signature?: string | null;
  signatureSimple?: string | null;
  timestamp?: string | null;
  secret: string;
  nowSec?: number;
}): { ok: true } | { ok: false; error: string } {
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) {
    return { ok: false, error: "Stale or missing timestamp" };
  }

  if (input.signatureV2) {
    const expected = hexHmac(input.secret, diditCanonicalJsonV2(input.parsed));
    if (safeEqualHex(expected, input.signatureV2.toLowerCase()) || safeEqualHex(expected, input.signatureV2)) {
      return { ok: true };
    }
  }

  if (input.signature) {
    const expected = hexHmac(input.secret, input.rawBody);
    if (safeEqualHex(expected, input.signature.toLowerCase()) || safeEqualHex(expected, input.signature)) {
      return { ok: true };
    }
  }

  if (input.signatureSimple && input.parsed && typeof input.parsed === "object") {
    const p = input.parsed as Record<string, unknown>;
    const sessionId = String(p.session_id ?? p.business_session_id ?? "");
    const status = String(p.status ?? "");
    const webhookType = String(p.webhook_type ?? "");
    const msg = `${ts}:${sessionId}:${status}:${webhookType}`;
    const expected = hexHmac(input.secret, msg);
    if (
      safeEqualHex(expected, input.signatureSimple.toLowerCase()) ||
      safeEqualHex(expected, input.signatureSimple)
    ) {
      return { ok: true };
    }
  }

  return { ok: false, error: "Invalid signature" };
}

export async function createDiditSession(input: {
  userId: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}): Promise<
  | { ok: true; sessionId: string; verificationUrl: string; status: string }
  | { ok: false; error: string }
> {
  const apiKey = process.env.DIDIT_API_KEY?.trim();
  const workflowId = process.env.DIDIT_WORKFLOW_ID?.trim();
  if (!apiKey || !workflowId) {
    return { ok: false, error: "Identity verification is not configured yet" };
  }

  const res = await fetch(DIDIT_SESSION_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: input.userId,
      callback: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
  });

  const body = (await res.json().catch(() => null)) as {
    session_id?: string;
    verification_url?: string;
    url?: string;
    status?: string;
    detail?: string;
    message?: string;
  } | null;

  if (!res.ok || !body?.session_id) {
    console.error("[didit] session create failed", {
      status: res.status,
      // Never log API key or full PII
      hasSession: Boolean(body?.session_id),
    });
    return {
      ok: false,
      error: "Could not start verification. Please try again later.",
    };
  }

  const verificationUrl = body.verification_url || body.url;
  if (!verificationUrl) {
    return { ok: false, error: "Verification provider returned an incomplete session" };
  }

  return {
    ok: true,
    sessionId: body.session_id,
    verificationUrl,
    status: body.status || "Not Started",
  };
}

export function fingerprintEvent(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}
