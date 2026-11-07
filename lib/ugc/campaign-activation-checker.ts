/**
 * Automated campaign validation before funding / activation.
 * Distinct from Trust Checker (marketplace) and brand reputation scores.
 */

import {
  assertCampaignReadyForFunding,
  coerceFiniteNumber,
  toCampaignWizardDraft,
  type CampaignWizardDraft,
} from "@/lib/ugc/campaign-wizard-validation";
import { contentFormatNeedsDuration } from "@/lib/ugc/campaign-brief";
import {
  MIN_CAMPAIGN_FUNDING_USD,
  checkMinCampaignFunding,
  fundingAmountUsd,
} from "@/lib/ugc/min-funding";
import { campaignFunding, type EscrowRow } from "@/lib/ugc/escrow-funding";
import { formatUSD } from "@/lib/currency/platform";

export type CheckerSeverity = "passed" | "warning" | "failed" | "needs_review";

export type CheckerFinding = {
  id: string;
  category: "completeness" | "financial" | "quality" | "safety";
  severity: CheckerSeverity;
  title: string;
  reason: string;
  fix: string;
};

export type CampaignActivationReport = {
  status: CheckerSeverity;
  canActivate: boolean;
  canFund: boolean;
  findings: CheckerFinding[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
    needsReview: number;
  };
  checkedAt: string;
};

type CheckerInput = {
  campaign: Record<string, unknown> | null | undefined;
  escrow?: EscrowRow[] | null;
  mediaUrls?: string[] | null;
  duplicateTitleCount?: number | null;
};

function severityRank(s: CheckerSeverity): number {
  switch (s) {
    case "failed":
      return 3;
    case "needs_review":
      return 2;
    case "warning":
      return 1;
    default:
      return 0;
  }
}

function rollup(findings: CheckerFinding[]): CheckerSeverity {
  let worst: CheckerSeverity = "passed";
  for (const f of findings) {
    if (severityRank(f.severity) > severityRank(worst)) worst = f.severity;
  }
  return worst;
}

function looksSuspiciousUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return true;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local")) return true;
    if (/\b(bit\.ly|tinyurl|t\.co)\b/i.test(host) && !host.includes("jimvio")) return true;
    return false;
  } catch {
    return true;
  }
}

function prohibitedCopy(text: string): boolean {
  return /free money|guaranteed views|get rich|risk[- ]?free profit|guaranteed followers/i.test(
    text,
  );
}

