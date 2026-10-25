import { approvalUsable, parametersMatch } from "./policy";
import type { Approval, FollowupPlan, FollowupTrigger } from "./types";

export type FollowupRequest = {
  userId: string;
  trigger: FollowupTrigger;
  classification: "marketing" | "security";
  marketingConsent: boolean;
  unsubscribed: boolean;
  reengagementAllowed: boolean;
  audienceCount: number;
  approved: boolean;
  now: Date;
};

export function planFollowup(input: FollowupRequest): FollowupPlan {
  const base = {
    id: `followup-${input.trigger}-${input.userId}`,
    userId: input.userId,
    trigger: input.trigger,
    classification: input.classification,
    audienceCount: input.audienceCount,
    marketingConsent: input.marketingConsent === true,
    unsubscribed: input.unsubscribed === true,
    reengagementAllowed: input.reengagementAllowed === true,
    sent: false,
    createdAt: input.now.toISOString(),
  };

  if (input.classification === "security") {
    return {
      ...base,
      status: "not_handled_here",
      reason: "Security and sign-in messages stay on the existing auth email path and are not mixed into marketing.",
    };
  }
  if (input.audienceCount !== 1) {
    return {
      ...base,
      status: "needs_approval",
      reason: "A new bulk audience is not sent. Approval alone does not send email.",
    };
  }
  if (input.unsubscribed || !input.marketingConsent) {
    return { ...base, status: "blocked", reason: "Marketing consent is missing or the person unsubscribed." };
  }
  if (input.trigger === "reactivation" && !input.reengagementAllowed) {
    return { ...base, status: "blocked", reason: "The reengagement preference is off." };
  }
  return {
    ...base,
    status: "planned_not_sent",
    reason: "One in-app reminder can be delivered only after a separate admin approval. No email is attached.",
  };
}

export function canDeliverInApp(plan: FollowupPlan, approval: Approval | null, now: Date): { ok: boolean; reason: string } {
  if (plan.classification !== "marketing") return { ok: false, reason: "Security messages are not delivered by this engine." };
  if (plan.audienceCount !== 1) return { ok: false, reason: "Bulk delivery is disabled." };
  if (!plan.marketingConsent || plan.unsubscribed) return { ok: false, reason: "Marketing consent is missing or the person unsubscribed." };
  if (plan.trigger === "reactivation" && !plan.reengagementAllowed) {
    return { ok: false, reason: "The reengagement preference is off." };
  }
  if (plan.status !== "planned_not_sent") return { ok: false, reason: "Only an unsent consented plan can be delivered." };
  if (plan.sent) return { ok: false, reason: "This plan was already delivered." };
  if (!approval || !approvalUsable(approval, now) || approval.riskClass !== "followup_delivery" || approval.subjectId !== plan.id) {
    return { ok: false, reason: "Delivery needs an unexpired one-time follow-up approval." };
  }
  if (!parametersMatch(approval, {
    userId: plan.userId,
    trigger: plan.trigger,
    classification: "marketing",
    audienceCount: 1,
    marketingConsent: true,
    unsubscribed: false,
    reengagementAllowed: plan.reengagementAllowed,
  })) {
    return { ok: false, reason: "The approval does not match this follow-up." };
  }
  return { ok: true, reason: "In-app delivery is allowed. Email is not included." };
}

export type StoredPreferenceConsent = {
  user_id?: string | null;
  email_reengagement?: boolean | null;
  email_reengagement_explicit_at?: string | null;
  email_enabled?: boolean | null;
  updated_at?: string | null;
} | null;

export type StoredConsentDecision = {
  marketingConsent: boolean;
  unsubscribed: boolean;
  reengagementAllowed: boolean;
  reason: "granted" | "missing" | "revoked" | "mismatch" | "unproven";
};

function denyStoredConsent(reason: Exclude<StoredConsentDecision["reason"], "granted">): StoredConsentDecision {
  return { marketingConsent: false, unsubscribed: true, reengagementAllowed: false, reason };
}

/**
 * Consent requires a stored row for this user, updated_at, an explicit
 * reengagement timestamp, email_reengagement strictly true, and email_enabled
 * not false. A missing row, a synthesized default, a database default of true,
 * a failed read (passed as null), or another user's row is not consent.
 * Revocation is an explicit false, or email_enabled false after an explicit stamp.
 */
export function consentFromStoredPreferences(row: StoredPreferenceConsent, expectedUserId?: string): StoredConsentDecision {
  if (!row || typeof row.updated_at !== "string" || row.updated_at.trim() === "") return denyStoredConsent("missing");
  if (expectedUserId && row.user_id !== expectedUserId) return denyStoredConsent("mismatch");
  if (typeof row.email_reengagement_explicit_at !== "string" || row.email_reengagement_explicit_at.trim() === "") {
    return denyStoredConsent("unproven");
  }
  if (row.email_reengagement !== true || row.email_enabled === false) return denyStoredConsent("revoked");
  return { marketingConsent: true, unsubscribed: false, reengagementAllowed: true, reason: "granted" };
}
