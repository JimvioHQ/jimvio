import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { explicitReengagementChoice, explicitReengagementGranted, explicitReengagementWrite } from "../../notifications/explicit-consent";
import { buildDraft } from "./content";
import { classifyPublishResult, DELIVERY_LEASE_MS, deliverFollowupLocked, deliveryKey, inAppFollowupNotification, publishAttemptKey } from "./delivery";
import { consentFromStoredPreferences, planFollowup } from "./followups";
import { claimBounded, claimOrFilter, classifyLock, extendLockUntil, MemoryEngineStore } from "./lock";
import { applyLowRiskDecision, bindApproval, evaluateAction } from "./policy";
import { createInitialState, trimState } from "./state";
import type { Approval, EngineState, FollowupPlan, Opportunity, RiskClass } from "./types";

const now = new Date("2026-10-25T12:00:00.000Z");
const userId = "11111111-1111-4111-8111-111111111111";
const quiet = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
const granted = { marketingConsent: true, unsubscribed: false, reengagementAllowed: true };

function deliverGranted(input: Parameters<typeof deliverFollowupLocked>[0]) {
  return deliverFollowupLocked({ freshConsent: granted, ...input });
}

function running(overrides: Partial<EngineState> = {}): EngineState {
  return { ...createInitialState(now), status: "running", pausedReason: "Running.", ...overrides };
}

function consentedPlan(overrides: Partial<FollowupPlan> = {}): FollowupPlan {
  return {
    ...planFollowup({
      userId,
      trigger: "incomplete_onboarding",
      classification: "marketing",
      marketingConsent: true,
      unsubscribed: false,
      reengagementAllowed: true,
      audienceCount: 1,
      approved: false,
      now,
    }),
    ...overrides,
  };
}

function approvalFor(plan: FollowupPlan, overrides: Partial<Approval> = {}): Approval {
  return {
    id: "approval-1",
    riskClass: "followup_delivery",
    subjectId: plan.id,
    approverId: "admin-1",
    approvedAt: now.toISOString(),
    expiresAt: "2026-10-26T12:00:00.000Z",
    note: "one in-app follow-up",
    parameters: {
      userId: plan.userId,
      trigger: plan.trigger,
      classification: "marketing",
      audienceCount: 1,
      marketingConsent: true,
      unsubscribed: false,
      reengagementAllowed: true,
    },
    usesRemaining: 1,
    usedAt: null,
    ...overrides,
  };
}

function readyState(): EngineState {
  const plan = consentedPlan();
  return running({ followups: [plan], approvals: [approvalFor(plan)] });
}

