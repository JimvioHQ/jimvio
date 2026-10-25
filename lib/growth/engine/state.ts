import type { Approval, ApprovalParameters, AuditEntry, EngineLimits, EngineState, FollowupPlan, IntegrationCheck, IntegrationChecks, RiskClass } from "./types";

export const DEFAULT_LIMITS: EngineLimits = {
  maxTasksPerRun: 8,
  maxRetries: 2,
  taskTimeoutMs: 8000,
  maxDailyTasks: 24,
  maxDailyExternalCalls: 0,
  maxDraftsPerRun: 3,
};

export function emptyIntegrationChecks(): IntegrationChecks {
  const blank: IntegrationCheck = { state: "missing", detail: "Not checked.", checkedAt: null };
  return {
    searchConsole: { ...blank },
    resend: { ...blank },
    googleAds: { ...blank },
    metaAds: { ...blank },
  };
}

function parseIntegrationCheck(value: unknown, fallback: IntegrationCheck): IntegrationCheck {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  const state = record.state;
  const known = state === "missing" || state === "unverified" || state === "verified" || state === "failed";
  return {
    state: known ? state : "failed",
    detail: typeof record.detail === "string" ? record.detail.slice(0, 240) : fallback.detail,
    checkedAt: typeof record.checkedAt === "string" ? record.checkedAt : null,
  };
}

export function parseIntegrationChecks(value: unknown): IntegrationChecks {
  const fallback = emptyIntegrationChecks();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  return {
    searchConsole: parseIntegrationCheck(record.searchConsole, fallback.searchConsole),
    resend: parseIntegrationCheck(record.resend, fallback.resend),
    googleAds: parseIntegrationCheck(record.googleAds, fallback.googleAds),
    metaAds: parseIntegrationCheck(record.metaAds, fallback.metaAds),
  };
}

export function createInitialState(now = new Date()): EngineState {
  const iso = now.toISOString();
  return {
    version: 1,
    revision: 0,
    status: "paused",
    pausedReason: "Growth automation starts paused until a platform admin resumes it.",
    limits: { ...DEFAULT_LIMITS },
    lowRiskChannels: [],
    daily: { date: iso.slice(0, 10), tasks: 0, externalCalls: 0 },
    lock: null,
    completedKeys: [],
    opportunities: [],
    drafts: [],
    followups: [],
    referrals: [],
    campaigns: [],
    approvals: [],
    runs: [],
    audit: [],
    costs: [],
    integrations: emptyIntegrationChecks(),
    lastError: null,
    lastCheckedAt: null,
    updatedAt: iso,
  };
}

export function clampLimits(input: Partial<EngineLimits> | null | undefined): EngineLimits {
  const source = input ?? {};
  const pick = (value: unknown, fallback: number, min: number, max: number) => {
    const numeric = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;
    return Math.min(max, Math.max(min, numeric));
  };
  return {
    maxTasksPerRun: pick(source.maxTasksPerRun, DEFAULT_LIMITS.maxTasksPerRun, 1, 20),
    maxRetries: pick(source.maxRetries, DEFAULT_LIMITS.maxRetries, 0, 3),
    taskTimeoutMs: pick(source.taskTimeoutMs, DEFAULT_LIMITS.taskTimeoutMs, 1000, 20000),
    maxDailyTasks: pick(source.maxDailyTasks, DEFAULT_LIMITS.maxDailyTasks, 1, 48),
    maxDailyExternalCalls: pick(source.maxDailyExternalCalls, DEFAULT_LIMITS.maxDailyExternalCalls, 0, 10),
    maxDraftsPerRun: pick(source.maxDraftsPerRun, DEFAULT_LIMITS.maxDraftsPerRun, 0, 5),
  };
}

export function ensureDaily(state: EngineState, now: Date): EngineState {
  const date = now.toISOString().slice(0, 10);
  if (state.daily.date === date) return state;
  return { ...state, daily: { date, tasks: 0, externalCalls: 0 } };
}

export function appendAudit(state: EngineState, entry: AuditEntry): EngineState {
  return { ...state, audit: [...state.audit, entry].slice(-100) };
}

