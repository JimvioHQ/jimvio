import { appendAudit } from "./state";
import type { EngineState } from "./types";

export type LockOutcome =
  | "acquired"
  | "renewed"
  | "contended"
  | "expired_recovered"
  | "released"
  | "stale_release_rejected";

export type LockEvent = {
  at: string;
  owner: string;
  token: string;
  outcome: LockOutcome;
  detail: string;
};

export type HeldLock = {
  owner: string;
  token: string;
  revision: number;
};

export const LOCK_ATTEMPTS = 3;
export const LOCK_RETRY_MS = [0, 50, 100] as const;

/**
 * A held write may extend a lease. It must not move `until` earlier than the
 * lease already stored. `now + extendMs` alone used to shrink a 20s claim to
 * 15s when both calls shared one timestamp.
 */
export function extendLockUntil(currentUntil: string | null | undefined, now: Date, extendMs: number): string {
  const current = currentUntil ? Date.parse(currentUntil) : Number.NaN;
  const proposed = now.getTime() + extendMs;
  const untilMs = Number.isFinite(current) ? Math.max(current, proposed) : proposed;
  return new Date(untilMs).toISOString();
}

export function classifyLock(lock: EngineState["lock"], owner: string, now: Date): "free" | "expired" | "renew" | "held" {
  if (!lock) return "free";
  const until = Date.parse(lock.until);
  if (!Number.isFinite(until) || until <= now.getTime()) return "expired";
  if (lock.owner === owner) return "renew";
  return "held";
}

