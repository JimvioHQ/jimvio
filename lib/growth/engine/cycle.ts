import { proposeCampaign } from "./ads";
import { cohortRetention, type CohortInput } from "./cohorts";
import { buildDraft } from "./content";
import { planFollowup } from "./followups";
import { buildOpportunities } from "./opportunities";
import { effectiveStatus } from "./policy";
import { assessReferrals } from "./referrals";
import { acquireRunLock, releaseRunLock, runScheduledTasks, type GrowthTask } from "./scheduler";
import { auditSeo } from "./seo";
import { appendAudit, ensureDaily, trimState } from "./state";
import type { EngineState, MeasuredSignals, RunRecord, SeoPage } from "./types";

export type CycleInput = {
  state: EngineState;
  signals: MeasuredSignals;
  pages: SeoPage[];
  sitemapPaths: string[];
  knownPaths: string[];
  services: Array<{ id: string; title: string; href: string }>;
  internalHrefs?: string[];
  cohortEvents?: CohortInput[];
  now?: Date;
  env?: NodeJS.ProcessEnv;
  runId?: string;
  /** The caller already holds the persisted campaign lock. Do not take or clear an in-memory lock. */
  alreadyLocked?: boolean;
};

export type CycleSummary = {
  status: RunRecord["status"];
  tasksRun: number;
  tasksSkipped: number;
  summary: string;
  errors: string[];
};

function summaryText(input: {
  findings: number;
  opportunities: number;
  hypotheses: number;
  signals: MeasuredSignals;
  sent: number;
  issued: number;
  spend: number;
}): string {
  const clicks = typeof input.signals.affiliateClicks7d === "number"
    ? `${input.signals.affiliateClicks7d} measured affiliate clicks over 7 days`
    : "affiliate clicks were not measured";
  const users = typeof input.signals.newUsers7d === "number"
    ? `${input.signals.newUsers7d} measured new profiles over 7 days`
    : "new profiles were not measured";
  return [
    `${input.findings} SEO findings from the supplied catalog.`,
    `${input.opportunities} opportunities, including ${input.hypotheses} with a hypothesis.`,
    input.signals.searchConsoleConnected ? "Search Console credentials are present." : "Search Console is not connected.",
    clicks,
    users,
    `${input.sent} messages sent, ${input.issued} rewards issued, ${input.spend} ad campaigns submitted.`,
  ].join(" ");
}