export function runCampaignActivationChecker(input: CheckerInput): CampaignActivationReport {
  const findings: CheckerFinding[] = [];
  const draft: CampaignWizardDraft = toCampaignWizardDraft(input.campaign ?? undefined);
  const row = (input.campaign ?? {}) as Record<string, unknown>;
  const title = String(draft.title ?? "").trim();
  const description = String(draft.description ?? "").trim();
  const budget = coerceFiniteNumber(draft.total_budget) ?? 0;
  const currency = String(row.currency ?? row.budget_currency ?? "USD").toUpperCase() || "USD";

  // —— Completeness ——
  const ready = assertCampaignReadyForFunding(draft);
  if (ready.success) {
    findings.push({
      id: "completeness.ready",
      category: "completeness",
      severity: "passed",
      title: "Required campaign fields",
      reason: "All required wizard fields are present.",
      fix: "No action needed.",
    });
  } else {
    for (const err of ready.errors.slice(0, 8)) {
      findings.push({
        id: `completeness.${err.field}`,
        category: "completeness",
        severity: "failed",
        title: `Missing or invalid: ${err.field}`,
        reason: err.message,
        fix: "Open the Create / Edit wizard and complete this field.",
      });
    }
  }

  if (title.length > 0 && title.length < 8) {
    findings.push({
      id: "completeness.title_short",
      category: "completeness",
      severity: "warning",
      title: "Short campaign title",
      reason: "Titles under 8 characters are harder for creators to understand.",
      fix: "Use a clear title that names the brand and offer.",
    });
  }

  if (description.length > 0 && description.length < 80) {
    findings.push({
      id: "completeness.description_short",
      category: "completeness",
      severity: "warning",
      title: "Brief description",
      reason: "Descriptions under ~80 characters often miss submission instructions.",
      fix: "Add objectives, must-include talking points, and how creators apply.",
    });
  }

  const platforms = draft.allowed_platforms ?? [];
  if (platforms.length === 0) {
    findings.push({
      id: "completeness.platforms",
      category: "completeness",
      severity: "failed",
      title: "No platforms selected",
      reason: "Creators need at least one allowed platform.",
      fix: "Select TikTok, Instagram, YouTube, and/or Facebook.",
    });
  }

  const format = draft.content_format ?? null;
  if (contentFormatNeedsDuration(format as never) ) {
    const min = coerceFiniteNumber(draft.min_duration);
    const max = coerceFiniteNumber(draft.max_duration);
    if (min == null || max == null || min <= 0 || max <= 0 || min > max) {
      findings.push({
        id: "completeness.duration",
        category: "completeness",
        severity: "failed",
        title: "Video duration incomplete",
        reason: "Video campaigns require a valid min/max duration range.",
        fix: "Set minimum and maximum duration with min ≤ max.",
      });
    }
  }

  const endsAt = row.ends_at ?? row.end_date;
  const startsAt = row.starts_at ?? row.start_date;
  if (startsAt && endsAt) {
    const start = new Date(String(startsAt)).getTime();
    const end = new Date(String(endsAt)).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
      findings.push({
        id: "completeness.dates",
        category: "completeness",
        severity: "failed",
        title: "Invalid campaign dates",
        reason: "End date is before the start date.",
        fix: "Correct the schedule so the campaign ends after it starts.",
      });
    }
  }

  // —— Financial ——
  const minCheck = checkMinCampaignFunding(budget, currency);
  if (minCheck.ok) {
    findings.push({
      id: "financial.min_funding",
      category: "financial",
      severity: "passed",
      title: `Minimum funding (${formatUSD(MIN_CAMPAIGN_FUNDING_USD)})`,
      reason: minCheck.message,
      fix: "No action needed.",
    });
  } else {
    findings.push({
      id: "financial.min_funding",
      category: "financial",
      severity: "failed",
      title: `Minimum funding (${formatUSD(MIN_CAMPAIGN_FUNDING_USD)})`,
      reason: minCheck.message,
      fix: `Raise total budget to at least ${formatUSD(MIN_CAMPAIGN_FUNDING_USD)} USD equivalent before funding.`,
    });
  }

  const paymentModel = String(draft.payment_model ?? "per_views");
  const isFixedPay = paymentModel === "fixed" || paymentModel === "fixed_per_content";
  if (isFixedPay) {
    const fixed = coerceFiniteNumber(draft.fixed_rate) ?? 0;
    if (fixed <= 0) {
      findings.push({
        id: "financial.fixed_rate",
        category: "financial",
        severity: "failed",
        title: "Fixed reward missing",
        reason: "Fixed-pay campaigns need a positive fixed rate.",
        fix: "Set the per-submission fixed reward.",
      });
    } else if (fixed > budget && budget > 0) {
      findings.push({
        id: "financial.fixed_vs_budget",
        category: "financial",
        severity: "failed",
        title: "Reward exceeds budget",
        reason: `Fixed rate (${formatUSD(fixed)}) is higher than total budget (${formatUSD(fundingAmountUsd(budget, currency))}).`,
        fix: "Lower the fixed reward or raise the campaign budget.",
      });
    }
  } else {
    const rate = coerceFiniteNumber(draft.rate_per_1k_views) ?? 0;
    if (rate <= 0) {
      findings.push({
        id: "financial.cpm",
        category: "financial",
        severity: "failed",
        title: "CPM rate missing",
        reason: "Per-view campaigns need a positive rate per 1K views.",
        fix: "Set a rate per 1,000 views.",
      });
    }
  }

  const funding = campaignFunding({
    escrow: input.escrow,
    totalBudget: budget,
    spentBudget: row.spent_budget as number | string | null | undefined,
  });
  if (funding.state === "funded") {
    findings.push({
      id: "financial.escrow_held",
      category: "financial",
      severity: "passed",
      title: "Escrow funded",
      reason: `Confirmed escrow covers the budget (${formatUSD(funding.heldUsd)} held).`,
      fix: "No action needed.",
    });
  } else if (funding.heldUsd > 0) {
    findings.push({
      id: "financial.escrow_partial",
      category: "financial",
      severity: "warning",
      title: "Partially funded",
      reason: `${formatUSD(funding.heldUsd)} held of ${formatUSD(funding.budgetUsd)} budget.`,
      fix: "Complete funding so held escrow covers the full budget before activation.",
    });
  } else {
    findings.push({
      id: "financial.escrow_missing",
      category: "financial",
      severity: "failed",
      title: "Escrow not confirmed",
      reason: "No held escrow deposit yet. Pending checkouts do not count as funded.",
      fix: "Complete payment on the Fund & Activate page and wait for confirmation.",
    });
  }

  // —— Quality / safety ——
  const blob = `${title}\n${description}`;
  if (prohibitedCopy(blob)) {
    findings.push({
      id: "safety.misleading_claims",
      category: "safety",
      severity: "needs_review",
      title: "Potentially misleading reward claims",
      reason: "Copy includes phrases associated with unrealistic guarantees.",
      fix: "Remove guarantee language and describe real, payable rewards only.",
    });
  }

  for (const url of input.mediaUrls ?? []) {
    if (!url?.trim()) continue;
    if (looksSuspiciousUrl(url)) {
      findings.push({
        id: `safety.asset:${url.slice(0, 48)}`,
        category: "safety",
        severity: "warning",
        title: "Suspicious or invalid asset URL",
        reason: `Asset link may be broken or unsafe: ${url}`,
        fix: "Replace with a direct https media URL hosted on an allowed CDN.",
      });
    }
  }

  if ((input.duplicateTitleCount ?? 0) > 0) {
    findings.push({
      id: "quality.duplicate_title",
      category: "quality",
      severity: "warning",
      title: "Similar campaign title exists",
      reason: "Another of your campaigns uses the same title.",
      fix: "Rename to avoid confusing creators, or confirm this is intentional.",
    });
  }

  const status = rollup(findings);
  const failed = findings.filter((f) => f.severity === "failed").length;
  const needsReview = findings.filter((f) => f.severity === "needs_review").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const passed = findings.filter((f) => f.severity === "passed").length;

  // Missing escrow blocks activation, not the ability to start funding.
  const fundBlockers = findings.filter(
    (f) => f.severity === "failed" && f.id !== "financial.escrow_missing",
  );
  const canFund = fundBlockers.length === 0 && minCheck.ok && ready.success;
  const canActivate = canFund && funding.state === "funded" && needsReview === 0;

  return {
    status,
    canActivate,
    canFund,
    findings,
    summary: { passed, warnings, failed, needsReview },
    checkedAt: new Date().toISOString(),
  };
}
