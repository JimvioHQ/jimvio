import { PUBLIC_ECOSYSTEM } from "@/lib/brand/positioning";
import { markDraftReviewed, rejectDraft, rollbackDraft } from "@/lib/growth/engine/content";
import { runGrowthCycle, type CycleSummary } from "@/lib/growth/engine/cycle";
import { deliverFollowupLocked, inAppFollowupNotification, type NotificationLookup } from "@/lib/growth/engine/delivery";
import { consentFromStoredPreferences, planFollowup } from "@/lib/growth/engine/followups";
import { claimBounded, type LockOutcome } from "@/lib/growth/engine/lock";
import { applyLowRiskDecision, bindApproval, capabilityReport, effectiveStatus, killSwitchEngaged } from "@/lib/growth/engine/policy";
import { integrationPresence, providerCatalog } from "@/lib/growth/engine/providers";
import { appendAudit, createInitialState, trimState } from "@/lib/growth/engine/state";
import type { EngineState, FollowupPlan, FollowupTrigger, RiskClass } from "@/lib/growth/engine/types";
import { notifyUser } from "@/lib/notifications/notify-user";
import { PAGE_SEO } from "@/lib/seo";
import { PUBLIC_SITEMAP_ROUTES } from "@/lib/growth/engine/public-surface";
import { getAdminDB } from "@/services/base";
import { getGrowthKpis } from "@/services/growth/kpi";
import { trackGrowthEvent } from "@/services/growth/events";
import { createSupabaseEngineStore } from "@/services/growth/engine-lock";
import { getGrowthStats } from "@/services/ops/growth";
import { writeAuditEvent } from "@/services/ops/audit";

export const ENGINE_SLUG = "jimvio-growth-engine";

const TRIGGERS = new Set<FollowupTrigger>([
  "incomplete_onboarding",
  "service_update",
  "abandoned_journey",
  "unresolved_support",
  "useful_reminder",
  "referral_opportunity",
  "reactivation",
]);

const PROHIBITED_ACTIONS = new Set([
  "deploy",
  "migrate",
  "production_change",
  "paid_spend",
  "reward_issue",
  "bulk_message",
  "send_email",
  "credit_wallet",
]);

export const RECOVERY_STEPS = [
  "Pause on this page. Set GROWTH_ENGINE_KILL=1 to force every run to stop, including a run that is already queued.",
  "The control record is growth_campaigns.slug = jimvio-growth-engine. It stores drafts and logs. It does not edit public pages.",
  "A run lock is one conditional update on that row. It expires, and a stale owner cannot clear a newer lock.",
  "Rollback restores an earlier draft version inside that record. The live site stays as deployed.",
  "No database migration is part of this engine. If the control metadata cannot be read, it is left in place.",
];

type LoadedEngine = {
  state: EngineState;
  persisted: boolean;
  revision: number;
  error: string | null;
};

type ActionFailure = { ok: false; error: string; status: number; code?: "contended" | "stale" | "error" };
type ActionSuccess = { ok: true; snapshot: ReturnType<typeof engineSnapshot>; summary?: CycleSummary };

function db() {
  return getAdminDB();
}

function store() {
  return createSupabaseEngineStore(ENGINE_SLUG);
}

function lockTtl(state: EngineState): number {
  const budget = state.limits.taskTimeoutMs * state.limits.maxTasksPerRun + 15_000;
  return Math.min(60_000, Math.max(10_000, budget));
}

export function catalogPages() {
  return Object.values(PAGE_SEO).map((page) => ({
    path: page.path,
    title: page.title,
    description: page.description,
    canonical: page.path,
  }));
}

function knownPaths(): string[] {
  return [...new Set([
    ...PUBLIC_SITEMAP_ROUTES.map((route) => route.path),
    ...catalogPages().map((page) => page.path),
    ...PUBLIC_ECOSYSTEM.map((item) => item.href),
  ])];
}

