import { canDeliverInApp } from "./followups";
import { claimBounded, type EngineLockStore, type HeldLock, type WriteSuccess } from "./lock";
import { consumeApproval, findApproval, killSwitchEngaged } from "./policy";
import { appendAudit, createInitialState } from "./state";
import type { EngineState, FollowupPlan } from "./types";

/**
 * In-app follow-up delivery guarantees.
 *
 * Lease. The claim and the pre-notify hold are both DELIVERY_LEASE_MS (20s).
 * writeHeld uses extendLockUntil, so a shorter extend cannot move the lease
 * earlier. The lease is not a provider timeout. A hung publish can still
 * commit after the lease expires; the claim key is already stored.
 *
 * Provider. notifyUser / publishNotification dedupes only when eventKey is
 * set and the unique partial index uq_notifications_user_event_key exists.
 * The migration defines that index. This module does not contact a database
 * to prove the live index is present. A duplicate key returns
 * duplicate_event_key after the row is read back. A unique violation whose
 * row cannot be read returns duplicate_unconfirmed (ambiguous), not success.
 * groupKey is not idempotency: it updates a different row. This payload never
 * sets groupKey, email, or force. The analytics event "sent" is recorded
 * before the notification insert and is not proof of a row. notifyUser
 * swallows thrown errors, so a missing result is ambiguous.
 *
 * Attempts. At most PUBLISH_ATTEMPT_LIMIT (2) publish calls are recorded.
 * The delivery key and the attempt key are committed before notify. A crash
 * before that write has not called notify, so a later call may publish once.
 * A crash after the attempt key, a thrown notify, a timeout, or any result
 * other than a confirmed insert is ambiguous. The same call does not publish
 * again. A later call publishes only when a lookup returns "absent", consent
 * is current, attempts remain, and the stored result is not "refused" or
 * "stopped". An omitted or failed lookup is "unknown" and does not send.
 * "present" marks the plan sent and does not send a second message.
 *
 * Kill switch. If the switch is on after the claim key is stored, the result
 * is "stopped". Later calls do not notify, including when a lookup proves the
 * row is absent.
 *
 * Consent. A missing loader is not consent. A thrown read is not consent.
 * Consent is read again immediately before notify. Denial before the claim
 * key does not consume the approval. Denial after the key keeps the key and
 * can still publish later if consent becomes valid and the lookup proves
 * absence, within the attempt limit. Revocation is not a permanent refusal.
 */
export const DELIVERY_LEASE_MS = 20_000;
export const PUBLISH_ATTEMPT_LIMIT = 2;

const ALREADY_CLAIMED = "This follow-up was already claimed. It was not re-sent.";
const FAILURE_DETAIL = "In-app delivery did not succeed. No email was attempted. The delivery claim is kept so a retry cannot send a second message.";
const CONSENT_UNREADABLE = "Marketing consent could not be confirmed.";
const CONSENT_DENIED = "Marketing consent is missing or the person unsubscribed.";

export type DeliveryOutcome = "sent" | "reconciled" | "not_sent";
export type NotificationLookup = "present" | "absent" | "unknown";
export type PublishClass = "inserted" | "already_present" | "refused" | "not_inserted" | "ambiguous";
export type StoredPublishResult = "ambiguous" | "not_inserted" | "refused" | "stopped";

export type DeliveryResult = {
  ok: boolean;
  status: number;
  notified: boolean;
  outcome: DeliveryOutcome;
  error?: string;
  state: EngineState | null;
};

type ConsentFlags = {
  marketingConsent: boolean;
  unsubscribed: boolean;
  reengagementAllowed: boolean;
  reason?: "granted" | "missing" | "revoked" | "mismatch" | "unproven";
};

type ConsentRead =
  | { kind: "granted"; consent: ConsentFlags }
  | { kind: "unreadable" | "missing" | "revoked" | "mismatch" | "unproven"; detail: string };