describe("growth engine concurrency", () => {
  it("lets only one overlapping worker own the lock and the side effect", async () => {
    const store = new MemoryEngineStore(readyState());
    let sends = 0;
    const run = (owner: string) => deliverGranted({
      store,
      owner,
      now,
      followupId: consentedPlan().id,
      env: quiet,
      notify: async () => {
        sends += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    const results = await Promise.all([run("owner-a"), run("owner-b")]);
    assert.equal(sends, 1);
    assert.equal(results.filter((result) => result.notified).length, 1);
    const saved = await store.read();
    assert.equal(saved?.lock, null);
    assert.equal(saved?.followups.filter((item) => item.sent).length, 1);
    assert.ok(store.events.some((item) => item.outcome === "acquired" || item.outcome === "expired_recovered"));
    assert.ok(store.events.some((item) => item.outcome === "contended" || item.outcome === "released"));
  });

  it("does not repeat a side effect when the same job is retried", async () => {
    const store = new MemoryEngineStore(readyState());
    let sends = 0;
    const notify = async () => {
      sends += 1;
      return { ok: true };
    };
    const first = await deliverGranted({
      store,
      owner: "owner-a",
      now,
      followupId: consentedPlan().id,
      env: quiet,
      notify,
      sleep: async () => undefined,
    });
    const second = await deliverGranted({
      store,
      owner: "owner-b",
      now,
      followupId: consentedPlan().id,
      env: quiet,
      notify,
      sleep: async () => undefined,
    });
    assert.equal(first.notified, true);
    assert.equal(second.notified, false);
    assert.equal(sends, 1);
    const saved = await store.read();
    assert.equal(saved?.approvals[0]?.usesRemaining, 0);
    assert.ok(saved?.completedKeys.includes(deliveryKey(consentedPlan().id)));
  });

  it("rejects a stale owner releasing or writing a newer lock", async () => {
    const store = new MemoryEngineStore(running());
    const first = await store.claim({ owner: "owner-a", now, ttlMs: 1_000, snapshot: running() });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const later = new Date(now.getTime() + 5_000);
    const current = await store.read();
    assert.ok(current);
    const second = await store.claim({ owner: "owner-b", now: later, ttlMs: 5_000, snapshot: current });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.outcome, "expired_recovered");
    const staleRelease = await store.release({ hold: first.hold, now: later, next: first.state });
    const staleWrite = await store.writeHeld({ hold: first.hold, now: later, next: first.state, extendMs: 1_000 });
    assert.equal(staleRelease.ok, false);
    assert.equal(staleWrite.ok, false);
    const saved = await store.read();
    assert.equal(saved?.lock?.owner, "owner-b");
    assert.equal(saved?.lock?.token, second.hold.token);
    assert.ok(store.events.some((item) => item.outcome === "stale_release_rejected"));
    assert.ok(store.events.some((item) => item.outcome === "expired_recovered"));
  });

  it("records an audit when notification fails and does not retry the send", async () => {
    const store = new MemoryEngineStore(readyState());
    let sends = 0;
    const failed = await deliverGranted({
      store,
      owner: "owner-a",
      now,
      followupId: consentedPlan().id,
      env: quiet,
      notify: async () => {
        sends += 1;
        return { ok: false, reason: "In-app delivery did not succeed. No email was attempted." };
      },
      sleep: async () => undefined,
    });
    const retry = await deliverGranted({
      store,
      owner: "owner-b",
      now,
      followupId: consentedPlan().id,
      env: quiet,
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(failed.ok, false);
    assert.equal(failed.status, 502);
    assert.equal(retry.notified, false);
    assert.equal(sends, 1);
    const saved = await store.read();
    assert.ok(saved?.audit.some((item) => item.outcome === "error" && item.detail.includes("did not succeed")));
    assert.equal(saved?.followups[0]?.sent, false);
    assert.equal(saved?.lock, null);
  });

  it("stays paused when the kill switch is on, even with a queued approval", async () => {
    const store = new MemoryEngineStore(readyState());
    let sends = 0;
    const result = await deliverGranted({
      store,
      owner: "queued-job",
      now,
      followupId: consentedPlan().id,
      env: { ...quiet, GROWTH_ENGINE_KILL: "1" },
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(result.notified, false);
    assert.equal(sends, 0);
    assert.match(result.error ?? "", /kill switch/i);
    const saved = await store.read();
    assert.equal(saved?.lock, null);
    assert.equal(saved?.approvals[0]?.usesRemaining, 1);
    assert.equal(evaluateAction(readyState(), "followup_delivery", consentedPlan().id, now, { GROWTH_ENGINE_KILL: "paused" }).allowed, false);
  });

  it("keeps prohibited actions blocked when approval data is present", () => {
    const risks: RiskClass[] = ["paid_spend", "reward_issue", "bulk_message", "production_change"];
    for (const riskClass of risks) {
      const state = running({
        approvals: [{
          ...approvalFor(consentedPlan()),
          riskClass,
          subjectId: "subject",
          parameters: { userId, audienceCount: 1, marketingConsent: true },
        }],
      });
      assert.equal(evaluateAction(state, riskClass, "subject", now).allowed, false);
      const bound = bindApproval({ state, riskClass, subjectId: "subject", approverId: "admin-1", now, hours: 24 });
      assert.equal(bound.ok, false);
    }
    const opportunity = { id: "seo-home" } as Opportunity;
    const draft = buildDraft({ opportunity, path: "/", title: "Home", facts: ["Home exists."], now });
    const logged = applyLowRiskDecision(running({
      drafts: [draft],
      approvals: [{
        ...approvalFor(consentedPlan()),
        riskClass: "publish_low_risk",
        subjectId: draft.id,
        parameters: { draftId: draft.id, channel: draft.channel, path: draft.path },
      }],
    }), draft.id, now);
    assert.equal(logged.ok, false);
    assert.equal(logged.state.drafts[0]?.appliedToSite, false);
    assert.equal(logged.state.approvals[0]?.usesRemaining, 1);
  });

  it("requires stored consent and a matching one-time approval before marketing follow-up", async () => {
    assert.equal(consentFromStoredPreferences(null).marketingConsent, false);
    assert.equal(consentFromStoredPreferences(null).reason, "missing");
    assert.equal(consentFromStoredPreferences({ email_reengagement: true, email_enabled: true }).marketingConsent, false);
    assert.equal(consentFromStoredPreferences({
      email_reengagement: true,
      email_enabled: true,
      updated_at: now.toISOString(),
      user_id: userId,
    }, userId).reason, "unproven");
    assert.equal(consentFromStoredPreferences({
      email_reengagement: false,
      email_enabled: true,
      updated_at: now.toISOString(),
      email_reengagement_explicit_at: now.toISOString(),
      user_id: userId,
    }, userId).reason, "revoked");
    assert.equal(consentFromStoredPreferences({
      email_reengagement: true,
      email_enabled: false,
      updated_at: now.toISOString(),
      email_reengagement_explicit_at: now.toISOString(),
      user_id: userId,
    }, userId).unsubscribed, true);
    assert.equal(consentFromStoredPreferences({
      email_reengagement: true,
      email_enabled: true,
      updated_at: now.toISOString(),
      email_reengagement_explicit_at: now.toISOString(),
      user_id: userId,
    }, userId).marketingConsent, true);

    const blocked = planFollowup({
      userId,
      trigger: "incomplete_onboarding",
      classification: "marketing",
      ...consentFromStoredPreferences(null),
      audienceCount: 1,
      approved: true,
      now,
    });
    assert.equal(blocked.status, "blocked");
    const store = new MemoryEngineStore(running({
      followups: [blocked],
      approvals: [approvalFor(consentedPlan(), { subjectId: blocked.id })],
    }));
    let sends = 0;
    const result = await deliverGranted({
      store,
      owner: "owner-a",
      now,
      followupId: blocked.id,
      env: quiet,
      freshConsent: consentFromStoredPreferences(null),
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(result.notified, false);
    assert.equal(sends, 0);

    const mismatched = readyState();
    mismatched.approvals = [approvalFor(consentedPlan(), { parameters: { ...approvalFor(consentedPlan()).parameters, userId: "22222222-2222-4222-8222-222222222222" } })];
    const mismatchStore = new MemoryEngineStore(mismatched);
    const mismatch = await deliverGranted({
      store: mismatchStore,
      owner: "owner-a",
      now,
      followupId: consentedPlan().id,
      env: quiet,
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(mismatch.notified, false);
    assert.equal(sends, 0);
  });

  it("serializes the first insert and quotes the claim predicate", async () => {
    const store = new MemoryEngineStore(null);
    const [first, second] = await Promise.all([
      store.insertClaim({ owner: "owner-a", now, ttlMs: 1_000, initial: createInitialState(now), actorId: null }),
      store.insertClaim({ owner: "owner-b", now, ttlMs: 1_000, initial: createInitialState(now), actorId: null }),
    ]);
    assert.equal([first.ok, second.ok].filter(Boolean).length, 1);
    const saved = await store.read();
    assert.equal(saved?.revision, 1);
    assert.ok(saved?.lock?.owner === "owner-a" || saved?.lock?.owner === "owner-b");
    const filter = claimOrFilter("owner-a", now.toISOString());
    assert.match(filter, /until\.lte\."2026-10-25T12:00:00\.000Z"/);
    assert.equal(classifyLock({ owner: "other", token: "held", until: now.toISOString() }, "new-owner", now), "expired");
    assert.equal(filter.includes("2026-10-25T12:00:00.000Z,"), false);

    const bounded = new MemoryEngineStore(running({ lock: { owner: "other", token: "held", until: "2026-10-25T12:00:30.000Z" } }));
    const lost = await claimBounded(bounded, {
      owner: "new-owner",
      now,
      ttlMs: 1_000,
      insertFrom: createInitialState(now),
      actorId: null,
      sleep: async () => undefined,
    });
    assert.equal(lost.ok, false);
    assert.ok(bounded.events.filter((item) => item.outcome === "contended").length >= 1);
    assert.ok(bounded.events.length < 10);
  });
});

function storedConsent(user = userId, overrides: Record<string, unknown> = {}) {
  return consentFromStoredPreferences({
    user_id: user,
    email_reengagement: true,
    email_enabled: true,
    updated_at: now.toISOString(),
    email_reengagement_explicit_at: now.toISOString(),
    ...overrides,
  }, userId);
}

describe("growth engine delivery safety", () => {
  it("does not shorten a 20 second claim when the extend is 15 seconds", async () => {
    const original = new Date(now.getTime() + 20_000).toISOString();
    assert.equal(extendLockUntil(original, now, 15_000), original);
    const later = new Date(now.getTime() + 10_000);
    assert.equal(extendLockUntil(original, later, 20_000), new Date(later.getTime() + 20_000).toISOString());

    const store = new MemoryEngineStore(running());
    const snapshot = await store.read();
    assert.ok(snapshot);
    const claim = await store.claim({ owner: "owner-a", now, ttlMs: 20_000, snapshot });
    assert.equal(claim.ok, true);
    if (!claim.ok) return;
    const written = await store.writeHeld({ hold: claim.hold, now, next: claim.state, extendMs: 15_000 });
    assert.equal(written.ok, true);
    if (!written.ok) return;
    assert.equal(written.state.lock?.until, claim.state.lock?.until);
    assert.ok(Date.parse(written.state.lock?.until ?? "") >= now.getTime() + 20_000);
  });

  it("keeps the pre-notify lease at least as long as the original claim", async () => {
    const store = new MemoryEngineStore(readyState());
    let seen = 0;
    const result = await deliverFollowupLocked({
      store,
      owner: "owner-lease",
      now,
      followupId: consentedPlan().id,
      env: quiet,
      freshConsent: granted,
      notify: async () => {
        const mid = await store.read();
        seen = Date.parse(mid?.lock?.until ?? "");
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(result.notified, true);
    assert.ok(seen >= now.getTime() + DELIVERY_LEASE_MS);
    const deliverySource = readFileSync(new URL("./delivery.ts", import.meta.url), "utf8");
    const supabaseSource = readFileSync(new URL("../../../services/growth/engine-lock.ts", import.meta.url), "utf8");
    const pgSource = readFileSync(new URL("./pg-lock-store.ts", import.meta.url), "utf8");
    const controlSource = readFileSync(new URL("../../../services/growth/engine-control.ts", import.meta.url), "utf8");
    assert.match(deliverySource, /extendMs: DELIVERY_LEASE_MS/);
    assert.equal(deliverySource.includes("15_000"), false);
    assert.match(supabaseSource, /extendLockUntil\(input\.next\.lock\?\.until/);
    assert.match(pgSource, /extendLockUntil\(input\.next\.lock\?\.until/);
    assert.match(controlSource, /inAppFollowupNotification\(plan\)/);
    assert.match(controlSource, /lookup: lookupFollowupNotification/);
    assert.equal(controlSource.includes("groupKey"), false);
    assert.equal(controlSource.includes("force:"), false);
  });

  it("classifies provider results and builds an idempotent in-app payload", () => {
    assert.equal(classifyPublishResult({ ok: true }), "inserted");
    assert.equal(classifyPublishResult({ ok: true, skipped: true, reason: "duplicate_event_key" }), "already_present");
    assert.equal(classifyPublishResult({ ok: false, reason: "category_disabled" }), "refused");
    assert.equal(classifyPublishResult({ ok: false, reason: "user_rate_limited" }), "not_inserted");
    assert.equal(classifyPublishResult({ ok: false, reason: "duplicate_unconfirmed" }), "ambiguous");
    assert.equal(classifyPublishResult({ ok: false, reason: "insert_failed" }), "ambiguous");
    assert.equal(classifyPublishResult(null), "ambiguous");
    assert.equal(classifyPublishResult(undefined), "ambiguous");
    const note = inAppFollowupNotification(consentedPlan());
    assert.equal(note.eventKey, `growth-followup:${consentedPlan().id}`);
    assert.equal("email" in note, false);
    assert.equal("groupKey" in note, false);
    assert.equal("force" in note, false);
    assert.equal(explicitReengagementChoice(undefined, undefined), false);
    assert.equal(explicitReengagementChoice(true, undefined), true);
    assert.equal(explicitReengagementChoice(true, false), false);
    assert.equal(explicitReengagementChoice(false, true), true);
    const kept = explicitReengagementWrite({
      storedValue: true,
      storedExplicitAt: null,
      patch: undefined,
      now,
    });
    assert.equal(kept.email_reengagement, true);
    assert.equal(kept.email_reengagement_explicit_at, null);
    assert.equal(explicitReengagementGranted({ email_reengagement: true, email_reengagement_explicit_at: null }), false);
    const grantedWrite = explicitReengagementWrite({
      storedValue: true,
      storedExplicitAt: null,
      patch: true,
      now,
    });
    assert.equal(grantedWrite.email_reengagement, true);
    assert.equal(grantedWrite.email_reengagement_explicit_at, now.toISOString());
    assert.equal(explicitReengagementGranted(grantedWrite), true);
    const trimmed = trimState(running({
      completedKeys: ["note", deliveryKey("a"), publishAttemptKey("a", 1), "publish-result:a:ambiguous"],
    }));
    assert.ok(trimmed.completedKeys.includes(deliveryKey("a")));
    assert.ok(trimmed.completedKeys.includes(publishAttemptKey("a", 1)));
    assert.ok(trimmed.completedKeys.includes("publish-result:a:ambiguous"));
  });

  it("fails closed when consent is missing, unreadable, or belongs to someone else", async () => {
    const plan = consentedPlan();
    const missingStore = new MemoryEngineStore(readyState());
    let sends = 0;
    const missing = await deliverFollowupLocked({
      store: missingStore,
      owner: "owner-missing",
      now,
      followupId: plan.id,
      env: quiet,
      loadConsent: async () => consentFromStoredPreferences(null),
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(missing.notified, false);
    assert.equal(sends, 0);
    const missingSaved = await missingStore.read();
    assert.equal(missingSaved?.approvals[0]?.usesRemaining, 1);
    assert.equal(missingSaved?.completedKeys.includes(deliveryKey(plan.id)), false);
    assert.equal(missingSaved?.audit.some((entry) => entry.outcome === "blocked" && entry.detail.includes("missing preference")), true);

    const unreadStore = new MemoryEngineStore(readyState());
    const unread = await deliverFollowupLocked({
      store: unreadStore,
      owner: "owner-unread",
      now,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.match(unread.error ?? "", /could not be confirmed/i);
    assert.equal((await unreadStore.read())?.audit.some((entry) => entry.outcome === "error" && entry.detail.includes("could not be confirmed")), true);
    assert.equal((await unreadStore.read())?.audit.some((entry) => entry.detail.includes("db down")), false);

    const thrownStore = new MemoryEngineStore(readyState());
    const thrown = await deliverFollowupLocked({
      store: thrownStore,
      owner: "owner-thrown",
      now,
      followupId: plan.id,
      env: quiet,
      loadConsent: async () => {
        throw new Error("db down: secret preference row");
      },
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.match(thrown.error ?? "", /could not be confirmed/i);
    const thrownSaved = await thrownStore.read();
    assert.equal(thrownSaved?.approvals[0]?.usesRemaining, 1);
    assert.equal(thrownSaved?.audit.some((entry) => entry.detail.includes("secret")), false);
    assert.equal(thrownSaved?.audit.some((entry) => entry.outcome === "error"), true);

    const mismatchStore = new MemoryEngineStore(readyState());
    const mismatch = await deliverFollowupLocked({
      store: mismatchStore,
      owner: "owner-mismatch",
      now,
      followupId: plan.id,
      env: quiet,
      loadConsent: async () => storedConsent("22222222-2222-4222-8222-222222222222"),
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(mismatch.notified, false);
    assert.equal((await mismatchStore.read())?.audit.some((entry) => entry.detail.includes("does not belong")), true);
    assert.equal(sends, 0);

    const defaultStore = new MemoryEngineStore(readyState());
    const historicalDefault = await deliverFollowupLocked({
      store: defaultStore,
      owner: "owner-default-true",
      now,
      followupId: plan.id,
      env: quiet,
      loadConsent: async () => consentFromStoredPreferences({
        user_id: userId,
        email_reengagement: true,
        email_enabled: true,
        updated_at: now.toISOString(),
      }, userId),
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(historicalDefault.notified, false);
    assert.equal(historicalDefault.outcome, "not_sent");
    const defaultSaved = await defaultStore.read();
    assert.equal(defaultSaved?.approvals[0]?.usesRemaining, 1);
    assert.equal(defaultSaved?.completedKeys.includes(deliveryKey(plan.id)), false);
    assert.equal(defaultSaved?.audit.some((entry) => entry.detail.includes("database default is not consent")), true);
    assert.equal(sends, 0);
  });

  it("rechecks consent immediately before notify and allows one later send after opt-in", async () => {
    const plan = consentedPlan();
    const store = new MemoryEngineStore(readyState());
    let sends = 0;
    let calls = 0;
    const first = await deliverFollowupLocked({
      store,
      owner: "owner-revoke",
      now,
      followupId: plan.id,
      env: quiet,
      loadConsent: async () => {
        calls += 1;
        return calls === 1
          ? storedConsent()
          : { marketingConsent: false, unsubscribed: true, reengagementAllowed: false, reason: "revoked" as const };
      },
      lookup: async () => "absent",
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(first.notified, false);
    assert.equal(sends, 0);
    const claimed = await store.read();
    assert.equal(claimed?.completedKeys.includes(deliveryKey(plan.id)), true);
    assert.equal(claimed?.approvals[0]?.usesRemaining, 0);
    assert.equal(claimed?.audit.some((entry) => entry.outcome === "blocked" && entry.detail.includes("unsubscribed")), true);

    const second = await deliverFollowupLocked({
      store,
      owner: "owner-opt-in",
      now,
      followupId: plan.id,
      env: quiet,
      loadConsent: async () => storedConsent(),
      lookup: async () => "absent",
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(second.notified, true);
    assert.equal(sends, 1);
    const third = await deliverFollowupLocked({
      store,
      owner: "owner-opt-in-retry",
      now,
      followupId: plan.id,
      env: quiet,
      loadConsent: async () => storedConsent(),
      lookup: async () => "absent",
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(third.notified, false);
    assert.equal(sends, 1);
  });

  it("sends once after a crash before the claim and once more only when absence is proved", async () => {
    const plan = consentedPlan();
    const before = new MemoryEngineStore(readyState());
    const snapshot = await before.read();
    assert.ok(snapshot);
    const claim = await before.claim({ owner: "owner-crash", now, ttlMs: DELIVERY_LEASE_MS, snapshot });
    assert.equal(claim.ok, true);
    if (!claim.ok) return;
    assert.equal((await before.release({ hold: claim.hold, now, next: claim.state })).ok, true);
    let sends = 0;
    const retried = await deliverFollowupLocked({
      store: before,
      owner: "owner-crash-retry",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(retried.notified, true);
    assert.equal(sends, 1);

    const seeded = readyState();
    seeded.completedKeys = [deliveryKey(plan.id), publishAttemptKey(plan.id, 1)];
    seeded.approvals = [{ ...seeded.approvals[0], usesRemaining: 0, usedAt: now.toISOString() }];
    const after = new MemoryEngineStore(seeded);
    const recovered = await deliverFollowupLocked({
      store: after,
      owner: "owner-after",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      lookup: async () => "absent",
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(recovered.notified, true);
    assert.equal(sends, 2);
    const stopped = await deliverFollowupLocked({
      store: after,
      owner: "owner-after-stop",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      lookup: async () => "absent",
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(stopped.notified, false);
    assert.equal(sends, 2);
  });

  it("does not resend a timeout, an unknown lookup, or a provider refusal", async () => {
    const plan = consentedPlan();
    const timed = new MemoryEngineStore(readyState());
    let sends = 0;
    const failed = await deliverFollowupLocked({
      store: timed,
      owner: "owner-timeout",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      notify: async () => {
        sends += 1;
        throw new Error("timeout talking to provider");
      },
      sleep: async () => undefined,
    });
    assert.equal(failed.status, 502);
    assert.equal(failed.notified, false);
    const failedSaved = await timed.read();
    assert.equal(failedSaved?.audit.some((entry) => entry.outcome === "error" && entry.detail.includes("did not succeed")), true);
    assert.equal(failedSaved?.audit.some((entry) => entry.detail.includes("timeout talking")), false);
    const timedRetry = await deliverFollowupLocked({
      store: timed,
      owner: "owner-timeout-retry",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(timedRetry.notified, false);
    assert.match(timedRetry.error ?? "", /already claimed/i);
    assert.equal(sends, 1);

    const limited = new MemoryEngineStore(readyState());
    await deliverFollowupLocked({
      store: limited,
      owner: "owner-limit",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      notify: async () => {
        sends += 1;
        return { ok: false, reason: "user_rate_limited" };
      },
      sleep: async () => undefined,
    });
    const unknown = await deliverFollowupLocked({
      store: limited,
      owner: "owner-unknown",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      lookup: async () => {
        throw new Error("lookup failed");
      },
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(unknown.notified, false);
    assert.equal(sends, 2);
    const again = await deliverFollowupLocked({
      store: limited,
      owner: "owner-absent",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      lookup: async () => "absent",
      notify: async () => {
        sends += 1;
        return { ok: false, reason: "actor_rate_limited" };
      },
      sleep: async () => undefined,
    });
    assert.equal(again.notified, false);
    assert.equal(sends, 3);
    const capped = await deliverFollowupLocked({
      store: limited,
      owner: "owner-capped",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      lookup: async () => "absent",
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(capped.notified, false);
    assert.equal((await limited.read())?.audit.some((entry) => entry.detail.includes("attempt limit")), true);
    assert.equal(sends, 3);

    const refused = new MemoryEngineStore(readyState());
    await deliverFollowupLocked({
      store: refused,
      owner: "owner-refused",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      notify: async () => ({ ok: false, reason: "category_disabled" }),
      sleep: async () => undefined,
    });
    const refusedRetry = await deliverFollowupLocked({
      store: refused,
      owner: "owner-refused-retry",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      lookup: async () => "absent",
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(refusedRetry.notified, false);
    assert.equal((await refused.read())?.audit.some((entry) => entry.detail.includes("refused")), true);
    assert.equal(sends, 3);
  });

  it("reconciles a delayed insert without a second notification", async () => {
    const plan = consentedPlan();
    const store = new MemoryEngineStore(readyState());
    let sends = 0;
    const ambiguous = await deliverFollowupLocked({
      store,
      owner: "owner-delayed",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      lookup: async () => "unknown",
      notify: async () => {
        sends += 1;
        return { ok: false, reason: "provider result was ambiguous" };
      },
      sleep: async () => undefined,
    });
    assert.equal(ambiguous.notified, false);
    assert.equal(ambiguous.status, 502);
    assert.equal((await store.read())?.followups[0]?.sent, false);
    assert.equal((await store.read())?.audit.some((entry) => entry.detail.includes("cannot send a second message")), true);

    const reconciled = await deliverFollowupLocked({
      store,
      owner: "owner-delayed-found",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      lookup: async () => "present",
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(reconciled.ok, true);
    assert.equal(reconciled.notified, false);
    assert.equal(reconciled.outcome, "reconciled");
    assert.equal(sends, 1);
    const saved = await store.read();
    assert.equal(saved?.followups[0]?.sent, true);
    assert.equal(saved?.followups[0]?.status, "sent_in_app");
    assert.equal(saved?.audit.some((entry) => entry.detail.includes("Reconciled an existing in-app notification")), true);
  });

  it("marks a same-call duplicate as already delivered and does not notify again", async () => {
    const plan = consentedPlan();
    const store = new MemoryEngineStore(readyState());
    let sends = 0;
    const first = await deliverFollowupLocked({
      store,
      owner: "owner-dup",
      now,
      followupId: plan.id,
      env: quiet,
      freshConsent: granted,
      lookup: async () => "present",
      notify: async () => {
        sends += 1;
        return { ok: false, reason: "duplicate_unconfirmed" };
      },
      sleep: async () => undefined,
    });
    assert.equal(first.outcome, "reconciled");
    assert.equal(first.notified, false);
    assert.equal(sends, 1);
    assert.equal((await store.read())?.followups[0]?.sent, true);
  });

  it("does not notify after the kill switch stops a claimed follow-up", async () => {
    const plan = consentedPlan();
    const store = new MemoryEngineStore(readyState());
    const env = { ...quiet, GROWTH_ENGINE_KILL: "" } as NodeJS.ProcessEnv;
    const armed: MemoryEngineStore = store;
    const wrapped = {
      read: () => armed.read(),
      claim: (input: Parameters<MemoryEngineStore["claim"]>[0]) => armed.claim(input),
      insertClaim: (input: Parameters<MemoryEngineStore["insertClaim"]>[0]) => armed.insertClaim(input),
      writeHeld: async (input: Parameters<MemoryEngineStore["writeHeld"]>[0]) => {
        const written = await armed.writeHeld(input);
        env.GROWTH_ENGINE_KILL = "1";
        return written;
      },
      release: (input: Parameters<MemoryEngineStore["release"]>[0]) => armed.release(input),
    };
    let sends = 0;
    const killed = await deliverFollowupLocked({
      store: wrapped,
      owner: "owner-kill",
      now,
      followupId: plan.id,
      env,
      freshConsent: granted,
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(killed.notified, false);
    assert.match(killed.error ?? "", /kill switch/i);
    assert.equal((await store.read())?.audit.some((entry) => entry.detail.includes("Notification was not sent")), true);
    env.GROWTH_ENGINE_KILL = "";
    const retry = await deliverFollowupLocked({
      store,
      owner: "owner-kill-retry",
      now,
      followupId: plan.id,
      env,
      freshConsent: granted,
      lookup: async () => "absent",
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(retry.notified, false);
    assert.equal(sends, 0);
    assert.equal((await store.read())?.audit.some((entry) => /kill switch stopped/i.test(entry.detail)), true);
  });
});