/** Quote a PostgREST `.or()` value. Dots in timestamps must stay inside the quotes. */
export function quotePostgrest(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Predicate for one UPDATE ... WHERE revision = expected AND (lock is free OR until <= now OR same owner).
 * `lte` matches classifyLock, which treats an exactly expired lease as free. A strict `<` would leave
 * that row contended for every retry that reuses the same timestamp.
 * Postgres evaluates that WHERE as part of the update, so two overlapping claims cannot both match.
 */
export function claimOrFilter(owner: string, nowIso: string): string {
  return [
    "metadata->>lock.is.null",
    `metadata->lock->>until.lte.${quotePostgrest(nowIso)}`,
    `metadata->lock->>owner.eq.${quotePostgrest(owner)}`,
  ].join(",");
}

export type ClaimSuccess = {
  ok: true;
  state: EngineState;
  hold: HeldLock;
  outcome: "acquired" | "renewed" | "expired_recovered";
};

export type ClaimFailure = {
  ok: false;
  outcome: "contended" | "missing";
  state: EngineState | null;
};

export type HoldFailure = { ok: false; outcome: "stale_release_rejected" };
export type WriteSuccess = { ok: true; state: EngineState; hold: HeldLock };
export type ReleaseSuccess = { ok: true; state: EngineState };

export type EngineLockStore = {
  read(): Promise<EngineState | null>;
  claim(input: { owner: string; now: Date; ttlMs: number; snapshot: EngineState }): Promise<ClaimSuccess | ClaimFailure>;
  insertClaim(input: { owner: string; now: Date; ttlMs: number; initial: EngineState; actorId: string | null }): Promise<ClaimSuccess | ClaimFailure>;
  writeHeld(input: { hold: HeldLock; now: Date; next: EngineState; extendMs: number }): Promise<WriteSuccess | HoldFailure>;
  release(input: { hold: HeldLock; now: Date; next: EngineState }): Promise<ReleaseSuccess | HoldFailure>;
};

function token(): string {
  return crypto.randomUUID();
}

export function applyClaim(state: EngineState, input: {
  owner: string;
  token: string;
  now: Date;
  ttlMs: number;
  outcome: "acquired" | "renewed" | "expired_recovered";
}): EngineState {
  const detail = input.outcome === "expired_recovered"
    ? "expired_recovered: an abandoned lock was taken by a new owner"
    : input.outcome === "renewed"
      ? "renewed: the same owner received a new lock token"
      : "acquired: lock acquired";
  return appendAudit({
    ...state,
    revision: state.revision + 1,
    lock: {
      owner: input.owner,
      token: input.token,
      until: new Date(input.now.getTime() + input.ttlMs).toISOString(),
    },
    updatedAt: input.now.toISOString(),
  }, {
    at: input.now.toISOString(),
    action: "lock",
    subjectId: input.owner,
    outcome: "success",
    detail,
  });
}

function event(now: Date, owner: string, tokenValue: string, outcome: LockOutcome, detail: string): LockEvent {
  return { at: now.toISOString(), owner, token: tokenValue, outcome, detail };
}

export class MemoryEngineStore implements EngineLockStore {
  private row: EngineState | null;
  private chain: Promise<void> = Promise.resolve();
  readonly events: LockEvent[] = [];

  constructor(initial: EngineState | null) {
    this.row = initial ? structuredClone(initial) : null;
  }

  async read(): Promise<EngineState | null> {
    return this.row ? structuredClone(this.row) : null;
  }

  private exclusive<T>(work: () => T): Promise<T> {
    const run = this.chain.then(work, work);
    this.chain = run.then(() => undefined, () => undefined);
    return run;
  }

  private owns(hold: HeldLock): boolean {
    return Boolean(
      this.row
      && this.row.revision === hold.revision
      && this.row.lock?.owner === hold.owner
      && this.row.lock?.token === hold.token,
    );
  }

  async claim(input: { owner: string; now: Date; ttlMs: number; snapshot: EngineState }): Promise<ClaimSuccess | ClaimFailure> {
    return this.exclusive(() => {
      if (!this.row) {
        this.events.push(event(input.now, input.owner, "", "contended", "No control row to claim."));
        return { ok: false, outcome: "missing", state: null };
      }
      if (this.row.revision !== input.snapshot.revision) {
        this.events.push(event(input.now, input.owner, "", "contended", "Revision changed before the claim."));
        return { ok: false, outcome: "contended", state: structuredClone(this.row) };
      }
      const kind = classifyLock(this.row.lock, input.owner, input.now);
      if (kind === "held") {
        this.events.push(event(input.now, input.owner, this.row.lock?.token ?? "", "contended", "Another owner holds an unexpired lock."));
        return { ok: false, outcome: "contended", state: structuredClone(this.row) };
      }
      const outcome = kind === "expired" ? "expired_recovered" as const : kind === "renew" ? "renewed" as const : "acquired" as const;
      const nextToken = token();
      const next = applyClaim(this.row, { owner: input.owner, token: nextToken, now: input.now, ttlMs: input.ttlMs, outcome });
      this.row = next;
      this.events.push(event(input.now, input.owner, nextToken, outcome, next.audit.at(-1)?.detail ?? outcome));
      return {
        ok: true,
        state: structuredClone(next),
        hold: { owner: input.owner, token: nextToken, revision: next.revision },
        outcome,
      };
    });
  }

  async insertClaim(input: { owner: string; now: Date; ttlMs: number; initial: EngineState; actorId: string | null }): Promise<ClaimSuccess | ClaimFailure> {
    return this.exclusive(() => {
      if (this.row) {
        this.events.push(event(input.now, input.owner, "", "contended", "The control row already exists."));
        return { ok: false, outcome: "contended", state: structuredClone(this.row) };
      }
      const nextToken = token();
      const next = applyClaim({ ...input.initial, revision: 0, lock: null }, {
        owner: input.owner,
        token: nextToken,
        now: input.now,
        ttlMs: input.ttlMs,
        outcome: "acquired",
      });
      this.row = next;
      this.events.push(event(input.now, input.owner, nextToken, "acquired", "acquired: lock acquired"));
      return {
        ok: true,
        state: structuredClone(next),
        hold: { owner: input.owner, token: nextToken, revision: next.revision },
        outcome: "acquired",
      };
    });
  }

  async writeHeld(input: { hold: HeldLock; now: Date; next: EngineState; extendMs: number }): Promise<WriteSuccess | HoldFailure> {
    return this.exclusive(() => {
      if (!this.owns(input.hold) || !this.row?.lock) {
        this.events.push(event(input.now, input.hold.owner, input.hold.token, "stale_release_rejected", "Stale owner cannot write a newer lock."));
        return { ok: false, outcome: "stale_release_rejected" };
      }
      const next: EngineState = {
        ...input.next,
        revision: this.row.revision + 1,
        lock: { owner: input.hold.owner, token: input.hold.token, until: extendLockUntil(this.row.lock.until, input.now, input.extendMs) },
        updatedAt: input.now.toISOString(),
      };
      this.row = next;
      return {
        ok: true,
        state: structuredClone(next),
        hold: { owner: input.hold.owner, token: input.hold.token, revision: next.revision },
      };
    });
  }

  async release(input: { hold: HeldLock; now: Date; next: EngineState }): Promise<ReleaseSuccess | HoldFailure> {
    return this.exclusive(() => {
      if (!this.owns(input.hold) || !this.row) {
        this.events.push(event(input.now, input.hold.owner, input.hold.token, "stale_release_rejected", "Stale owner cannot release a newer lock."));
        return { ok: false, outcome: "stale_release_rejected" };
      }
      const next = appendAudit({
        ...input.next,
        revision: this.row.revision + 1,
        lock: null,
        updatedAt: input.now.toISOString(),
      }, {
        at: input.now.toISOString(),
        action: "lock",
        subjectId: input.hold.owner,
        outcome: "success",
        detail: "released: lock released by the owner that acquired it",
      });
      this.row = next;
      this.events.push(event(input.now, input.hold.owner, input.hold.token, "released", "released: lock released by the owner that acquired it"));
      return { ok: true, state: structuredClone(next) };
    });
  }
}

export async function claimBounded(
  store: EngineLockStore,
  input: {
    owner: string;
    now: Date;
    ttlMs: number;
    insertFrom: EngineState;
    actorId: string | null;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<ClaimSuccess | ClaimFailure> {
  const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  let last: ClaimSuccess | ClaimFailure = { ok: false, outcome: "contended", state: null };
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    if (LOCK_RETRY_MS[attempt] > 0) await sleep(LOCK_RETRY_MS[attempt]);
    const snapshot = await store.read();
    if (!snapshot) {
      last = await store.insertClaim({
        owner: input.owner,
        now: input.now,
        ttlMs: input.ttlMs,
        initial: input.insertFrom,
        actorId: input.actorId,
      });
      if (last.ok) return last;
      continue;
    }
    last = await store.claim({ owner: input.owner, now: input.now, ttlMs: input.ttlMs, snapshot });
    if (last.ok) return last;
    const latest = last.state ?? await store.read();
    if (latest && classifyLock(latest.lock, input.owner, input.now) === "held") {
      return { ok: false, outcome: "contended", state: latest };
    }
  }
  return last;
}