export function trimState(state: EngineState): EngineState {
  return {
    ...state,
    limits: clampLimits(state.limits),
    completedKeys: retainKeys(state.completedKeys),
    opportunities: state.opportunities.slice(0, 40),
    drafts: state.drafts.slice(-20),
    followups: state.followups.slice(-50),
    referrals: state.referrals.slice(-50),
    campaigns: state.campaigns.slice(-20),
    approvals: state.approvals.slice(-50),
    runs: state.runs.slice(-30),
    audit: state.audit.slice(-100),
    costs: state.costs.slice(-30),
    integrations: parseIntegrationChecks(state.integrations),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDeliveryTrace(key: string): boolean {
  return key.startsWith("deliver:") || key.startsWith("publish:") || key.startsWith("publish-result:");
}

function retainKeys(keys: string[]): string[] {
  const unique = [...new Set(keys)];
  const deliveries = unique.filter(isDeliveryTrace);
  const others = unique.filter((key) => !isDeliveryTrace(key)).slice(-200);
  return [...others, ...deliveries].slice(-400);
}

function parseLock(value: unknown): EngineState["lock"] {
  if (!isRecord(value)) return null;
  if (typeof value.owner !== "string" || typeof value.token !== "string" || typeof value.until !== "string") return null;
  if (!value.owner || !value.token || !value.until) return null;
  return { owner: value.owner, token: value.token, until: value.until };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseParameters(value: unknown): ApprovalParameters {
  if (!isRecord(value)) return {};
  const audience = value.audienceCount;
  return {
    userId: optionalString(value.userId),
    trigger: optionalString(value.trigger) as ApprovalParameters["trigger"],
    classification: value.classification === "marketing" || value.classification === "security" ? value.classification : undefined,
    audienceCount: typeof audience === "number" && Number.isFinite(audience) ? audience : undefined,
    marketingConsent: value.marketingConsent === true ? true : value.marketingConsent === false ? false : undefined,
    unsubscribed: value.unsubscribed === true ? true : value.unsubscribed === false ? false : undefined,
    reengagementAllowed: value.reengagementAllowed === true ? true : value.reengagementAllowed === false ? false : undefined,
    draftId: optionalString(value.draftId),
    channel: optionalString(value.channel),
    path: optionalString(value.path),
  };
}

function parseApprovals(value: unknown): Approval[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap((item) => {
    const id = optionalString(item.id);
    const subjectId = optionalString(item.subjectId);
    const riskClass = optionalString(item.riskClass) as RiskClass | undefined;
    if (!id || !subjectId || !riskClass) return [];
    const uses = typeof item.usesRemaining === "number" && Number.isFinite(item.usesRemaining) ? Math.trunc(item.usesRemaining) : 0;
    return [{
      id,
      riskClass,
      subjectId,
      approverId: typeof item.approverId === "string" ? item.approverId : "",
      approvedAt: typeof item.approvedAt === "string" ? item.approvedAt : "",
      expiresAt: typeof item.expiresAt === "string" ? item.expiresAt : "",
      note: typeof item.note === "string" ? item.note : "",
      parameters: parseParameters(item.parameters),
      usesRemaining: Math.min(1, Math.max(0, uses)),
      usedAt: typeof item.usedAt === "string" ? item.usedAt : null,
    }];
  });
}

function parseFollowups(value: unknown): FollowupPlan[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap((item) => {
    const id = optionalString(item.id);
    const userId = optionalString(item.userId);
    const trigger = optionalString(item.trigger) as FollowupPlan["trigger"] | undefined;
    if (!id || !userId || !trigger) return [];
    const status = item.status;
    const known = status === "planned_not_sent" || status === "needs_approval" || status === "blocked" || status === "sent_in_app" || status === "not_handled_here";
    return [{
      id,
      userId,
      trigger,
      classification: item.classification === "security" ? "security" as const : "marketing" as const,
      status: known ? status : "blocked",
      reason: typeof item.reason === "string" ? item.reason : "Stored follow-up is missing a consent snapshot.",
      audienceCount: item.audienceCount === 1 ? 1 : 0,
      marketingConsent: item.marketingConsent === true,
      unsubscribed: item.unsubscribed !== false,
      reengagementAllowed: item.reengagementAllowed === true,
      sent: item.sent === true,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
    }];
  });
}

export function parseEngineState(value: unknown): EngineState | null {
  if (!isRecord(value) || value.version !== 1) return null;
  if (value.status !== "paused" && value.status !== "running") return null;
  const base = createInitialState();
  const daily = isRecord(value.daily) ? value.daily : {};
  return trimState({
    ...base,
    ...value,
    version: 1,
    revision: typeof value.revision === "number" ? value.revision : 0,
    status: value.status,
    pausedReason: typeof value.pausedReason === "string" ? value.pausedReason : base.pausedReason,
    limits: clampLimits(isRecord(value.limits) ? (value.limits as Partial<EngineLimits>) : base.limits),
    lowRiskChannels: Array.isArray(value.lowRiskChannels)
      ? value.lowRiskChannels.filter((item): item is string => typeof item === "string").slice(0, 10)
      : [],
    daily: {
      date: typeof daily.date === "string" ? daily.date : base.daily.date,
      tasks: typeof daily.tasks === "number" ? daily.tasks : 0,
      externalCalls: typeof daily.externalCalls === "number" ? daily.externalCalls : 0,
    },
    lock: parseLock(value.lock),
    completedKeys: Array.isArray(value.completedKeys) ? value.completedKeys.filter((item): item is string => typeof item === "string") : [],
    opportunities: Array.isArray(value.opportunities) ? (value.opportunities as EngineState["opportunities"]) : [],
    drafts: Array.isArray(value.drafts) ? (value.drafts as EngineState["drafts"]) : [],
    followups: parseFollowups(value.followups),
    referrals: Array.isArray(value.referrals) ? (value.referrals as EngineState["referrals"]) : [],
    campaigns: Array.isArray(value.campaigns) ? (value.campaigns as EngineState["campaigns"]) : [],
    approvals: parseApprovals(value.approvals),
    runs: Array.isArray(value.runs) ? (value.runs as EngineState["runs"]) : [],
    audit: Array.isArray(value.audit) ? (value.audit as EngineState["audit"]) : [],
    costs: Array.isArray(value.costs) ? (value.costs as EngineState["costs"]) : [],
    integrations: parseIntegrationChecks(value.integrations),
    lastError: typeof value.lastError === "string" ? value.lastError : null,
    lastCheckedAt: typeof value.lastCheckedAt === "string" ? value.lastCheckedAt : null,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : base.updatedAt,
  });
}
