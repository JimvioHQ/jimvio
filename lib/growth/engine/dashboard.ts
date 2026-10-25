export type EngineDashboardSnapshot = {
  status: "paused" | "running";
  effectiveStatus: "paused" | "running";
  killSwitch: boolean;
  pausedReason: string;
  persisted: boolean;
  persistenceError: string | null;
  limits: { maxTasksPerRun: number; maxDailyTasks: number; maxDailyExternalCalls: number };
  daily: { date: string; tasks: number; externalCalls: number };
  opportunities: unknown[];
  drafts: Array<{ id: string; title: string; status: string; publication: string; appliedToSite: boolean; qualityIssues: string[] }>;
  followups: Array<{ id: string; trigger: string; status: string; reason: string; sent: boolean }>;
  referrals: Array<{ id: string; status: string; issued: boolean; flags: string[]; calculatedRewardUsd: number | null }>;
  campaigns: Array<{ id: string; landingPath: string; spendEnabled: boolean; submitted: boolean; estimatedCostUsd: null; reason: string }>;
  approvals: Array<{ id: string; riskClass: string; subjectId: string; usesRemaining: number; expiresAt: string; usedAt: string | null }>;
  providers: Array<{ id: string; name: string; connected: boolean; verification: string; requirement: string; priceStatus: string; summary: string }>;
  capabilities: Array<{ id: string; label: string; state: string; requirement: string }>;
  runs: Array<{ id: string; status: string; summary: string; tasksRun: number; errors: string[] }>;
  audit: Array<{ at: string; action: string; subjectId: string; outcome: string; detail: string }>;
  costs: Array<{ id: string; provider: string; amountUsd: number | null; basis: string; note: string }>;
  recovery: string[];
  lock?: { held: boolean; until: string | null };
  lastError: string | null;
  sentFollowups: number;
  issuedRewards: number;
  submittedCampaigns: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Reject error payloads so the admin page does not read missing arrays. */
export function isEngineSnapshot(body: unknown): body is EngineDashboardSnapshot {
  if (!isRecord(body)) return false;
  return (body.status === "paused" || body.status === "running")
    && (body.effectiveStatus === "paused" || body.effectiveStatus === "running")
    && typeof body.persisted === "boolean"
    && typeof body.pausedReason === "string"
    && Array.isArray(body.opportunities)
    && Array.isArray(body.drafts)
    && Array.isArray(body.followups)
    && Array.isArray(body.approvals)
    && Array.isArray(body.capabilities)
    && Array.isArray(body.providers)
    && Array.isArray(body.audit);
}
