import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { Pool, type PoolClient } from "pg";
import { deliverFollowupLocked, deliveryKey } from "./delivery";
import { consentFromStoredPreferences, planFollowup } from "./followups";
import { claimBounded, type EngineLockStore } from "./lock";
import { createPgPoolStore, GROWTH_LOCK_HOLD_SQL, GROWTH_LOCK_INSERT_SQL, prepareClaim, type ClaimStatement } from "./pg-lock-store";
import { consumeApproval } from "./policy";
import { createInitialState, parseEngineState } from "./state";
import type { Approval, EngineState, FollowupPlan } from "./types";

const PRODUCTION_SLUG = "jimvio-growth-engine";
const databaseUrl = process.env.GROWTH_LOCK_TEST_DATABASE_URL ?? "";
const postgrestUrl = process.env.GROWTH_LOCK_TEST_POSTGREST_URL ?? "";
const now = new Date("2026-10-25T12:00:00.000Z");
const userId = "11111111-1111-4111-8111-111111111111";
const quiet = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
const grantedConsent = { marketingConsent: true, unsubscribed: false, reengagementAllowed: true };

function deliverGranted(input: Parameters<typeof deliverFollowupLocked>[0]) {
  return deliverFollowupLocked({ freshConsent: grantedConsent, ...input });
}

function assertSafeDatabaseUrl(raw: string): void {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("GROWTH_LOCK_TEST_DATABASE_URL is not a URL.");
  }
  const host = parsed.hostname;
  const local = host === "127.0.0.1" || host === "localhost";
  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!local || raw.toLowerCase().includes("supabase") || parsed.port !== "55432" || name !== "jimvio_growth_lock_test") {
    throw new Error("Refusing growth lock test: the database is not the isolated local cluster.");
  }
}

if (databaseUrl) assertSafeDatabaseUrl(databaseUrl);
if (postgrestUrl) {
  const parsed = new URL(postgrestUrl);
  if ((parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") || postgrestUrl.toLowerCase().includes("supabase")) {
    throw new Error("Refusing growth lock test: PostgREST host is not local.");
  }
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

function pausedReady(): EngineState {
  const plan = consentedPlan();
  return { ...createInitialState(now), followups: [plan], approvals: [approvalFor(plan)] };
}

let pool: Pool | undefined;
let sequence = 0;

function db(): Pool {
  if (!pool) throw new Error("Postgres test pool is not open.");
  return pool;
}

function nextSlug(label: string): string {
  sequence += 1;
  const slug = `lock-test-${label}-${sequence}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (slug === PRODUCTION_SLUG || slug.includes("jimvio-growth")) throw new Error("Refusing the production growth slug.");
  return slug;
}

async function createLockTable(): Promise<void> {
  await db().query("DROP TABLE IF EXISTS public.growth_campaigns");
  await db().query(`
    CREATE TABLE public.growth_campaigns (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
      channel text NOT NULL,
      starts_at timestamptz,
      ends_at timestamptz,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function seed(slug: string, state: EngineState): Promise<void> {
  await db().query(
    `INSERT INTO public.growth_campaigns (name, slug, channel, status, metadata)
     VALUES ('lock test isolated', $1, 'internal', $2, $3::jsonb)`,
    [slug, state.status === "running" ? "active" : "paused", JSON.stringify(state)],
  );
}

async function seedRaw(slug: string, metadata: unknown): Promise<void> {
  await db().query(
    `INSERT INTO public.growth_campaigns (name, slug, channel, status, metadata)
     VALUES ('lock test isolated', $1, 'internal', 'paused', $2::jsonb)`,
    [slug, JSON.stringify(metadata)],
  );
}

async function persisted(slug: string): Promise<EngineState> {
  const result = await db().query("SELECT metadata, status FROM public.growth_campaigns WHERE slug = $1", [slug]);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].status, "paused");
  const parsed = parseEngineState(result.rows[0].metadata);
  assert.ok(parsed, "stored metadata should stay readable");
  return parsed;
}

async function metadataUnchanged(slug: string, original: unknown): Promise<void> {
  const result = await db().query(
    "SELECT metadata = $2::jsonb AS same, status FROM public.growth_campaigns WHERE slug = $1",
    [slug, JSON.stringify(original)],
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].same, true);
  assert.equal(result.rows[0].status, "paused");
}

async function claimWhileHolding(client: PoolClient, prepared: ClaimStatement): Promise<unknown[]> {
  await client.query("BEGIN");
  try {
    const updated = await client.query(prepared.sql, prepared.params);
    await client.query("SELECT pg_sleep(0.4)");
    await client.query("COMMIT");
    return updated.rows;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* the transaction is already closed */ }
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "unknown";
    throw new Error(`Overlapping claim failed (${code}).`);
  }
}

