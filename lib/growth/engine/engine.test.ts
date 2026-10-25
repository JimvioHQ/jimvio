import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { proposeCampaign } from "./ads";
import { cohortRetention } from "./cohorts";
import { buildDraft, publicationDecision, qualityIssues, rollbackDraft, translationDraft } from "./content";
import { runGrowthCycle } from "./cycle";
import { canDeliverInApp, planFollowup } from "./followups";
import { buildOpportunities } from "./opportunities";
import { evaluateAction } from "./policy";
import { PROVIDER_CATALOG } from "./providers";
import { assessReferral } from "./referrals";
import { acquireRunLock, runScheduledTasks } from "./scheduler";
import { auditSeo } from "./seo";
import { createInitialState, parseEngineState } from "./state";
import type { EngineState, Opportunity } from "./types";
import { PUBLIC_SITEMAP_ROUTES } from "@/lib/seo/public-sitemap";
import { ROBOTS_DISALLOW } from "@/lib/seo/robots-rules";

const now = new Date("2026-10-25T12:00:00.000Z");

function runningState(overrides: Partial<EngineState> = {}): EngineState {
  return { ...createInitialState(now), status: "running", pausedReason: "Running.", ...overrides };
}

describe("growth engine safety", () => {
  it("starts paused and rejects an unreadable control record", () => {
    assert.equal(createInitialState(now).status, "paused");
    assert.equal(parseEngineState({ version: 1, status: "nope" }), null);
  });

  it("keeps the public sitemap and robots lists stable", () => {
    assert.ok(PUBLIC_SITEMAP_ROUTES.some((route) => route.path === "/"));
    assert.equal(PUBLIC_SITEMAP_ROUTES.some((route) => route.path === "/admin"), false);
    assert.ok(ROBOTS_DISALLOW.includes("/admin/"));
    assert.ok(ROBOTS_DISALLOW.includes("/checkout/"));
  });

  it("audits metadata, sitemap gaps, and broken internal links as measured findings", () => {
    const findings = auditSeo({
      pages: [{ path: "/about", title: "About", description: "", canonical: "/about" }],
      sitemapPaths: ["/about", "/missing"],
      knownPaths: ["/about"],
      internalHrefs: ["/missing-page"],
      organizationSchema: true,
      websiteSchema: true,
    });
    assert.ok(findings.some((item) => item.code === "missing-description" && item.basis === "measured"));
    assert.ok(findings.some((item) => item.code === "sitemap-without-metadata" && item.path === "/missing"));
    assert.ok(findings.some((item) => item.code === "broken-internal-link"));
  });

  it("labels search demand as a hypothesis when Search Console is absent", () => {
    const items = buildOpportunities({
      findings: [],
      signals: { searchConsoleConnected: false, affiliateClicks7d: null },
      services: [{ id: "dropshipping", title: "Dropshipping", href: "/commerce" }],
    });
    const gap = items.find((item) => item.id.includes("dropshipping"));
    assert.ok(gap);
    assert.equal(gap?.evidence.some((item) => item.kind === "measured"), true);
    assert.equal(gap?.benefitBasis, "hypothesis");
    assert.equal(items.some((item) => item.id === "search-console-not-connected"), true);
  });

  it("does not publish public drafts or translate without a provider", () => {
    const opportunity = { id: "seo-about" } as Opportunity;
    const draft = buildDraft({
      opportunity,
      path: "/about",
      title: "About draft",
      facts: ["About is an existing public page."],
      now,
    });
    assert.equal(draft.appliedToSite, false);
    assert.equal(draft.publication, "not_published");
    assert.equal(draft.status, "needs_review");
    const decision = publicationDecision({ draft, state: runningState(), now, approved: true });
    assert.equal(decision.appliedToSite, false);
    assert.match(decision.reason, /does not change the live site/);
    assert.deepEqual(translationDraft(draft, "fr").status, "blocked_no_provider");
    assert.ok(qualityIssues("PayPal is available and earnings are guaranteed.", 1).length > 0);
    const revised = { ...draft, versions: [...draft.versions, { version: 2, body: "second", createdAt: now.toISOString() }], currentVersion: 2 };
    assert.equal(rollbackDraft(revised).currentVersion, 1);
  });

  it("blocks marketing without consent and keeps security mail separate", () => {
    const blocked = planFollowup({
      userId: "11111111-1111-4111-8111-111111111111",
      trigger: "reactivation",
      classification: "marketing",
      marketingConsent: false,
      unsubscribed: true,
      reengagementAllowed: false,
      audienceCount: 1,
      approved: true,
      now,
    });
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.sent, false);
    const bulk = planFollowup({ ...blocked, userId: blocked.userId, trigger: "useful_reminder", classification: "marketing", marketingConsent: true, unsubscribed: false, reengagementAllowed: true, audienceCount: 20, approved: true, now });
    assert.equal(bulk.status, "needs_approval");
    const security = planFollowup({ ...bulk, classification: "security", audienceCount: 1, trigger: "useful_reminder", now });
    assert.equal(security.status, "not_handled_here");
    const planned = planFollowup({ ...blocked, trigger: "incomplete_onboarding", marketingConsent: true, unsubscribed: false, reengagementAllowed: true, audienceCount: 1, now });
    assert.equal(planned.sent, false);
    assert.equal(planned.marketingConsent, true);
    assert.equal(canDeliverInApp(planned, null, now).ok, false);
    assert.equal(canDeliverInApp(planned, {
      id: "approval-followup",
      riskClass: "followup_delivery",
      subjectId: planned.id,
      approverId: "admin",
      approvedAt: now.toISOString(),
      expiresAt: "2026-10-26T00:00:00.000Z",
      note: "",
      usesRemaining: 1,
      usedAt: null,
      parameters: {
        userId: planned.userId,
        trigger: planned.trigger,
        classification: "marketing",
        audienceCount: 1,
        marketingConsent: true,
        unsubscribed: false,
        reengagementAllowed: true,
      },
    }, now).ok, true);
  });

  it("detects referral fraud and never issues a reward", () => {
    const prior = [{
      id: "event-1",
      code: "JMV-1",
      referrerUserId: "referrer",
      referredUserId: "buyer",
      createdAt: now.toISOString(),
      convertedAt: now.toISOString(),
    }];
    const duplicate = assessReferral(prior[0], prior, { rewardFlatUsd: 5, maxPerReferrerPerDay: 5 });
    const self = assessReferral({ ...prior[0], id: "event-2", referredUserId: "referrer" }, [], { rewardFlatUsd: 5, maxPerReferrerPerDay: 5 });
    assert.equal(duplicate.issued, false);
    assert.ok(duplicate.flags.includes("duplicate_event"));
    assert.equal(self.issued, false);
    assert.ok(self.flags.includes("self_referral"));
    const clean = assessReferral({ ...prior[0], id: "event-3", referredUserId: "other" }, [], { rewardFlatUsd: null, maxPerReferrerPerDay: 5 });
    assert.equal(clean.issued, false);
    assert.equal(clean.calculatedRewardUsd, null);
    assert.equal(clean.status, "calculated_no_budget");
  });

  it("prepares ads without a cost or a submission", () => {
    const proposal = proposeCampaign({ landingPath: "/", now, accountConnected: false });
    assert.equal(proposal.spendEnabled, false);
    assert.equal(proposal.submitted, false);
    assert.equal(proposal.estimatedCostUsd, null);
    assert.equal(proposal.costBasis, "unknown");
  });

  it("keeps paid, reward, and production actions blocked even with an approval", () => {
    const state = runningState({
      approvals: [{
        id: "approval",
        riskClass: "paid_spend",
        subjectId: "campaign",
        approverId: "admin",
        approvedAt: now.toISOString(),
        expiresAt: "2026-10-26T00:00:00.000Z",
        note: "",
        parameters: { audienceCount: 1 },
        usesRemaining: 1,
        usedAt: null,
      }],
    });
    assert.equal(evaluateAction(state, "paid_spend", "campaign", now).allowed, false);
    assert.equal(evaluateAction(state, "reward_issue", "campaign", now).allowed, false);
    assert.equal(evaluateAction(state, "production_change", "campaign", now).allowed, false);
    assert.equal(evaluateAction(state, "bulk_message", "campaign", now).allowed, false);
  });

  it("stops on the kill switch, a lock, a duplicate key, and the daily limit", async () => {
    const paused = await runGrowthCycle({
      state: runningState(),
      signals: {},
      pages: [],
      sitemapPaths: [],
      knownPaths: ["/"],
      services: [],
      env: { GROWTH_ENGINE_KILL: "1" },
      now,
    });
    assert.equal(paused.summary.status, "paused");
    assert.equal(paused.state.drafts.length, 0);

    const lockedState = acquireRunLock(runningState(), "other", now, 60_000).state;
    const locked = await runGrowthCycle({
      state: lockedState,
      signals: {},
      pages: [],
      sitemapPaths: [],
      knownPaths: ["/"],
      services: [],
      now,
      runId: "new-run",
    });
    assert.equal(locked.summary.status, "locked");

    const limited = await runScheduledTasks(runningState({ limits: { ...runningState().limits, maxDailyTasks: 1, maxRetries: 0, taskTimeoutMs: 1000 } }), [
      { idempotencyKey: "one", riskClass: "observe", subjectId: "one", title: "one", execute: (state) => state },
      { idempotencyKey: "two", riskClass: "observe", subjectId: "two", title: "two", execute: (state) => state },
    ], { now });
    assert.equal(limited.tasksRun, 1);
    assert.ok(limited.tasksSkipped >= 1);

    const duplicate = await runScheduledTasks(runningState({ completedKeys: ["one"] }), [
      { idempotencyKey: "one", riskClass: "observe", subjectId: "one", title: "one", execute: (state) => state },
    ], { now });
    assert.equal(duplicate.tasksRun, 0);
    assert.equal(duplicate.tasksSkipped, 1);
  });

  it("records a timeout without retrying forever", async () => {
    const result = await runScheduledTasks(runningState({ limits: { ...runningState().limits, maxRetries: 0, taskTimeoutMs: 20 } }), [
      { idempotencyKey: "hang", riskClass: "observe", subjectId: "hang", title: "hang", execute: () => new Promise(() => undefined) },
    ], { now });
    assert.equal(result.tasksRun, 0);
    assert.equal(result.errors[0]?.includes("timeout"), true);
  });

  it("runs a cycle without sending, spending, or rewarding", async () => {
    const result = await runGrowthCycle({
      state: runningState(),
      signals: {
        funnel: { "growth.welcome_intent_selected": 4, "growth.welcome_completed": 1, "growth.checklist_completed": 1 },
        affiliateClicks7d: 7,
        newUsers7d: 2,
        searchConsoleConnected: false,
        adsAccountConnected: false,
        organizationSchema: true,
        websiteSchema: true,
        referralEvents: [{
          id: "ref-1",
          code: "JMV-1",
          referrerUserId: "referrer",
          referredUserId: "referrer",
          createdAt: now.toISOString(),
        }],
      },
      pages: [{ path: "/about", title: "About Jimvio today", description: "", canonical: "/about" }],
      sitemapPaths: ["/about"],
      knownPaths: ["/about", "/commerce"],
      services: [{ id: "dropshipping", title: "Dropshipping", href: "/commerce" }],
      now,
      runId: "test-cycle",
    });
    assert.equal(result.summary.status === "completed" || result.summary.status === "stopped", true);
    assert.equal(result.state.followups.some((item) => item.sent), false);
    assert.equal(result.state.referrals.every((item) => item.issued === false), true);
    assert.equal(result.state.campaigns.every((item) => item.submitted === false && item.spendEnabled === false), true);
    assert.equal(result.state.drafts.every((item) => item.appliedToSite === false), true);
    assert.match(result.summary.summary, /0 messages sent, 0 rewards issued, 0 ad campaigns submitted/);
    assert.equal(result.state.costs.at(-1)?.amountUsd, 0);
    assert.equal(result.state.costs.at(-1)?.basis, "measured");
  });

  it("does not treat a provider free tier as Jimvio's invoice", () => {
    const resend = PROVIDER_CATALOG.find((provider) => provider.id === "resend");
    const search = PROVIDER_CATALOG.find((provider) => provider.id === "search-console");
    const ads = PROVIDER_CATALOG.find((provider) => provider.id === "google-ads");
    assert.equal(resend?.priceStatus, "free_tier_not_guaranteed");
    assert.equal(search?.priceStatus, "free_with_quota");
    assert.equal(ads?.priceStatus, "unknown");
    assert.equal(cohortRetention([], now).rows.length, 0);
  });
});