async function measuredSignals() {
  const presence = integrationPresence();
  const [kpis, stats] = await Promise.all([
    getGrowthKpis().catch(() => null),
    getGrowthStats().catch(() => null),
  ]);
  let inviteRows: Array<{
    id: string;
    code: string;
    inviter_id: string | null;
    accepted_by: string | null;
    created_at: string;
    accepted_at: string | null;
  }> = [];
  try {
    const invites = await db()
      .from("growth_invites")
      .select("id, code, inviter_id, accepted_by, created_at, accepted_at")
      .not("accepted_by", "is", null)
      .limit(100);
    if (!invites.error && invites.data) inviteRows = invites.data;
  } catch {
    inviteRows = [];
  }

  const referralEvents = inviteRows
    .filter((row) => row.inviter_id && row.accepted_by && row.created_at)
    .map((row) => ({
      id: row.id,
      code: row.code,
      referrerUserId: row.inviter_id as string,
      referredUserId: row.accepted_by as string,
      createdAt: row.created_at,
      convertedAt: row.accepted_at,
    }));

  return {
    funnel: kpis?.funnel ?? null,
    affiliateClicks7d: stats ? stats.affiliateClicks7d : null,
    newUsers7d: stats ? stats.newUsers7d : null,
    referralEvents,
    searchConsoleConnected: presence.searchConsoleConnected,
    adsAccountConnected: presence.adsAccountConnected,
    organizationSchema: true,
    websiteSchema: true,
  };
}

async function readMarketingConsent(userId: string) {
  const { data, error } = await db()
    .from("notification_preferences")
    .select("user_id, email_reengagement, email_reengagement_explicit_at, email_enabled, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Marketing consent could not be confirmed.");
  return consentFromStoredPreferences(data, userId);
}

/**
 * Reconciliation reads the notification row for this user and event key.
 * A failed read is unknown, which does not authorize another send.
 * Analytics events are not used as proof.
 */
async function lookupFollowupNotification(plan: FollowupPlan): Promise<NotificationLookup> {
  try {
    const { data, error } = await db()
      .from("notifications")
      .select("id")
      .eq("user_id", plan.userId)
      .eq("event_key", `growth-followup:${plan.id}`)
      .limit(1);
    if (error) return "unknown";
    return data && data.length > 0 ? "present" : "absent";
  } catch {
    return "unknown";
  }
}

async function auditLock(outcome: LockOutcome, owner: string, actorId: string | null) {
  await writeAuditEvent({
    actorId,
    action: "growth.engine_lock",
    entityType: "growth_campaigns",
    entityId: ENGINE_SLUG,
    metadata: { outcome, owner },
  });
}