describe("postgres growth lock", databaseUrl ? {} : { skip: "GROWTH_LOCK_TEST_DATABASE_URL is unset" }, () => {
  before(async () => {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 6,
      statement_timeout: 15_000,
      lock_timeout: 10_000,
      connectionTimeoutMillis: 5_000,
      application_name: "jimvio-growth-lock-test",
    });
    const identity = await pool.query(`
      SELECT current_database() AS database,
             current_setting('server_version') AS version,
             host(inet_server_addr()) AS addr,
             inet_server_port() AS port
    `);
    const row = identity.rows[0];
    assert.equal(row.database, "jimvio_growth_lock_test");
    assert.equal(String(row.port), "55432");
    assert.equal(row.addr, "127.0.0.1");
    writeFileSync("/tmp/jimvio-growth-lock-proof.txt", `version=${row.version}\naddr=${row.addr}\nport=${row.port}\ndatabase=${row.database}\n`);
    await createLockTable();
  });

  after(async () => {
    if (!pool) return;
    await pool.query("DROP TABLE IF EXISTS public.notifications");
    await pool.query("DROP TABLE IF EXISTS public.growth_campaigns");
    await pool.end();
    pool = undefined;
  });

  it("lets one overlapping transaction win and identifies that winner from RETURNING", async () => {
    const slug = nextSlug("overlap");
    const initial = createInitialState(now);
    await seed(slug, initial);
    const snapshot = await createPgPoolStore(db(), slug).read();
    assert.ok(snapshot);
    const alpha = prepareClaim(slug, { owner: "owner-alpha", now, ttlMs: 30_000, snapshot });
    const beta = prepareClaim(slug, { owner: "owner-beta", now, ttlMs: 30_000, snapshot });
    const clients = [await db().connect(), await db().connect(), await db().connect()];
    try {
      const releaseAttempt = (async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const poison = JSON.stringify({ version: 1, revision: 999, status: "paused", marker: "stale-release-should-not-land" });
        const released = await clients[2].query(GROWTH_LOCK_HOLD_SQL, [
          slug,
          String(snapshot.revision),
          "owner-alpha",
          "not-the-token",
          "paused",
          poison,
        ]);
        return released.rows.length;
      })();
      const [alphaRows, betaRows, staleRows] = await Promise.all([
        claimWhileHolding(clients[0], alpha),
        claimWhileHolding(clients[1], beta),
        releaseAttempt,
      ]);
      const winners = [
        { owner: "owner-alpha", prepared: alpha, rows: alphaRows },
        { owner: "owner-beta", prepared: beta, rows: betaRows },
      ].filter((item) => item.rows.length === 1);
      assert.equal(winners.length, 1);
      assert.equal(staleRows, 0);
      const winner = winners[0];
      const returned = winner.rows[0] as { metadata: { lock?: { owner?: string; token?: string }; revision?: number } };
      assert.equal(returned.metadata.lock?.owner, winner.owner);
      assert.equal(returned.metadata.lock?.token, winner.prepared.token);
      assert.equal(returned.metadata.revision, snapshot.revision + 1);
      const saved = await persisted(slug);
      assert.equal(saved.lock?.owner, winner.owner);
      assert.equal(saved.lock?.token, winner.prepared.token);
      assert.equal(saved.revision, snapshot.revision + 1);
      const loser = winner.owner === "owner-alpha" ? "owner-beta" : "owner-alpha";
      assert.equal(JSON.stringify(saved).includes(loser), false);
      assert.equal(JSON.stringify(saved).includes("stale-release-should-not-land"), false);
    } finally {
      await Promise.all(clients.map((client) => client.release()));
    }
  });

  it("lets one of two pooled claims win and returns that database row", async () => {
    const slug = nextSlug("pooled");
    await seed(slug, createInitialState(now));
    const store = createPgPoolStore(db(), slug);
    const snapshot = await store.read();
    assert.ok(snapshot);
    const [alpha, beta] = await Promise.all([
      store.claim({ owner: "owner-alpha", now, ttlMs: 30_000, snapshot }),
      store.claim({ owner: "owner-beta", now, ttlMs: 30_000, snapshot }),
    ]);
    const wins = [alpha, beta].filter((item) => item.ok);
    assert.equal(wins.length, 1);
    const winner = wins[0];
    assert.equal(winner.ok, true);
    if (!winner.ok) return;
    const saved = await persisted(slug);
    assert.equal(saved.lock?.owner, winner.hold.owner);
    assert.equal(saved.lock?.token, winner.hold.token);
    assert.equal(saved.revision, winner.hold.revision);
    const loser = [alpha, beta].find((item) => !item.ok);
    assert.equal(loser?.ok, false);
    if (loser && !loser.ok) assert.equal(loser.state?.lock?.token, winner.hold.token);
  });

  it("rejects a stale token and a stale owner without changing the row", async () => {
    const slug = nextSlug("stale");
    await seed(slug, createInitialState(now));
    const store = createPgPoolStore(db(), slug);
    const snapshot = await store.read();
    assert.ok(snapshot);
    const claim = await store.claim({ owner: "owner-alpha", now, ttlMs: 30_000, snapshot });
    assert.equal(claim.ok, true);
    if (!claim.ok) return;
    const before = await db().query("SELECT metadata::text AS text FROM public.growth_campaigns WHERE slug = $1", [slug]);
    const staleToken = await store.release({
      hold: { ...claim.hold, token: "stale-token" },
      now,
      next: claim.state,
    });
    const staleOwner = await store.writeHeld({
      hold: { ...claim.hold, owner: "owner-beta" },
      now,
      next: claim.state,
      extendMs: 15_000,
    });
    assert.equal(staleToken.ok, false);
    assert.equal(staleOwner.ok, false);
    const after = await db().query("SELECT metadata::text AS text FROM public.growth_campaigns WHERE slug = $1", [slug]);
    assert.equal(after.rows[0].text, before.rows[0].text);
    const saved = await persisted(slug);
    assert.equal(saved.lock?.token, claim.hold.token);
    assert.equal(saved.lock?.owner, "owner-alpha");
    assert.equal(saved.revision, claim.hold.revision);
  });

  it("recovers an exactly expired lock and keeps a future lock", async () => {
    const expiredSlug = nextSlug("expired");
    const expiredAt = now.toISOString();
    await seed(expiredSlug, {
      ...createInitialState(now),
      revision: 4,
      lock: { owner: "owner-old", token: "old-token", until: expiredAt },
    });
    const expiredStore = createPgPoolStore(db(), expiredSlug);
    const expiredSnapshot = await expiredStore.read();
    assert.ok(expiredSnapshot);
    const recovered = await expiredStore.claim({ owner: "owner-new", now, ttlMs: 10_000, snapshot: expiredSnapshot });
    assert.equal(recovered.ok, true);
    if (!recovered.ok) return;
    assert.equal(recovered.outcome, "expired_recovered");
    const expiredSaved = await persisted(expiredSlug);
    assert.equal(expiredSaved.lock?.owner, "owner-new");
    assert.equal(expiredSaved.revision, 5);
    const oldRelease = await expiredStore.release({
      hold: { owner: "owner-old", token: "old-token", revision: 4 },
      now,
      next: expiredSaved,
    });
    assert.equal(oldRelease.ok, false);
    assert.equal((await persisted(expiredSlug)).lock?.token, recovered.hold.token);

    const heldSlug = nextSlug("held");
    const until = new Date(now.getTime() + 30_000).toISOString();
    await seed(heldSlug, {
      ...createInitialState(now),
      revision: 2,
      lock: { owner: "owner-old", token: "held-token", until },
    });
    const heldStore = createPgPoolStore(db(), heldSlug);
    const heldSnapshot = await heldStore.read();
    assert.ok(heldSnapshot);
    const blocked = await heldStore.claim({ owner: "owner-new", now, ttlMs: 10_000, snapshot: heldSnapshot });
    assert.equal(blocked.ok, false);
    const heldSaved = await persisted(heldSlug);
    assert.equal(heldSaved.lock?.token, "held-token");
    assert.equal(heldSaved.revision, 2);
    const sleeps: number[] = [];
    const bounded = await claimBounded(heldStore, {
      owner: "owner-new",
      now,
      ttlMs: 1_000,
      insertFrom: createInitialState(now),
      actorId: null,
      sleep: async (ms) => { sleeps.push(ms); },
    });
    assert.equal(bounded.ok, false);
    assert.deepEqual(sleeps, []);
    assert.equal((await persisted(heldSlug)).lock?.until, until);
  });

  it("recovers an abandoned delivery key without sending or accepting the old owner", async () => {
    const slug = nextSlug("abandoned");
    const plan = consentedPlan();
    await seed(slug, pausedReady());
    const store = createPgPoolStore(db(), slug);
    const snapshot = await store.read();
    assert.ok(snapshot);
    const claim = await store.claim({ owner: "owner-old", now, ttlMs: 1_000, snapshot });
    assert.equal(claim.ok, true);
    if (!claim.ok) return;
    const key = deliveryKey(plan.id);
    const written = await store.writeHeld({
      hold: claim.hold,
      now,
      next: {
        ...consumeApproval(claim.state, "approval-1", now),
        completedKeys: [key],
      },
      extendMs: 1_000,
    });
    assert.equal(written.ok, true);
    let sends = 0;
    const later = new Date(now.getTime() + 60_000);
    const recovered = await deliverGranted({
      store,
      owner: "owner-new",
      now: later,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(sends, 0);
    assert.match(recovered.error ?? "", /already claimed/i);
    const stale = await store.release({ hold: claim.hold, now: later, next: claim.state });
    assert.equal(stale.ok, false);
    const saved = await persisted(slug);
    assert.equal(saved.lock?.owner === "owner-old", false);
    assert.equal(saved.completedKeys.includes(key), true);
    assert.equal(saved.followups[0]?.sent, false);
    assert.equal(saved.approvals[0]?.usesRemaining, 0);
  });

  it("does not create a missing row from a claim and rejects a second insert", async () => {
    const missingSlug = nextSlug("missing");
    const store = createPgPoolStore(db(), missingSlug);
    assert.equal(await store.read(), null);
    const missing = await store.claim({
      owner: "owner-alpha",
      now,
      ttlMs: 10_000,
      snapshot: createInitialState(now),
    });
    assert.equal(missing.ok, false);
    const count = await db().query("SELECT count(*)::int AS count FROM public.growth_campaigns WHERE slug = $1", [missingSlug]);
    assert.equal(count.rows[0].count, 0);

    const slug = nextSlug("unique");
    const clients = [await db().connect(), await db().connect()];
    try {
      const insertOnce = async (client: PoolClient, owner: string) => {
        const prepared = prepareClaim(slug, { owner, now, ttlMs: 10_000, snapshot: { ...createInitialState(now), revision: 0 } });
        const metadata = prepared.params[5];
        await client.query("BEGIN");
        try {
          const inserted = await client.query(GROWTH_LOCK_INSERT_SQL, [slug, "paused", metadata, null]);
          await client.query("SELECT pg_sleep(0.25)");
          await client.query("COMMIT");
          return { ok: true as const, rows: inserted.rows.length };
        } catch (error) {
          try { await client.query("ROLLBACK"); } catch { /* already closed */ }
          const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "unknown";
          return { ok: false as const, code };
        }
      };
      const [first, second] = await Promise.all([
        insertOnce(clients[0], "owner-alpha"),
        insertOnce(clients[1], "owner-beta"),
      ]);
      const wins = [first, second].filter((item) => item.ok);
      assert.equal(wins.length, 1);
      assert.equal(wins[0].rows, 1);
      const loser = [first, second].find((item) => !item.ok);
      assert.equal(loser?.ok, false);
      if (loser && !loser.ok) assert.equal(loser.code, "23505");
      const rows = await db().query("SELECT count(*)::int AS count FROM public.growth_campaigns WHERE slug = $1", [slug]);
      assert.equal(rows.rows[0].count, 1);
    } finally {
      await Promise.all(clients.map((client) => client.release()));
    }
  });

  it("leaves unreadable metadata unchanged", async () => {
    const samples = [
      { version: 2, revision: 0, status: "paused", lock: null, marker: "version-marker" },
      { version: 1, revision: 0, status: "corrupted", lock: null, marker: "status-marker" },
      ["not", "an", "object"],
    ];
    for (const original of samples) {
      const slug = nextSlug("unreadable");
      await seedRaw(slug, original);
      const store = createPgPoolStore(db(), slug);
      await assert.rejects(() => store.read(), /unreadable/);
      const claim = await store.claim({
        owner: "owner-should-not-win",
        now,
        ttlMs: 10_000,
        snapshot: createInitialState(now),
      });
      assert.equal(claim.ok, false);
      const insert = await store.insertClaim({
        owner: "owner-should-not-win",
        now,
        ttlMs: 10_000,
        initial: createInitialState(now),
        actorId: null,
      });
      assert.equal(insert.ok, false);
      await metadataUnchanged(slug, original);
    }
  });

  it("bumps the revision on claim and release and rejects the old hold", async () => {
    const slug = nextSlug("revision");
    await seed(slug, createInitialState(now));
    const store = createPgPoolStore(db(), slug);
    const snapshot = await store.read();
    assert.ok(snapshot);
    assert.equal(snapshot.revision, 0);
    const claim = await store.claim({ owner: "owner-alpha", now, ttlMs: 30_000, snapshot });
    assert.equal(claim.ok, true);
    if (!claim.ok) return;
    assert.equal(claim.hold.revision, 1);
    assert.equal((await persisted(slug)).revision, 1);
    const renewed = await store.claim({ owner: "owner-alpha", now, ttlMs: 30_000, snapshot: claim.state });
    assert.equal(renewed.ok, true);
    if (!renewed.ok) return;
    assert.equal(renewed.outcome, "renewed");
    assert.notEqual(renewed.hold.token, claim.hold.token);
    const stale = await store.release({ hold: claim.hold, now, next: renewed.state });
    assert.equal(stale.ok, false);
    assert.equal((await persisted(slug)).lock?.token, renewed.hold.token);
    const released = await store.release({ hold: renewed.hold, now, next: renewed.state });
    assert.equal(released.ok, true);
    if (!released.ok) return;
    assert.equal(released.state.revision, renewed.hold.revision + 1);
    assert.equal(released.state.lock, null);
    const saved = await persisted(slug);
    assert.equal(saved.revision, released.state.revision);
    assert.equal(saved.lock, null);
    assert.match(saved.audit.at(-1)?.detail ?? "", /released/);
    const repeat = await store.release({ hold: renewed.hold, now, next: saved });
    assert.equal(repeat.ok, false);
    assert.equal((await persisted(slug)).revision, saved.revision);
  });

  it("persists a kill switch block without consuming the approval or notifying", async () => {
    const slug = nextSlug("kill");
    const plan = consentedPlan();
    await seed(slug, pausedReady());
    let sends = 0;
    const result = await deliverGranted({
      store: createPgPoolStore(db(), slug),
      owner: "deliver-kill",
      now,
      followupId: plan.id,
      env: { ...quiet, GROWTH_ENGINE_KILL: "1" },
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(sends, 0);
    assert.equal(result.notified, false);
    assert.match(result.error ?? "", /kill switch/i);
    const saved = await persisted(slug);
    assert.equal(saved.status, "paused");
    assert.equal(saved.lock, null);
    assert.equal(saved.approvals[0]?.usesRemaining, 1);
    assert.equal(saved.approvals[0]?.usedAt, null);
    assert.equal(saved.completedKeys.includes(deliveryKey(plan.id)), false);
    assert.equal(saved.audit.some((entry) => entry.outcome === "blocked" && entry.detail.includes("Global kill switch is on.")), true);
  });

  it("sends a consented one-time approval once and blocks a second delivery", async () => {
    const slug = nextSlug("once");
    const plan = consentedPlan();
    await seed(slug, pausedReady());
    const store = createPgPoolStore(db(), slug);
    let sends = 0;
    const notify = async () => {
      sends += 1;
      return { ok: true };
    };
    const first = await deliverGranted({
      store, owner: "deliver-once", now, followupId: plan.id, env: quiet, notify, sleep: async () => undefined,
    });
    const second = await deliverGranted({
      store, owner: "deliver-retry", now, followupId: plan.id, env: quiet, notify, sleep: async () => undefined,
    });
    assert.equal(first.notified, true);
    assert.equal(first.status, 200);
    assert.equal(second.notified, false);
    assert.equal(sends, 1);
    const saved = await persisted(slug);
    assert.equal(saved.followups[0]?.sent, true);
    assert.equal(saved.followups[0]?.status, "sent_in_app");
    assert.equal(saved.approvals[0]?.usesRemaining, 0);
    assert.ok(saved.approvals[0]?.usedAt);
    assert.equal(saved.completedKeys.includes(deliveryKey(plan.id)), true);
    assert.equal(saved.audit.some((entry) => entry.detail === "delivery claim recorded before notification"), true);
    assert.equal(saved.lock, null);
  });

  it("does not notify when stored consent is missing or cannot be read", async () => {
    const missingSlug = nextSlug("consent");
    const plan = consentedPlan();
    await seed(missingSlug, pausedReady());
    let sends = 0;
    const missing = await deliverGranted({
      store: createPgPoolStore(db(), missingSlug),
      owner: "deliver-consent",
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
    const missingSaved = await persisted(missingSlug);
    assert.equal(missingSaved.approvals[0]?.usesRemaining, 1);
    assert.equal(missingSaved.completedKeys.length, 0);
    assert.equal(missingSaved.audit.some((entry) => entry.outcome === "blocked"), true);

    const thrownSlug = nextSlug("consent-error");
    await seed(thrownSlug, pausedReady());
    const thrown = await deliverGranted({
      store: createPgPoolStore(db(), thrownSlug),
      owner: "deliver-consent",
      now,
      followupId: plan.id,
      env: quiet,
      loadConsent: async () => {
        throw new Error("preferences unavailable");
      },
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(thrown.notified, false);
    assert.equal(sends, 0);
    assert.match(thrown.error ?? "", /consent/i);
    const thrownSaved = await persisted(thrownSlug);
    assert.equal(thrownSaved.approvals[0]?.usesRemaining, 1);
    assert.equal(thrownSaved.completedKeys.length, 0);
  });

  it("keeps at-most-once delivery across crashes before, during, and after notify", async () => {
    const plan = consentedPlan();
    const key = deliveryKey(plan.id);

    const beforeSlug = nextSlug("before-notify");
    await seed(beforeSlug, pausedReady());
    const beforeStore = createPgPoolStore(db(), beforeSlug);
    const beforeSnapshot = await beforeStore.read();
    assert.ok(beforeSnapshot);
    const beforeClaim = await beforeStore.claim({ owner: "deliver-before", now, ttlMs: 20_000, snapshot: beforeSnapshot });
    assert.equal(beforeClaim.ok, true);
    if (!beforeClaim.ok) return;
    const crashedBefore = await beforeStore.release({ hold: beforeClaim.hold, now, next: beforeClaim.state });
    assert.equal(crashedBefore.ok, true);
    let beforeSends = 0;
    const retriedBefore = await deliverGranted({
      store: beforeStore,
      owner: "deliver-before-retry",
      now,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        beforeSends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(beforeSends, 1);
    assert.equal(retriedBefore.notified, true);
    assert.equal((await persisted(beforeSlug)).completedKeys.includes(key), true);

    const duringSlug = nextSlug("during-notify");
    await seed(duringSlug, pausedReady());
    const duringStore = createPgPoolStore(db(), duringSlug);
    let duringSends = 0;
    const failed = await deliverGranted({
      store: duringStore,
      owner: "deliver-during",
      now,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        duringSends += 1;
        throw new Error("timeout");
      },
      sleep: async () => undefined,
    });
    assert.equal(duringSends, 1);
    assert.equal(failed.notified, false);
    assert.equal(failed.status, 502);
    const failedSaved = await persisted(duringSlug);
    assert.equal(failedSaved.completedKeys.includes(key), true);
    assert.equal(failedSaved.followups[0]?.sent, false);
    assert.equal(failedSaved.approvals[0]?.usesRemaining, 0);
    assert.equal(failedSaved.audit.some((entry) => entry.outcome === "error" && entry.detail.includes("did not succeed")), true);
    const duringRetry = await deliverGranted({
      store: duringStore,
      owner: "deliver-during-retry",
      now,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        duringSends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(duringSends, 1);
    assert.equal(duringRetry.notified, false);

    const ambiguousSlug = nextSlug("ambiguous");
    await seed(ambiguousSlug, pausedReady());
    const ambiguousStore = createPgPoolStore(db(), ambiguousSlug);
    let ambiguousSends = 0;
    const ambiguous = await deliverGranted({
      store: ambiguousStore,
      owner: "deliver-ambiguous",
      now,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        ambiguousSends += 1;
        return { ok: false, reason: "provider result was ambiguous" };
      },
      sleep: async () => undefined,
    });
    assert.equal(ambiguous.notified, false);
    const ambiguousRetry = await deliverGranted({
      store: ambiguousStore,
      owner: "deliver-ambiguous-retry",
      now,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        ambiguousSends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(ambiguousSends, 1);
    assert.equal(ambiguousRetry.notified, false);
    const ambiguousSaved = await persisted(ambiguousSlug);
    assert.equal(ambiguousSaved.completedKeys.includes(key), true);
    assert.equal(ambiguousSaved.audit.some((entry) => entry.detail.includes("cannot send a second message")), true);

    const afterSlug = nextSlug("after-notify");
    await seed(afterSlug, pausedReady());
    const afterStore = createPgPoolStore(db(), afterSlug);
    let afterSends = 0;
    const sent = await deliverGranted({
      store: afterStore,
      owner: "deliver-after",
      now,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        afterSends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    const afterRetry = await deliverGranted({
      store: afterStore,
      owner: "deliver-after-retry",
      now,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        afterSends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(sent.notified, true);
    assert.equal(afterRetry.notified, false);
    assert.equal(afterSends, 1);
    assert.equal((await persisted(afterSlug)).followups[0]?.sent, true);

    const killedSlug = nextSlug("kill-after-key");
    await seed(killedSlug, pausedReady());
    const killedEnv = { ...quiet, GROWTH_ENGINE_KILL: "" } as NodeJS.ProcessEnv;
    const killedStore = createPgPoolStore(db(), killedSlug);
    const armed: EngineLockStore = {
      ...killedStore,
      writeHeld: async (input) => {
        const written = await killedStore.writeHeld(input);
        killedEnv.GROWTH_ENGINE_KILL = "1";
        return written;
      },
    };
    let killedSends = 0;
    const killed = await deliverGranted({
      store: armed,
      owner: "deliver-kill-mid",
      now,
      followupId: plan.id,
      env: killedEnv,
      notify: async () => {
        killedSends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(killedSends, 0);
    assert.equal(killed.notified, false);
    const killedSaved = await persisted(killedSlug);
    assert.equal(killedSaved.completedKeys.includes(key), true);
    assert.equal(killedSaved.audit.some((entry) => entry.detail.includes("Notification was not sent.")), true);
    const killedRetry = await deliverGranted({
      store: killedStore,
      owner: "deliver-kill-retry",
      now,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        killedSends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(killedSends, 0);
    assert.equal(killedRetry.notified, false);
  });

  it("allows one send when a worker crashes before the delivery key is stored", async () => {
    const slug = nextSlug("crash-before-key");
    const plan = consentedPlan();
    await seed(slug, pausedReady());
    const store = createPgPoolStore(db(), slug);
    const snapshot = await store.read();
    assert.ok(snapshot);
    const claim = await store.claim({ owner: "deliver-crash", now, ttlMs: 20_000, snapshot });
    assert.equal(claim.ok, true);
    if (!claim.ok) return;
    assert.equal(claim.state.completedKeys.includes(deliveryKey(plan.id)), false);
    const released = await store.release({ hold: claim.hold, now, next: claim.state });
    assert.equal(released.ok, true);
    let sends = 0;
    const result = await deliverGranted({
      store,
      owner: "deliver-crash-retry",
      now,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(sends, 1);
    assert.equal(result.notified, true);
    const retry = await deliverGranted({
      store,
      owner: "deliver-crash-second",
      now,
      followupId: plan.id,
      env: quiet,
      notify: async () => {
        sends += 1;
        return { ok: true };
      },
      sleep: async () => undefined,
    });
    assert.equal(sends, 1);
    assert.equal(retry.notified, false);
  });

  it("enforces admin-only select and denies anonymous reads and writes", async () => {
    await db().query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'growth_rls_anon') THEN
          CREATE ROLE growth_rls_anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
      END $$
    `);
    const slug = nextSlug("rls");
    const adminId = "22222222-2222-4222-8222-222222222222";
    const memberId = "33333333-3333-4333-8333-333333333333";
    const client = await db().connect();
    try {
      await client.query("BEGIN");
      await client.query("CREATE SCHEMA IF NOT EXISTS auth");
      await client.query(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
        LANGUAGE sql STABLE AS $$
          SELECT NULLIF(current_setting('growth.user_id', true), '')::uuid
        $$
      `);
      await client.query(`
        CREATE TABLE public.user_roles (
          user_id uuid,
          role text,
          is_active boolean
        )
      `);
      await client.query(
        "INSERT INTO public.user_roles (user_id, role, is_active) VALUES ($1, 'admin', true), ($2, 'member', true)",
        [adminId, memberId],
      );
      await client.query("GRANT USAGE ON SCHEMA public, auth TO growth_rls_anon, authenticated");
      await client.query("GRANT SELECT ON public.growth_campaigns TO growth_rls_anon, authenticated");
      await client.query("GRANT SELECT ON public.user_roles TO authenticated");
      await client.query("ALTER TABLE public.growth_campaigns ENABLE ROW LEVEL SECURITY");
      await client.query("ALTER TABLE public.growth_campaigns FORCE ROW LEVEL SECURITY");
      await client.query("DROP POLICY IF EXISTS growth_campaigns_admin_select ON public.growth_campaigns");
      await client.query(`
        CREATE POLICY growth_campaigns_admin_select ON public.growth_campaigns
          FOR SELECT TO authenticated
          USING (EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
          ))
      `);
      await client.query(
        `INSERT INTO public.growth_campaigns (name, slug, channel, status, metadata)
         VALUES ('lock test isolated', $1, 'internal', 'paused', $2::jsonb)`,
        [slug, JSON.stringify(createInitialState(now))],
      );

      await client.query("SET LOCAL ROLE growth_rls_anon");
      const anon = await client.query("SELECT slug FROM public.growth_campaigns WHERE slug = $1", [slug]);
      assert.equal(anon.rows.length, 0);

      await client.query("RESET ROLE");
      await client.query("SET LOCAL ROLE authenticated");
      await client.query("SELECT set_config('growth.user_id', $1, true)", [memberId]);
      const member = await client.query("SELECT slug FROM public.growth_campaigns WHERE slug = $1", [slug]);
      assert.equal(member.rows.length, 0);

      await client.query("SELECT set_config('growth.user_id', $1, true)", [adminId]);
      const admin = await client.query("SELECT slug FROM public.growth_campaigns WHERE slug = $1", [slug]);
      assert.equal(admin.rows.length, 1);
      await assert.rejects(
        () => client.query("UPDATE public.growth_campaigns SET name = 'changed' WHERE slug = $1", [slug]),
        /permission denied/i,
      );
      await client.query("ROLLBACK");
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* the transaction is already closed */ }
      throw error;
    } finally {
      client.release();
    }
  });

  it("rejects a duplicate notification event key and allows a null key twice", async () => {
    await db().query("DROP TABLE IF EXISTS public.notifications");
    await db().query(`
      CREATE TABLE public.notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        event_key text
      )
    `);
    await db().query(`
      CREATE UNIQUE INDEX uq_notifications_user_event_key
      ON public.notifications (user_id, event_key)
      WHERE event_key IS NOT NULL
    `);
    const user = "44444444-4444-4444-8444-444444444444";
    try {
      await db().query(
        "INSERT INTO public.notifications (user_id, event_key) VALUES ($1, 'growth-followup:one')",
        [user],
      );
      await assert.rejects(
        () => db().query(
          "INSERT INTO public.notifications (user_id, event_key) VALUES ($1, 'growth-followup:one')",
          [user],
        ),
        (error: unknown) => {
          const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
          assert.equal(code, "23505");
          return true;
        },
      );
      await db().query(
        "INSERT INTO public.notifications (user_id, event_key) VALUES ($1, NULL), ($1, NULL)",
        [user],
      );
      const count = await db().query(
        "SELECT count(*)::int AS n FROM public.notifications WHERE user_id = $1 AND event_key IS NULL",
        [user],
      );
      assert.equal(count.rows[0].n, 2);
    } finally {
      await db().query("DROP TABLE IF EXISTS public.notifications");
    }
  });
});

describe("postgrest growth lock", postgrestUrl ? {} : { skip: "GROWTH_LOCK_TEST_POSTGREST_URL is unset" }, () => {
  before(async () => {
    if (!pool) {
      pool = new Pool({
        connectionString: databaseUrl,
        max: 6,
        statement_timeout: 15_000,
        lock_timeout: 10_000,
        connectionTimeoutMillis: 5_000,
        application_name: "jimvio-growth-lock-test",
      });
    }
    await createLockTable();
    await db().query("NOTIFY pgrst, 'reload schema'");
    const deadline = Date.now() + 5_000;
    let last = "not ready";
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`${postgrestUrl}/rest/v1/growth_campaigns?select=slug&limit=1`);
        if (response.ok) return;
        last = String(response.status);
      } catch {
        last = "connection failed";
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Local PostgREST did not expose the isolated table (${last}).`);
  });

  after(async () => {
    if (!pool) return;
    await pool.query("DROP TABLE IF EXISTS public.growth_campaigns");
    await pool.end();
    pool = undefined;
  });

  async function postgrestEngine(slug: string): Promise<EngineLockStore> {
    const { createClient } = await import("@supabase/supabase-js");
    const { createSupabaseEngineStore } = await import("../../../services/growth/engine-lock");
    const client = createClient(postgrestUrl, "local-lock-test", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return createSupabaseEngineStore(slug, client);
  }

  it("applies the conditional update filters and returns the winning row", async () => {
    const slug = nextSlug("postgrest-overlap");
    await seed(slug, createInitialState(now));
    const store = await postgrestEngine(slug);
    const snapshot = await store.read();
    assert.ok(snapshot);
    const [alpha, beta] = await Promise.all([
      store.claim({ owner: "owner-alpha", now, ttlMs: 30_000, snapshot }),
      store.claim({ owner: "owner-beta", now, ttlMs: 30_000, snapshot }),
    ]);
    const wins = [alpha, beta].filter((item) => item.ok);
    assert.equal(wins.length, 1);
    const winner = wins[0];
    assert.equal(winner.ok, true);
    if (!winner.ok) return;
    const saved = await persisted(slug);
    assert.equal(saved.lock?.owner, winner.hold.owner);
    assert.equal(saved.lock?.token, winner.hold.token);
    assert.equal(saved.revision, snapshot.revision + 1);
    const loser = winner.hold.owner === "owner-alpha" ? "owner-beta" : "owner-alpha";
    assert.equal(JSON.stringify(saved).includes(loser), false);
  });

  it("recovers an exactly expired lease through the lte filter", async () => {
    const slug = nextSlug("postgrest-expired");
    await seed(slug, {
      ...createInitialState(now),
      revision: 3,
      lock: { owner: "owner-old", token: "old-token", until: now.toISOString() },
    });
    const store = await postgrestEngine(slug);
    const snapshot = await store.read();
    assert.ok(snapshot);
    const recovered = await store.claim({ owner: "owner-new", now, ttlMs: 10_000, snapshot });
    assert.equal(recovered.ok, true);
    if (!recovered.ok) return;
    assert.equal(recovered.outcome, "expired_recovered");
    const saved = await persisted(slug);
    assert.equal(saved.lock?.owner, "owner-new");
    assert.equal(saved.lock?.token, recovered.hold.token);
    assert.equal(saved.revision, 4);
  });

  it("does not overwrite unreadable metadata or a stale token", async () => {
    const unreadableSlug = nextSlug("postgrest-unreadable");
    const original = { version: 2, revision: 0, status: "paused", lock: null, marker: "postgrest-keep" };
    await seedRaw(unreadableSlug, original);
    const unreadable = await postgrestEngine(unreadableSlug);
    await assert.rejects(() => unreadable.read(), /unreadable/);
    const claim = await unreadable.claim({
      owner: "owner-should-not-win",
      now,
      ttlMs: 10_000,
      snapshot: createInitialState(now),
    });
    assert.equal(claim.ok, false);
    await metadataUnchanged(unreadableSlug, original);

    const slug = nextSlug("postgrest-stale");
    await seed(slug, createInitialState(now));
    const store = await postgrestEngine(slug);
    const snapshot = await store.read();
    assert.ok(snapshot);
    const held = await store.claim({ owner: "owner-alpha", now, ttlMs: 30_000, snapshot });
    assert.equal(held.ok, true);
    if (!held.ok) return;
    const before = await db().query("SELECT metadata::text AS text FROM public.growth_campaigns WHERE slug = $1", [slug]);
    const stale = await store.release({ hold: { ...held.hold, token: "stale-token" }, now, next: held.state });
    assert.equal(stale.ok, false);
    const blocked = await store.claim({
      owner: "owner-beta",
      now,
      ttlMs: 10_000,
      snapshot: {
        ...held.state,
        lock: { owner: "owner-alpha", token: held.hold.token, until: new Date(now.getTime() + 30_000).toISOString() },
      },
    });
    assert.equal(blocked.ok, false);
    const after = await db().query("SELECT metadata::text AS text FROM public.growth_campaigns WHERE slug = $1", [slug]);
    assert.equal(after.rows[0].text, before.rows[0].text);
  });
});