type PublishPayload = { ok: boolean; skipped?: boolean; reason?: string } | null | undefined;

export function deliveryKey(planId: string): string {
  return `deliver:${planId}`;
}

export function publishAttemptKey(planId: string, attempt: number): string {
  return `publish:${planId}:${attempt}`;
}

export function classifyPublishResult(result: PublishPayload): PublishClass {
  if (!result) return "ambiguous";
  if (result.ok && (result.skipped === true || result.reason === "duplicate_event_key")) return "already_present";
  if (result.ok) return "inserted";
  switch (result.reason) {
    case "missing_user":
    case "self_notify":
    case "category_disabled":
      return "refused";
    case "actor_rate_limited":
    case "user_rate_limited":
    case "no_service_role":
      return "not_inserted";
    default:
      return "ambiguous";
  }
}

/** In-app payload. eventKey is the provider idempotency key. No email, group, or force. */
export function inAppFollowupNotification(plan: FollowupPlan) {
  return {
    userId: plan.userId,
    type: "system" as const,
    title: "A note from Jimvio",
    message: "You have an unfinished step in Jimvio. Open your account to continue. This is not a bulk campaign.",
    actionUrl: "/welcome",
    eventKey: `growth-followup:${plan.id}`,
    data: { source: "growth-engine", trigger: plan.trigger },
  };
}

function remember(state: EngineState, key: string): EngineState {
  if (state.completedKeys.includes(key)) return state;
  return { ...state, completedKeys: [...state.completedKeys, key] };
}

function countAttempts(state: EngineState, planId: string): number {
  const prefix = `publish:${planId}:`;
  return state.completedKeys.filter((key) => key.startsWith(prefix)).length;
}

function rememberResult(state: EngineState, planId: string, value: StoredPublishResult): EngineState {
  const prefix = `publish-result:${planId}:`;
  return remember({
    ...state,
    completedKeys: state.completedKeys.filter((key) => !key.startsWith(prefix)),
  }, `${prefix}${value}`);
}

function lastResult(state: EngineState, planId: string): StoredPublishResult | null {
  const prefix = `publish-result:${planId}:`;
  const found = [...state.completedKeys].reverse().find((key) => key.startsWith(prefix));
  if (!found) return null;
  const value = found.slice(prefix.length);
  if (value === "not_inserted" || value === "refused" || value === "ambiguous" || value === "stopped") return value;
  return "ambiguous";
}

function withSent(state: EngineState, planId: string, at: string): EngineState {
  return {
    ...state,
    followups: state.followups.map((item) => item.id === planId ? { ...item, sent: true, status: "sent_in_app" as const } : item),
    updatedAt: at,
  };
}

function overlayConsent(state: EngineState, planId: string, consent: ConsentFlags): EngineState {
  return {
    ...state,
    followups: state.followups.map((item) => item.id === planId
      ? {
        ...item,
        marketingConsent: consent.marketingConsent === true,
        unsubscribed: consent.unsubscribed === true,
        reengagementAllowed: consent.reengagementAllowed === true,
      }
      : item),
  };
}

function consentError(kind: ConsentRead["kind"]): string {
  return kind === "unreadable" ? CONSENT_UNREADABLE : CONSENT_DENIED;
}