export async function loadEngine(): Promise<LoadedEngine> {
  try {
    const state = await store().read();
    if (!state) return { state: createInitialState(), persisted: false, revision: 0, error: null };
    return { state, persisted: true, revision: state.revision, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The growth engine control record could not be read.";
    return { state: createInitialState(), persisted: false, revision: 0, error: message };
  }
}

export function engineSnapshot(loaded: LoadedEngine) {
  const state = loaded.state;
  return {
    status: state.status,
    effectiveStatus: effectiveStatus(state),
    killSwitch: killSwitchEngaged(),
    pausedReason: state.pausedReason,
    persisted: loaded.persisted,
    persistenceError: loaded.error,
    limits: state.limits,
    daily: state.daily,
    lock: { held: Boolean(state.lock), until: state.lock?.until ?? null },
    opportunities: state.opportunities,
    drafts: state.drafts,
    followups: state.followups,
    referrals: state.referrals,
    campaigns: state.campaigns,
    approvals: state.approvals,
    runs: state.runs,
    audit: state.audit.slice(-20),
    costs: state.costs,
    providers: providerCatalog(),
    capabilities: capabilityReport(state),
    lastError: state.lastError,
    updatedAt: state.updatedAt,
    recovery: RECOVERY_STEPS,
    sentFollowups: state.followups.filter((item) => item.sent).length,
    issuedRewards: state.referrals.filter((item) => item.issued).length,
    submittedCampaigns: state.campaigns.filter((item) => item.submitted).length,
  };
}

function snapshotOf(state: EngineState) {
  return engineSnapshot({ state, persisted: true, revision: state.revision, error: null });
}

async function executeCycle(actorId: string | null, mode: "cron" | "manual"): Promise<
  | { ok: true; summary: CycleSummary; snapshot: ReturnType<typeof engineSnapshot> }
  | ActionFailure
> {
  const owner = `run-${crypto.randomUUID()}`;
  const now = new Date();
  const engine = store();
  let claim;
  try {
    claim = await claimBounded(engine, {
      owner,
      now,
      ttlMs: lockTtl(createInitialState(now)),
      insertFrom: createInitialState(now),
      actorId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The growth engine could not be read.";
    return { ok: false, error: message, status: 409, code: "error" };
  }
  if (!claim.ok) {
    await auditLock("contended", owner, actorId);
    return { ok: false, error: "Another growth run holds the lock.", status: 409, code: "contended" };
  }

  const release = async (next: EngineState) => engine.release({ hold: claim.hold, now: new Date(), next: trimState(next) });
  const paused = killSwitchEngaged() || effectiveStatus(claim.state) === "paused";
  if (paused && mode === "manual") {
    const released = await release(claim.state);
    if (!released.ok) await auditLock("stale_release_rejected", owner, actorId);
    return {
      ok: false,
      error: killSwitchEngaged() ? "Global kill switch is on." : "Resume the engine before running it.",
      status: 409,
      code: "error",
    };
  }

  try {
    const signals = paused ? {} : await measuredSignals();
    const result = await runGrowthCycle({
      state: claim.state,
      signals,
      pages: paused ? [] : catalogPages(),
      sitemapPaths: paused ? [] : PUBLIC_SITEMAP_ROUTES.map((route) => route.path),
      knownPaths: paused ? [] : knownPaths(),
      services: paused ? [] : PUBLIC_ECOSYSTEM.map((item) => ({ id: item.id, title: item.title, href: item.href })),
      internalHrefs: paused ? [] : PUBLIC_ECOSYSTEM.map((item) => item.href),
      runId: owner,
      alreadyLocked: true,
      now,
    });
    const released = await release(result.state);
    if (!released.ok) {
      await auditLock("stale_release_rejected", owner, actorId);
      return { ok: false, error: "The lock changed before the result could be saved.", status: 409, code: "stale" };
    }
    await auditLock("released", owner, actorId);
    await trackGrowthEvent(actorId, "growth.engine_cycle", {
      status: result.summary.status,
      tasks: result.summary.tasksRun,
    });
    return { ok: true, summary: result.summary, snapshot: snapshotOf(released.state) };
  } catch {
    const failed = appendAudit(claim.state, {
      at: new Date().toISOString(),
      action: "cycle",
      subjectId: owner,
      outcome: "error",
      detail: "The growth cycle failed before any send, spend, or reward.",
    });
    const released = await release({ ...failed, lastError: "The growth cycle failed before any send, spend, or reward." });
    if (!released.ok) await auditLock("stale_release_rejected", owner, actorId);
    return { ok: false, error: "The growth cycle failed before any send, spend, or reward.", status: 500, code: "error" };
  }
}

export async function runCronCycle() {
  const result = await executeCycle(null, "cron");
  if (!result.ok && result.code === "contended") {
    return {
      ok: true as const,
      summary: {
        status: "locked" as const,
        tasksRun: 0,
        tasksSkipped: 0,
        summary: result.error,
        errors: [] as string[],
      },
    };
  }
  if (!result.ok) return result;
  return { ok: true as const, summary: result.summary };
}

async function mutate(
  actorId: string,
  action: string,
  change: (state: EngineState, now: Date) => Promise<{ state: EngineState } | { state?: EngineState; error: string; status: number }>,
): Promise<ActionSuccess | ActionFailure> {
  const owner = `admin-${crypto.randomUUID()}`;
  const now = new Date();
  const engine = store();
  let claim;
  try {
    claim = await claimBounded(engine, {
      owner,
      now,
      ttlMs: 20_000,
      insertFrom: createInitialState(now),
      actorId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The growth engine could not be read.";
    return { ok: false, error: message, status: 409, code: "error" };
  }
  if (!claim.ok) {
    await auditLock("contended", owner, actorId);
    return { ok: false, error: "Another growth run holds the lock.", status: 409, code: "contended" };
  }

  const changed = await change(claim.state, now);
  const next = "state" in changed && changed.state ? changed.state : claim.state;
  const released = await engine.release({ hold: claim.hold, now: new Date(), next: trimState(next) });
  if (!released.ok) {
    await auditLock("stale_release_rejected", owner, actorId);
    return { ok: false, error: "The lock changed before the result could be saved.", status: 409, code: "stale" };
  }
  await auditLock("released", owner, actorId);
  if ("error" in changed) {
    await writeAuditEvent({
      actorId,
      action: `growth.engine_${action}`,
      entityType: "growth_campaigns",
      entityId: ENGINE_SLUG,
      metadata: { outcome: "not_applied", status: changed.status },
    });
    return { ok: false, error: changed.error, status: changed.status, code: "error" };
  }
  await writeAuditEvent({
    actorId,
    action: `growth.engine_${action}`,
    entityType: "growth_campaigns",
    entityId: ENGINE_SLUG,
    metadata: { outcome: "applied" },
  });
  return { ok: true, snapshot: snapshotOf(released.state) };
}

export async function applyEngineAction(actorId: string, body: Record<string, unknown>): Promise<ActionSuccess | ActionFailure> {
  const action = typeof body.action === "string" ? body.action : "";
  if (!actorId) return { ok: false, error: "An authorized admin is required.", status: 401, code: "error" };
  if (PROHIBITED_ACTIONS.has(action)) {
    return { ok: false, error: "Spend, rewards, bulk email, and production changes stay blocked.", status: 400, code: "error" };
  }
  if (action === "run") {
    const loaded = await loadEngine();
    if (loaded.error) return { ok: false, error: loaded.error, status: 409, code: "error" };
    if (effectiveStatus(loaded.state) === "paused") {
      return {
        ok: false,
        error: killSwitchEngaged() ? "Global kill switch is on." : "Resume the engine before running it.",
        status: 409,
        code: "error",
      };
    }
    const result = await executeCycle(actorId, "manual");
    if (!result.ok) return result;
    await writeAuditEvent({
      actorId,
      action: "growth.engine_run",
      entityType: "growth_campaigns",
      entityId: ENGINE_SLUG,
      metadata: { status: result.summary.status },
    });
    return { ok: true, snapshot: result.snapshot, summary: result.summary };
  }
  if (action === "deliver_followup") {
    const followupId = typeof body.followupId === "string" ? body.followupId : "";
    if (!followupId) return { ok: false, error: "Follow-up not found.", status: 404, code: "error" };
    const owner = `deliver-${crypto.randomUUID()}`;
    const result = await deliverFollowupLocked({
      store: store(),
      owner,
      now: new Date(),
      followupId,
      env: process.env,
      loadConsent: readMarketingConsent,
      lookup: lookupFollowupNotification,
      notify: async (plan) => {
        const published = await notifyUser(db(), inAppFollowupNotification(plan));
        if (!published) return { ok: false };
        return { ok: published.ok, skipped: published.skipped, reason: published.reason };
      },
    });
    // Row metadata.audit is the precise record. This admin event records the
    // outcome only: no message body, provider text, or SQL.
    await writeAuditEvent({
      actorId,
      action: "growth.engine_deliver_followup",
      entityType: "growth_campaigns",
      entityId: ENGINE_SLUG,
      metadata: { followupId, outcome: result.outcome, status: result.status },
    });
    if (!result.ok) {
      if (result.error === "Another growth run holds the lock.") await auditLock("contended", owner, actorId);
      return {
        ok: false,
        error: result.error ?? "Follow-up delivery was blocked.",
        status: result.status,
        code: result.error === "Another growth run holds the lock." ? "contended" : "error",
      };
    }
    return { ok: true, snapshot: snapshotOf(result.state ?? createInitialState()) };
  }

  return mutate(actorId, action, async (state, now) => {
    if (action === "pause") {
      return { state: { ...state, status: "paused", pausedReason: "Paused by a platform admin.", updatedAt: now.toISOString() } };
    }
    if (action === "resume") {
      if (killSwitchEngaged()) {
        return { state, error: "GROWTH_ENGINE_KILL is on. Resume is blocked until that variable is removed.", status: 409 };
      }
      return { state: { ...state, status: "running", pausedReason: "Running. Spend, bulk email, rewards, and site publication stay blocked.", updatedAt: now.toISOString() } };
    }
    if (action === "review_draft" || action === "reject_draft" || action === "rollback_draft") {
      const draftId = typeof body.draftId === "string" ? body.draftId : "";
      const draft = state.drafts.find((item) => item.id === draftId);
      if (!draft) return { error: "Draft not found.", status: 404 };
      const next = action === "review_draft" ? markDraftReviewed(draft) : action === "reject_draft" ? rejectDraft(draft) : rollbackDraft(draft);
      return { state: { ...state, drafts: state.drafts.map((item) => (item.id === draftId ? next : item)), updatedAt: now.toISOString() } };
    }
    if (action === "approve") {
      const riskClass = body.riskClass as RiskClass;
      const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
      const hours = typeof body.hours === "number" ? body.hours : 24;
      const bound = bindApproval({ state, riskClass, subjectId, approverId: actorId, now, hours });
      if (!bound.ok) return { error: bound.reason, status: 400 };
      if (bound.approval.riskClass === "followup_delivery") {
        let fresh;
        try {
          fresh = await readMarketingConsent(bound.approval.parameters.userId ?? "");
        } catch {
          return {
            state: appendAudit(state, {
              at: now.toISOString(),
              action: "approve",
              subjectId,
              outcome: "error",
              detail: "Marketing consent could not be confirmed.",
            }),
            error: "Marketing consent could not be confirmed.",
            status: 409,
          };
        }
        if (!fresh.marketingConsent || fresh.unsubscribed || (bound.approval.parameters.trigger === "reactivation" && !fresh.reengagementAllowed)) {
          const detail = fresh.reason === "mismatch"
            ? "The stored preference does not belong to this user."
            : fresh.reason === "missing"
              ? "No stored marketing preference was found. A missing preference is not consent."
              : fresh.reason === "unproven"
                ? "Stored reengagement was not explicitly granted. A database default is not consent."
                : "Marketing consent is missing or the person unsubscribed.";
          return {
            state: appendAudit(state, {
              at: now.toISOString(),
              action: "approve",
              subjectId,
              outcome: "blocked",
              detail,
            }),
            error: "Marketing consent is missing or the person unsubscribed.",
            status: 409,
          };
        }
      }
      return { state: { ...state, approvals: [...state.approvals, bound.approval], updatedAt: now.toISOString() } };
    }
    if (action === "plan_followup") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const trigger = body.trigger as FollowupTrigger;
      if (!/^[0-9a-f-]{36}$/i.test(userId) || !TRIGGERS.has(trigger)) {
        return { error: "A user id and a known follow-up trigger are required.", status: 400 };
      }
      if (body.audienceCount !== undefined && body.audienceCount !== 1) {
        return { error: "Bulk delivery is disabled.", status: 400 };
      }
      let consent;
      try {
        consent = await readMarketingConsent(userId);
      } catch {
        return {
          state: appendAudit(state, {
            at: now.toISOString(),
            action: "plan_followup",
            subjectId: userId,
            outcome: "error",
            detail: "Marketing consent could not be confirmed.",
          }),
          error: "Marketing consent could not be confirmed.",
          status: 409,
        };
      }
      const plan = planFollowup({
        userId,
        trigger,
        classification: body.classification === "security" ? "security" : "marketing",
        marketingConsent: consent.marketingConsent,
        unsubscribed: consent.unsubscribed,
        reengagementAllowed: consent.reengagementAllowed,
        audienceCount: 1,
        approved: false,
        now,
      });
      const planned = {
        ...state,
        followups: [...state.followups.filter((item) => item.id !== plan.id), plan],
        updatedAt: now.toISOString(),
      };
      if (plan.status === "blocked" || plan.status === "needs_approval") {
        return {
          state: appendAudit(planned, {
            at: now.toISOString(),
            action: "plan_followup",
            subjectId: plan.id,
            outcome: "blocked",
            detail: plan.reason,
          }),
        };
      }
      return { state: planned };
    }
    if (action === "log_low_risk") {
      const draftId = typeof body.draftId === "string" ? body.draftId : "";
      const decision = applyLowRiskDecision(state, draftId, now);
      if (!decision.ok) return { state: decision.state, error: decision.reason, status: decision.reason === "Draft not found." ? 404 : 409 };
      return { state: decision.state };
    }
    return { error: "Unknown growth engine action.", status: 400 };
  });
}