export async function runGrowthCycle(input: CycleInput): Promise<{ state: EngineState; summary: CycleSummary }> {
  const now = input.now ?? new Date();
  const runId = input.runId ?? `cycle-${now.getTime()}`;
  let state = ensureDaily(input.state, now);
  const startedAt = now.toISOString();

  const finish = (status: RunRecord["status"], tasksRun: number, tasksSkipped: number, text: string, errors: string[]) => {
    const record: RunRecord = {
      id: runId,
      startedAt,
      finishedAt: now.toISOString(),
      status,
      tasksRun,
      tasksSkipped,
      summary: text,
      errors,
    };
    state = trimState({
      ...state,
      runs: [...state.runs, record].slice(-30),
      lastCheckedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastError: errors[0] ?? state.lastError,
    });
    return { state, summary: { status, tasksRun, tasksSkipped, summary: text, errors } };
  };

  if (effectiveStatus(state, input.env) === "paused") {
    const reason = input.env?.GROWTH_ENGINE_KILL ? "Global kill switch is on." : state.pausedReason;
    state = appendAudit(state, {
      at: startedAt,
      action: "cycle",
      subjectId: runId,
      outcome: "skipped",
      detail: reason,
    });
    return finish("paused", 0, 0, reason, []);
  }

  let lockToken: string | null = null;
  if (!input.alreadyLocked) {
    const lock = acquireRunLock(state, runId, now, state.limits.taskTimeoutMs * state.limits.maxTasksPerRun + 1000);
    if (!lock.acquired || !lock.token) {
      state = lock.state;
      return finish("locked", 0, 0, "Another growth run holds the lock.", []);
    }
    state = lock.state;
    lockToken = lock.token;
  }

  try {
    const findings = auditSeo({
      pages: input.pages,
      sitemapPaths: input.sitemapPaths,
      knownPaths: input.knownPaths,
      internalHrefs: input.internalHrefs,
      organizationSchema: input.signals.organizationSchema,
      websiteSchema: input.signals.websiteSchema,
    });
    const opportunities = buildOpportunities({ findings, signals: input.signals, services: input.services });
    const hypotheses = opportunities.filter((item) => item.evidence.some((evidence) => evidence.kind === "hypothesis")).length;
    state = { ...state, opportunities };

    const tasks: GrowthTask[] = [];
    const draftSources = opportunities.filter((item) => item.recommendedRiskClass === "draft").slice(0, state.limits.maxDraftsPerRun);
    for (const source of draftSources) {
      const fromTitle = source.title.match(/ on (\/\S*)$/)?.[1];
      const fromEvidence = source.evidence.map((item) => item.statement).join(" ").match(/(\/[a-z0-9/-]*)/)?.[1];
      const path = fromTitle || fromEvidence || "/";
      tasks.push({
        idempotencyKey: `draft:${source.id}`,
        riskClass: "draft",
        subjectId: source.id,
        title: `Draft ${source.title}`,
        execute: (current) => {
          if (current.drafts.some((draft) => draft.opportunityId === source.id)) return current;
          const draft = buildDraft({
            opportunity: source,
            path,
            title: source.title,
            facts: source.evidence.filter((item) => item.kind === "measured").map((item) => item.statement),
            now,
          });
          return { ...current, drafts: [...current.drafts, draft] };
        },
      });
    }

    for (const candidate of input.signals.followupCandidates ?? []) {
      tasks.push({
        idempotencyKey: `followup:${candidate.trigger}:${candidate.userId}`,
        riskClass: "queue",
        subjectId: candidate.userId,
        title: `Plan ${candidate.trigger}`,
        execute: (current) => {
          const plan = planFollowup({ ...candidate, approved: false, now });
          const followups = current.followups.filter((item) => item.id !== plan.id);
          return { ...current, followups: [...followups, plan] };
        },
      });
    }

    const referralEvents = input.signals.referralEvents ?? [];
    if (referralEvents.length > 0) {
      tasks.push({
        idempotencyKey: `referrals:${referralEvents.map((event) => event.id).join(",")}`,
        riskClass: "observe",
        subjectId: "referrals",
        title: "Assess referrals",
        execute: (current) => ({
          ...current,
          referrals: assessReferrals(referralEvents, { rewardFlatUsd: null, maxPerReferrerPerDay: 5 }),
        }),
      });
    }

    tasks.push({
      idempotencyKey: `ads:${now.toISOString().slice(0, 10)}`,
      riskClass: "observe",
      subjectId: "ads",
      title: "Prepare ads proposal",
      execute: (current) => {
        const proposal = proposeCampaign({
          landingPath: "/",
          now,
          accountConnected: Boolean(input.signals.adsAccountConnected),
        });
        if (current.campaigns.some((item) => item.id === proposal.id && item.createdAt.slice(0, 10) === proposal.createdAt.slice(0, 10))) {
          return current;
        }
        return { ...current, campaigns: [...current.campaigns, proposal] };
      },
    });

    const cohorts = cohortRetention(input.cohortEvents ?? [], now);
    tasks.push({
      idempotencyKey: `cohort:${now.toISOString().slice(0, 10)}:${cohorts.rows.length}`,
      riskClass: "observe",
      subjectId: "cohorts",
      title: "Record cohort note",
      execute: (current) => appendAudit(current, {
        at: now.toISOString(),
        action: "cohort",
        subjectId: "cohorts",
        outcome: "success",
        detail: cohorts.note,
      }),
    });

    const scheduled = await runScheduledTasks(state, tasks, { now, env: input.env });
    state = scheduled.state;
    state = {
      ...state,
      costs: [
        ...state.costs,
        {
          id: `cost-${runId}`,
          provider: "internal-audit",
          amountUsd: 0,
          basis: "measured",
          note: "This cycle used local catalog data only. No provider invoice was read.",
          at: now.toISOString(),
        },
      ],
    };
    const text = summaryText({
      findings: findings.length,
      opportunities: opportunities.length,
      hypotheses,
      signals: input.signals,
      sent: state.followups.filter((item) => item.sent).length,
      issued: state.referrals.filter((item) => item.issued).length,
      spend: state.campaigns.filter((item) => item.submitted).length,
    });
    if (lockToken) {
      const released = releaseRunLock(state, runId, lockToken);
      state = released.state;
    }
    return finish(scheduled.errors.length ? "failed" : scheduled.stopped ? "stopped" : "completed", scheduled.tasksRun, scheduled.tasksSkipped, text, scheduled.errors);
  } catch (error) {
    const message = error instanceof Error ? error.message : "cycle failed";
    if (lockToken) {
      const released = releaseRunLock({ ...state, lastError: message }, runId, lockToken);
      state = released.released ? released.state : { ...state, lastError: message };
    } else {
      state = { ...state, lastError: message };
    }
    return finish("failed", 0, 0, message, [message]);
  }
}