export async function deliverFollowupLocked(input: {
  store: EngineLockStore;
  owner: string;
  now: Date;
  followupId: string;
  env?: NodeJS.ProcessEnv;
  freshConsent?: ConsentFlags;
  loadConsent?: (userId: string) => Promise<ConsentFlags>;
  lookup?: (plan: FollowupPlan) => Promise<NotificationLookup>;
  notify: (plan: FollowupPlan) => Promise<PublishPayload>;
  sleep?: (ms: number) => Promise<void>;
}): Promise<DeliveryResult> {
  const env = input.env ?? process.env;
  const claim = await claimBounded(input.store, {
    owner: input.owner,
    now: input.now,
    ttlMs: DELIVERY_LEASE_MS,
    insertFrom: createInitialState(input.now),
    actorId: null,
    sleep: input.sleep,
  });
  if (!claim.ok || !claim.state) {
    return { ok: false, status: 409, notified: false, outcome: "not_sent", error: "Another growth run holds the lock.", state: claim.state };
  }

  const release = async (next: EngineState, result: Omit<DeliveryResult, "state">): Promise<DeliveryResult> => {
    const released = await input.store.release({ hold: claim.hold, now: input.now, next });
    return { ...result, state: released.ok ? released.state : next };
  };

  if (killSwitchEngaged(env)) {
    const next = appendAudit(claim.state, {
      at: input.now.toISOString(),
      action: "deliver_followup",
      subjectId: input.followupId,
      outcome: "blocked",
      detail: "Global kill switch is on.",
    });
    return release(next, { ok: false, status: 409, notified: false, outcome: "not_sent", error: "Global kill switch is on." });
  }

  const plan = claim.state.followups.find((item) => item.id === input.followupId);
  if (!plan) {
    return release(claim.state, { ok: false, status: 404, notified: false, outcome: "not_sent", error: "Follow-up not found." });
  }

  const lookupOf = async (): Promise<NotificationLookup> => {
    if (!input.lookup) return "unknown";
    try {
      const value = await input.lookup(plan);
      if (value === "present" || value === "absent" || value === "unknown") return value;
      return "unknown";
    } catch {
      return "unknown";
    }
  };

  const readConsent = async (): Promise<ConsentRead> => {
    if (!input.loadConsent && !input.freshConsent) {
      return { kind: "unreadable", detail: CONSENT_UNREADABLE };
    }
    let consent: ConsentFlags;
    try {
      consent = input.loadConsent ? await input.loadConsent(plan.userId) : input.freshConsent as ConsentFlags;
    } catch {
      return { kind: "unreadable", detail: CONSENT_UNREADABLE };
    }
    if (consent.reason === "mismatch") {
      return { kind: "mismatch", detail: "The stored preference does not belong to this user." };
    }
    if (consent.reason === "unproven") {
      return { kind: "unproven", detail: "Stored reengagement was not explicitly granted. A database default is not consent." };
    }
    if (!consent.marketingConsent || consent.unsubscribed) {
      return consent.reason === "missing"
        ? { kind: "missing", detail: "No stored marketing preference was found. A missing preference is not consent." }
        : { kind: "revoked", detail: CONSENT_DENIED };
    }
    if (plan.trigger === "reactivation" && !consent.reengagementAllowed) {
      return { kind: "revoked", detail: "The reengagement preference is off." };
    }
    return { kind: "granted", consent };
  };

  const denyConsent = (state: EngineState, consent: Exclude<ConsentRead, { kind: "granted" }>, hold: HeldLock): Promise<DeliveryResult> => {
    const next = appendAudit(
      consent.kind === "unreadable" ? state : overlayConsent(state, plan.id, {
        marketingConsent: false,
        unsubscribed: true,
        reengagementAllowed: false,
      }),
      {
        at: input.now.toISOString(),
        action: "deliver_followup",
        subjectId: plan.id,
        outcome: consent.kind === "unreadable" ? "error" : "blocked",
        detail: consent.detail,
      },
    );
    return input.store.release({ hold, now: input.now, next }).then((released) => ({
      ok: false,
      status: 409,
      notified: false,
      outcome: "not_sent" as const,
      error: consentError(consent.kind),
      state: released.ok ? released.state : next,
    }));
  };

  const finishSent = async (hold: HeldLock, state: EngineState, mode: "sent" | "reconciled"): Promise<DeliveryResult> => {
    const noted = mode === "reconciled"
      ? appendAudit(state, {
        at: input.now.toISOString(),
        action: "deliver_followup",
        subjectId: plan.id,
        outcome: "success",
        detail: "Reconciled an existing in-app notification. No second message was sent.",
      })
      : appendAudit(state, {
        at: input.now.toISOString(),
        action: "deliver_followup",
        subjectId: plan.id,
        outcome: "success",
        detail: "In-app notification was sent.",
      });
    const released = await input.store.release({ hold, now: input.now, next: noted });
    if (!released.ok) {
      return {
        ok: false,
        status: 409,
        notified: mode === "sent",
        outcome: mode === "sent" ? "sent" : "reconciled",
        error: "The notification was claimed, but a newer lock prevented the sent flag from being saved.",
        state: null,
      };
    }
    return {
      ok: true,
      status: 200,
      notified: mode === "sent",
      outcome: mode === "sent" ? "sent" : "reconciled",
      state: released.state,
    };
  };

  const notifyHeld = async (written: WriteSuccess): Promise<DeliveryResult> => {
    if (killSwitchEngaged(env)) {
      const stopped = appendAudit(rememberResult(written.state, plan.id, "stopped"), {
        at: input.now.toISOString(),
        action: "deliver_followup",
        subjectId: plan.id,
        outcome: "blocked",
        detail: "Global kill switch is on. Notification was not sent.",
      });
      const released = await input.store.release({ hold: written.hold, now: input.now, next: stopped });
      return {
        ok: false,
        status: 409,
        notified: false,
        outcome: "not_sent",
        error: "Global kill switch is on.",
        state: released.ok ? released.state : stopped,
      };
    }

    const again = await readConsent();
    if (again.kind !== "granted") return denyConsent(written.state, again, written.hold);

    let published: PublishPayload;
    try {
      published = await input.notify({ ...plan, ...again.consent });
    } catch {
      published = null;
    }
    const kind = classifyPublishResult(published);
    if (kind === "inserted" || kind === "already_present") {
      return finishSent(written.hold, withSent(written.state, plan.id, input.now.toISOString()), kind === "inserted" ? "sent" : "reconciled");
    }

    const stored: StoredPublishResult = kind === "refused" ? "refused" : kind === "not_inserted" ? "not_inserted" : "ambiguous";
    const next = rememberResult(written.state, plan.id, stored);
    if (kind === "ambiguous") {
      const found = await lookupOf();
      if (found === "present") {
        return finishSent(written.hold, withSent(next, plan.id, input.now.toISOString()), "reconciled");
      }
    }
    const detail = kind === "refused"
      ? "The notification provider refused this follow-up. The delivery claim is kept so a retry cannot send a second message."
      : FAILURE_DETAIL;
    const failed = appendAudit({ ...next, lastError: detail }, {
      at: input.now.toISOString(),
      action: "deliver_followup",
      subjectId: plan.id,
      outcome: "error",
      detail,
    });
    const released = await input.store.release({ hold: written.hold, now: input.now, next: failed });
    return {
      ok: false,
      status: kind === "refused" ? 409 : 502,
      notified: false,
      outcome: "not_sent",
      error: kind === "refused"
        ? "The notification provider refused this follow-up. No email was attempted."
        : "In-app delivery did not succeed. No email was attempted.",
      state: released.ok ? released.state : failed,
    };
  };

  if (plan.sent || claim.state.completedKeys.includes(deliveryKey(plan.id))) {
    if (plan.sent) {
      return release(claim.state, { ok: false, status: 409, notified: false, outcome: "not_sent", error: ALREADY_CLAIMED });
    }
    const found = await lookupOf();
    if (found === "present") {
      return finishSent(claim.hold, withSent(claim.state, plan.id, input.now.toISOString()), "reconciled");
    }
    if (found !== "absent") {
      const noted = appendAudit(claim.state, {
        at: input.now.toISOString(),
        action: "deliver_followup",
        subjectId: plan.id,
        outcome: "blocked",
        detail: "Reconciliation was inconclusive. This follow-up was already claimed. It was not re-sent.",
      });
      return release(noted, { ok: false, status: 409, notified: false, outcome: "not_sent", error: ALREADY_CLAIMED });
    }

    const consent = await readConsent();
    if (consent.kind !== "granted") return denyConsent(claim.state, consent, claim.hold);
    const attempts = countAttempts(claim.state, plan.id);
    const prior = lastResult(claim.state, plan.id) ?? (attempts > 0 ? "ambiguous" : null);
    if (attempts >= PUBLISH_ATTEMPT_LIMIT || prior === "refused" || prior === "stopped") {
      const detail = prior === "stopped"
        ? "Global kill switch stopped this follow-up. This follow-up was already claimed. It was not re-sent."
        : prior === "refused"
          ? "The notification provider refused this follow-up. This follow-up was already claimed. It was not re-sent."
          : "The delivery attempt limit was reached. This follow-up was already claimed. It was not re-sent.";
      const noted = appendAudit(claim.state, {
        at: input.now.toISOString(),
        action: "deliver_followup",
        subjectId: plan.id,
        outcome: "blocked",
        detail,
      });
      return release(noted, { ok: false, status: 409, notified: false, outcome: "not_sent", error: ALREADY_CLAIMED });
    }

    const claimed = appendAudit(remember(claim.state, publishAttemptKey(plan.id, attempts + 1)), {
      at: input.now.toISOString(),
      action: "deliver_followup",
      subjectId: plan.id,
      outcome: "success",
      detail: "delivery claim recorded before notification",
    });
    const written = await input.store.writeHeld({
      hold: claim.hold,
      now: input.now,
      next: claimed,
      extendMs: DELIVERY_LEASE_MS,
    });
    if (!written.ok) {
      return { ok: false, status: 409, notified: false, outcome: "not_sent", error: "The lock changed before delivery could be claimed.", state: null };
    }
    return notifyHeld(written);
  }

  const consent = await readConsent();
  if (consent.kind !== "granted") return denyConsent(claim.state, consent, claim.hold);
  const consentedPlan: FollowupPlan = { ...plan, ...consent.consent };
  const approval = findApproval(claim.state, "followup_delivery", plan.id, input.now, {
    userId: consentedPlan.userId,
    trigger: consentedPlan.trigger,
    classification: "marketing",
    audienceCount: 1,
    marketingConsent: true,
    unsubscribed: false,
    reengagementAllowed: consentedPlan.reengagementAllowed,
  });
  const decision = canDeliverInApp(consentedPlan, approval, input.now);
  if (!decision.ok || !approval) {
    const blocked = appendAudit(claim.state, {
      at: input.now.toISOString(),
      action: "deliver_followup",
      subjectId: plan.id,
      outcome: "blocked",
      detail: decision.reason,
    });
    return release(blocked, { ok: false, status: 409, notified: false, outcome: "not_sent", error: decision.reason });
  }

  if (killSwitchEngaged(env)) {
    return release(claim.state, { ok: false, status: 409, notified: false, outcome: "not_sent", error: "Global kill switch is on." });
  }

  const claimed = appendAudit(
    remember(
      remember(consumeApproval(claim.state, approval.id, input.now), deliveryKey(plan.id)),
      publishAttemptKey(plan.id, countAttempts(claim.state, plan.id) + 1),
    ),
    {
      at: input.now.toISOString(),
      action: "deliver_followup",
      subjectId: plan.id,
      outcome: "success",
      detail: "delivery claim recorded before notification",
    },
  );
  const written = await input.store.writeHeld({
    hold: claim.hold,
    now: input.now,
    next: claimed,
    extendMs: DELIVERY_LEASE_MS,
  });
  if (!written.ok) {
    return { ok: false, status: 409, notified: false, outcome: "not_sent", error: "The lock changed before delivery could be claimed.", state: null };
  }
  return notifyHeld(written);
}
