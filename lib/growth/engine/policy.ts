import { isHighImpactPath, publicationDecision } from "./content";
import { appendAudit } from "./state";
import type { Approval, ApprovalParameters, EngineState, RiskClass } from "./types";

const ALWAYS_REVIEW = new Set<RiskClass>([
  "publish_low_risk",
  "followup_delivery",
  "bulk_message",
  "paid_spend",
  "reward_issue",
  "production_change",
]);

export function killSwitchEngaged(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = (env.GROWTH_ENGINE_KILL ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "paused";
}

export function effectiveStatus(state: EngineState, env: NodeJS.ProcessEnv = process.env): "paused" | "running" {
  if (killSwitchEngaged(env) || state.status !== "running") return "paused";
  return "running";
}

export const HARD_BLOCKED_RISKS = ["paid_spend", "reward_issue", "bulk_message", "production_change"] as const;

export function hardBlocked(riskClass: RiskClass): boolean {
  return (HARD_BLOCKED_RISKS as readonly string[]).includes(riskClass);
}

export function approvalActive(approval: Approval, now: Date): boolean {
  return new Date(approval.expiresAt).getTime() > now.getTime();
}

export function approvalUsable(approval: Approval, now: Date): boolean {
  return Boolean(approval.approverId.trim())
    && approval.usesRemaining === 1
    && approval.usedAt === null
    && approvalActive(approval, now);
}

export function parametersMatch(approval: Approval, expected: ApprovalParameters): boolean {
  const actual = approval.parameters ?? {};
  return (Object.keys(expected) as Array<keyof ApprovalParameters>).every((key) => actual[key] === expected[key]);
}

export function findApproval(
  state: EngineState,
  riskClass: RiskClass,
  subjectId: string,
  now: Date,
  expected?: ApprovalParameters,
): Approval | null {
  return (
    state.approvals.find(
      (approval) =>
        approval.riskClass === riskClass &&
        approval.subjectId === subjectId &&
        approvalUsable(approval, now) &&
        (!expected || parametersMatch(approval, expected)),
    ) ?? null
  );
}

export function consumeApproval(state: EngineState, approvalId: string, now: Date): EngineState {
  return {
    ...state,
    approvals: state.approvals.map((approval) => approval.id === approvalId
      ? { ...approval, usesRemaining: 0, usedAt: now.toISOString() }
      : approval),
  };
}

export type PolicyDecision = {
  allowed: boolean;
  reason: string;
};

export function evaluateAction(
  state: EngineState,
  riskClass: RiskClass,
  subjectId: string,
  now: Date,
  env: NodeJS.ProcessEnv = process.env,
): PolicyDecision {
  if (effectiveStatus(state, env) === "paused") {
    return { allowed: false, reason: killSwitchEngaged(env) ? "Global kill switch is on." : state.pausedReason };
  }
  if (state.daily.tasks >= state.limits.maxDailyTasks) {
    return { allowed: false, reason: "Daily task limit reached." };
  }
  if (riskClass === "observe" || riskClass === "draft" || riskClass === "queue") {
    return { allowed: true, reason: "Allowed while the engine is running and under the daily limit." };
  }
  if (riskClass === "production_change") {
    return { allowed: false, reason: "This engine cannot deploy or change production." };
  }
  if (riskClass === "paid_spend") {
    return { allowed: false, reason: "Paid advertising stays disabled. No ad account is authorized to spend from this engine." };
  }
  if (riskClass === "reward_issue") {
    return { allowed: false, reason: "Wallet credits stay on the existing payment controls. This engine does not issue rewards." };
  }
  if (riskClass === "bulk_message") {
    return { allowed: false, reason: "Bulk campaigns stay blocked until a separate approved sender exists. This engine does not send them." };
  }
  if (hardBlocked(riskClass)) {
    return { allowed: false, reason: "This action is hard-blocked." };
  }
  const approval = findApproval(state, riskClass, subjectId, now);
  if (ALWAYS_REVIEW.has(riskClass) && !approval) {
    return { allowed: false, reason: "This action needs an unexpired admin approval." };
  }
  if (riskClass === "publish_low_risk" && state.lowRiskChannels.length === 0) {
    return { allowed: false, reason: "No low-risk publication channel is configured." };
  }
  if (state.daily.externalCalls >= state.limits.maxDailyExternalCalls && riskClass !== "publish_low_risk") {
    return { allowed: false, reason: "External call limit reached." };
  }
  return { allowed: true, reason: "Approval is present and the action stays inside the engine log." };
}

const RECORDABLE = new Set<RiskClass>(["followup_delivery", "publish_low_risk"]);

function clampHours(hours: number): number {
  if (!Number.isFinite(hours)) return 24;
  return Math.min(72, Math.max(1, Math.trunc(hours)));
}

export function bindApproval(input: {
  state: EngineState;
  riskClass: RiskClass;
  subjectId: string;
  approverId: string;
  now: Date;
  hours: number;
}): { ok: true; approval: Approval } | { ok: false; reason: string } {
  if (!input.approverId.trim()) return { ok: false, reason: "An authorized approver is required." };
  if (hardBlocked(input.riskClass) || !RECORDABLE.has(input.riskClass)) {
    return { ok: false, reason: "Approvals here cover only one in-app follow-up or a low-risk log entry. Spend, rewards, bulk email, and deploys stay blocked." };
  }
  const expiresAt = new Date(input.now.getTime() + clampHours(input.hours) * 3_600_000).toISOString();
  const base = {
    id: `approval-${crypto.randomUUID()}`,
    approverId: input.approverId,
    approvedAt: input.now.toISOString(),
    expiresAt,
    usesRemaining: 1,
    usedAt: null,
  };
  if (input.riskClass === "followup_delivery") {
    const plan = input.state.followups.find((item) => item.id === input.subjectId);
    if (!plan) return { ok: false, reason: "Follow-up not found." };
    if (plan.classification !== "marketing" || plan.audienceCount !== 1 || plan.status !== "planned_not_sent" || plan.sent) {
      return { ok: false, reason: "Only one unsent consented marketing follow-up can be approved." };
    }
    if (!plan.marketingConsent || plan.unsubscribed || (plan.trigger === "reactivation" && !plan.reengagementAllowed)) {
      return { ok: false, reason: "Marketing consent is missing or the person unsubscribed." };
    }
    return {
      ok: true,
      approval: {
        ...base,
        riskClass: "followup_delivery",
        subjectId: plan.id,
        note: "One in-app follow-up. This does not send email, credit a wallet, submit ads, or edit the site.",
        parameters: {
          userId: plan.userId,
          trigger: plan.trigger,
          classification: "marketing",
          audienceCount: 1,
          marketingConsent: true,
          unsubscribed: false,
          reengagementAllowed: plan.reengagementAllowed,
        },
      },
    };
  }
  const draft = input.state.drafts.find((item) => item.id === input.subjectId);
  if (!draft) return { ok: false, reason: "Draft not found." };
  if (draft.channel === "public_page_review" || isHighImpactPath(draft.path)) {
    return { ok: false, reason: "Public pages cannot be approved for publication by this engine." };
  }
  if (!input.state.lowRiskChannels.includes(draft.channel)) {
    return { ok: false, reason: "No low-risk publication channel is configured for this draft." };
  }
  return {
    ok: true,
    approval: {
      ...base,
      riskClass: "publish_low_risk",
      subjectId: draft.id,
      note: "Logs a low-risk decision in the growth record. The live site is not changed.",
      parameters: { draftId: draft.id, channel: draft.channel, path: draft.path },
    },
  };
}

export function applyLowRiskDecision(state: EngineState, draftId: string, now: Date): { state: EngineState; ok: boolean; reason: string } {
  const draft = state.drafts.find((item) => item.id === draftId);
  if (!draft) return { state, ok: false, reason: "Draft not found." };
  const blocked = (reason: string): { state: EngineState; ok: false; reason: string } => ({
    ok: false,
    reason,
    state: appendAudit(state, {
      at: now.toISOString(),
      action: "log_low_risk",
      subjectId: draft.id,
      outcome: "blocked",
      detail: reason,
    }),
  });
  if (isHighImpactPath(draft.path) || draft.channel === "public_page_review") {
    return blocked("Public pages, offers, and legal copy stay in review. This engine does not change the live site.");
  }
  const approval = findApproval(state, "publish_low_risk", draft.id, now, {
    draftId: draft.id,
    channel: draft.channel,
    path: draft.path,
  });
  const decision = publicationDecision({
    draft,
    state,
    now,
    approved: Boolean(approval),
  });
  if (!approval || decision.publication !== "logged_not_on_site") {
    return blocked(decision.reason);
  }
  const consumed = consumeApproval(state, approval.id, now);
  return {
    ok: true,
    reason: decision.reason,
    state: {
      ...consumed,
      drafts: consumed.drafts.map((item) => item.id === draft.id
        ? { ...item, publication: "logged_not_on_site" as const, appliedToSite: false as const }
        : item),
      updatedAt: now.toISOString(),
    },
  };
}
