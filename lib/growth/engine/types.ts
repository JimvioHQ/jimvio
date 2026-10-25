export type EvidenceKind = "measured" | "estimate" | "hypothesis";

export type RiskClass =
  | "observe"
  | "draft"
  | "queue"
  | "publish_low_risk"
  | "followup_delivery"
  | "bulk_message"
  | "paid_spend"
  | "reward_issue"
  | "production_change";

export type EngineLimits = {
  maxTasksPerRun: number;
  maxRetries: number;
  taskTimeoutMs: number;
  maxDailyTasks: number;
  maxDailyExternalCalls: number;
  maxDraftsPerRun: number;
};

export type Evidence = {
  kind: EvidenceKind;
  statement: string;
  source: string;
};

export type Opportunity = {
  id: string;
  title: string;
  kind: "seo" | "content_gap" | "activation" | "retention" | "referral" | "channel" | "partnership";
  evidence: Evidence[];
  effort: "low" | "medium" | "high";
  effortBasis: "estimate";
  expectedBenefit: string;
  benefitBasis: EvidenceKind;
  confidence: "low" | "medium" | "high";
  risks: string[];
  nextAction: string;
  recommendedRiskClass: RiskClass;
  priorityScore: number;
  priorityBasis: "estimate";
};

export type SeoFinding = {
  id: string;
  path: string;
  code: string;
  severity: "info" | "warning";
  statement: string;
  basis: EvidenceKind;
};

export type SeoPage = {
  path: string;
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
};

export type DraftVersion = {
  version: number;
  body: string;
  createdAt: string;
};

export type ContentDraft = {
  id: string;
  opportunityId: string;
  path: string;
  channel: string;
  title: string;
  status: "needs_review" | "reviewed_not_published" | "rejected";
  versions: DraftVersion[];
  currentVersion: number;
  qualityIssues: string[];
  publication: "not_published" | "logged_not_on_site";
  appliedToSite: false;
};

export type FollowupTrigger =
  | "incomplete_onboarding"
  | "service_update"
  | "abandoned_journey"
  | "unresolved_support"
  | "useful_reminder"
  | "referral_opportunity"
  | "reactivation";

export type FollowupPlan = {
  id: string;
  userId: string;
  trigger: FollowupTrigger;
  classification: "marketing" | "security";
  status: "planned_not_sent" | "needs_approval" | "blocked" | "sent_in_app" | "not_handled_here";
  reason: string;
  audienceCount: number;
  marketingConsent: boolean;
  unsubscribed: boolean;
  reengagementAllowed: boolean;
  sent: boolean;
  createdAt: string;
};

export type ReferralEvent = {
  id: string;
  code: string;
  referrerUserId: string;
  referredUserId: string;
  createdAt: string;
  convertedAt?: string | null;
};

export type ReferralAssessment = {
  id: string;
  qualified: boolean;
  flags: string[];
  calculatedRewardUsd: number | null;
  rewardBasis: EvidenceKind | "unknown";
  issued: false;
  status: "blocked" | "calculated_no_budget" | "ready_for_wallet_review";
  note: string;
};

export type AdProposal = {
  id: string;
  landingPath: string;
  status: "proposal";
  spendEnabled: false;
  submitted: false;
  estimatedCostUsd: null;
  costBasis: "unknown";
  copy: string[];
  targeting: string;
  reason: string;
  createdAt: string;
};

export type ApprovalParameters = {
  userId?: string;
  trigger?: FollowupTrigger;
  classification?: "marketing" | "security";
  audienceCount?: number;
  marketingConsent?: boolean;
  unsubscribed?: boolean;
  reengagementAllowed?: boolean;
  draftId?: string;
  channel?: string;
  path?: string;
};

export type Approval = {
  id: string;
  riskClass: RiskClass;
  subjectId: string;
  approverId: string;
  approvedAt: string;
  expiresAt: string;
  note: string;
  parameters: ApprovalParameters;
  usesRemaining: number;
  usedAt: string | null;
};

export type AuditEntry = {
  at: string;
  action: string;
  subjectId: string;
  outcome: "success" | "skipped" | "error" | "blocked";
  detail: string;
};

export type RunRecord = {
  id: string;
  startedAt: string;
  finishedAt: string;
  status: "paused" | "locked" | "completed" | "stopped" | "failed" | "conflict";
  tasksRun: number;
  tasksSkipped: number;
  summary: string;
  errors: string[];
};

export type CostRecord = {
  id: string;
  provider: string;
  amountUsd: number | null;
  basis: EvidenceKind;
  note: string;
  at: string;
};

export type EngineState = {
  version: 1;
  revision: number;
  status: "paused" | "running";
  pausedReason: string;
  limits: EngineLimits;
  lowRiskChannels: string[];
  daily: { date: string; tasks: number; externalCalls: number };
  lock: { owner: string; token: string; until: string } | null;
  completedKeys: string[];
  opportunities: Opportunity[];
  drafts: ContentDraft[];
  followups: FollowupPlan[];
  referrals: ReferralAssessment[];
  campaigns: AdProposal[];
  approvals: Approval[];
  runs: RunRecord[];
  audit: AuditEntry[];
  costs: CostRecord[];
  integrations: IntegrationChecks;
  lastError: string | null;
  lastCheckedAt: string | null;
  updatedAt: string;
};

export type MeasuredSignals = {
  funnel?: Record<string, number> | null;
  affiliateClicks7d?: number | null;
  newUsers7d?: number | null;
  referralEvents?: ReferralEvent[];
  followupCandidates?: Array<{
    userId: string;
    trigger: FollowupTrigger;
    classification: "marketing" | "security";
    marketingConsent: boolean;
    unsubscribed: boolean;
    reengagementAllowed: boolean;
    audienceCount: number;
  }>;
  searchConsoleConnected?: boolean;
  adsAccountConnected?: boolean;
  organizationSchema?: boolean;
  websiteSchema?: boolean;
  integrationChecks?: IntegrationChecks;
  searchConsoleReport?: {
    status: "read" | "failed";
    rowCount: number;
    queries: string[];
    code?: string;
  };
};

export type IntegrationCheckState = "missing" | "unverified" | "verified" | "failed";

export type IntegrationCheck = {
  state: IntegrationCheckState;
  detail: string;
  checkedAt: string | null;
};

export type IntegrationChecks = {
  searchConsole: IntegrationCheck;
  resend: IntegrationCheck;
  googleAds: IntegrationCheck;
  metaAds: IntegrationCheck;
};

export type ProviderVerification = "internal" | "missing" | "names_present_unverified" | "verified" | "failed";

export type ProviderFact = {
  id: string;
  name: string;
  /** True when a read-only call succeeded, or for the internal audit. Spend stays disabled. */
  connected: boolean;
  verification: ProviderVerification;
  requirement: string;
  priceStatus: "free_with_quota" | "free_tier_not_guaranteed" | "paid_separate" | "unknown" | "internal_zero";
  summary: string;
  source: string;
  verifiedOn: string;
};
