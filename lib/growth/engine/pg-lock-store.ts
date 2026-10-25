import { type Pool, type QueryResult } from "pg";
import { applyClaim, classifyLock, extendLockUntil, type ClaimFailure, type ClaimSuccess, type EngineLockStore, type HeldLock, type HoldFailure, type ReleaseSuccess, type WriteSuccess } from "./lock";
import { appendAudit, parseEngineState } from "./state";
import type { EngineState } from "./types";

/**
 * SQL for the growth-engine lock. Production sends the same predicates through
 * PostgREST filters in services/growth/engine-lock.ts. This module does not
 * open a connection and is not used by the running engine.
 *
 * A claim matches the slug, revision, readable version/status, and a free,
 * expired (`until <= now`), or same-owner lock. A held write or release also
 * requires the owner and token. Zero rows means the predicate lost.
 */
export const GROWTH_LOCK_CLAIM_SQL = `
UPDATE public.growth_campaigns
SET status = $5, metadata = $6::jsonb
WHERE slug = $1
  AND metadata->>'revision' = $2
  AND metadata->>'version' = '1'
  AND metadata->>'status' IN ('paused', 'running')
  AND (
    metadata->>'lock' IS NULL
    OR metadata->'lock'->>'until' <= $3
    OR metadata->'lock'->>'owner' = $4
  )
RETURNING metadata
`.trim();

export const GROWTH_LOCK_HOLD_SQL = `
UPDATE public.growth_campaigns
SET status = $5, metadata = $6::jsonb
WHERE slug = $1
  AND metadata->>'revision' = $2
  AND metadata->'lock'->>'owner' = $3
  AND metadata->'lock'->>'token' = $4
  AND metadata->>'version' = '1'
  AND metadata->>'status' IN ('paused', 'running')
RETURNING metadata
`.trim();

export const GROWTH_LOCK_INSERT_SQL = `
INSERT INTO public.growth_campaigns (name, slug, channel, status, metadata, created_by)
VALUES ('Jimvio growth engine', $1, 'internal', $2, $3::jsonb, $4)
RETURNING metadata
`.trim();

export type ClaimStatement = {
  sql: string;
  params: unknown[];
  token: string;
  owner: string;
  revision: number;
};

type SqlClient = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

function campaignStatus(state: EngineState): "active" | "paused" {
  return state.status === "running" ? "active" : "paused";
}

function jsonText(state: EngineState): string {
  return JSON.stringify(state);
}

function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function uniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";
}

function returnedState(row: unknown, label: string): EngineState {
  const metadata = row && typeof row === "object" && "metadata" in row ? jsonValue((row as { metadata: unknown }).metadata) : null;
  const parsed = parseEngineState(metadata);
  if (!parsed) throw new Error(`The growth engine lock ${label} did not return a readable row.`);
  return parsed;
}

export function prepareClaim(slug: string, input: {
  owner: string;
  now: Date;
  ttlMs: number;
  snapshot: EngineState;
}): ClaimStatement {
  const kind = classifyLock(input.snapshot.lock, input.owner, input.now);
  const outcome = kind === "expired" ? "expired_recovered" as const : kind === "renew" ? "renewed" as const : "acquired" as const;
  const token = crypto.randomUUID();
  const next = applyClaim(input.snapshot, {
    owner: input.owner,
    token,
    now: input.now,
    ttlMs: input.ttlMs,
    outcome,
  });
  return {
    sql: GROWTH_LOCK_CLAIM_SQL,
    params: [slug, String(input.snapshot.revision), input.now.toISOString(), input.owner, campaignStatus(next), jsonText(next)],
    token,
    owner: input.owner,
    revision: input.snapshot.revision,
  };
}

export function createPgEngineStore(db: SqlClient, slug: string): EngineLockStore {
  async function read(): Promise<EngineState | null> {
    let result: QueryResult;
    try {
      result = await db.query("SELECT metadata FROM public.growth_campaigns WHERE slug = $1", [slug]);
    } catch {
      throw new Error("The growth engine control record could not be read.");
    }
    if (!result.rows.length) return null;
    const parsed = parseEngineState(jsonValue(result.rows[0]?.metadata));
    if (!parsed) throw new Error("Growth engine control record is unreadable. It was not overwritten.");
    return parsed;
  }

  return {
    read,

    async claim(input): Promise<ClaimSuccess | ClaimFailure> {
      const prepared = prepareClaim(slug, input);
      let result: QueryResult;
      try {
        result = await db.query(prepared.sql, prepared.params);
      } catch {
        throw new Error("The growth engine lock could not be claimed.");
      }
      if (!result.rows.length) {
        const latest = await read().catch(() => null);
        return { ok: false, outcome: "contended", state: latest };
      }
      const parsed = returnedState(result.rows[0], "claim");
      if (!parsed.lock || parsed.lock.token !== prepared.token || parsed.lock.owner !== input.owner) {
        throw new Error("The growth engine lock claim did not return the winning row.");
      }
      return {
        ok: true,
        state: parsed,
        hold: { owner: input.owner, token: parsed.lock.token, revision: parsed.revision },
        outcome: parsed.audit.at(-1)?.detail.startsWith("expired_recovered")
          ? "expired_recovered"
          : parsed.audit.at(-1)?.detail.startsWith("renewed")
            ? "renewed"
            : "acquired",
      };
    },

    async insertClaim(input): Promise<ClaimSuccess | ClaimFailure> {
      const token = crypto.randomUUID();
      const next = applyClaim({ ...input.initial, revision: 0, lock: null }, {
        owner: input.owner,
        token,
        now: input.now,
        ttlMs: input.ttlMs,
        outcome: "acquired",
      });
      try {
        const result = await db.query(GROWTH_LOCK_INSERT_SQL, [slug, campaignStatus(next), jsonText(next), input.actorId]);
        const parsed = returnedState(result.rows[0], "insert");
        if (!parsed.lock || parsed.lock.token !== token || parsed.lock.owner !== input.owner) {
          throw new Error("The growth engine lock claim did not return the winning row.");
        }
        return {
          ok: true,
          state: parsed,
          hold: { owner: input.owner, token: parsed.lock.token, revision: parsed.revision },
          outcome: "acquired",
        };
      } catch (error) {
        if (uniqueViolation(error)) return { ok: false, outcome: "contended", state: null };
        if (error instanceof Error && error.message === "The growth engine lock claim did not return the winning row.") throw error;
        throw new Error("The growth engine control row could not be created.");
      }
    },

    async writeHeld(input): Promise<WriteSuccess | HoldFailure> {
      const next: EngineState = {
        ...input.next,
        revision: input.hold.revision + 1,
        lock: {
          owner: input.hold.owner,
          token: input.hold.token,
          until: extendLockUntil(input.next.lock?.until, input.now, input.extendMs),
        },
        updatedAt: input.now.toISOString(),
      };
      return holdWrite(db, slug, input.hold, next, "update");
    },

    async release(input): Promise<ReleaseSuccess | HoldFailure> {
      const next = appendAudit({
        ...input.next,
        revision: input.hold.revision + 1,
        lock: null,
        updatedAt: input.now.toISOString(),
      }, {
        at: input.now.toISOString(),
        action: "lock",
        subjectId: input.hold.owner,
        outcome: "success",
        detail: "released: lock released by the owner that acquired it",
      });
      const written = await holdWrite(db, slug, input.hold, next, "release");
      if (!written.ok) return written;
      return { ok: true, state: written.state };
    },
  };
}

async function holdWrite(
  db: SqlClient,
  slug: string,
  hold: HeldLock,
  next: EngineState,
  label: "update" | "release",
): Promise<WriteSuccess | HoldFailure> {
  let result: QueryResult;
  try {
    result = await db.query(GROWTH_LOCK_HOLD_SQL, [
      slug,
      String(hold.revision),
      hold.owner,
      hold.token,
      campaignStatus(next),
      jsonText(next),
    ]);
  } catch {
    throw new Error(label === "release" ? "The growth engine lock could not be released." : "The growth engine lock could not be updated.");
  }
  if (!result.rows.length) return { ok: false, outcome: "stale_release_rejected" };
  const parsed = returnedState(result.rows[0], label);
  if (label === "release") {
    if (parsed.lock || parsed.revision !== hold.revision + 1) {
      throw new Error("The growth engine lock release did not return a readable row.");
    }
    return { ok: true, state: parsed, hold: { owner: hold.owner, token: hold.token, revision: parsed.revision } };
  }
  if (!parsed.lock || parsed.lock.token !== hold.token || parsed.lock.owner !== hold.owner || parsed.revision !== hold.revision + 1) {
    throw new Error("The growth engine lock update did not return a readable row.");
  }
  return {
    ok: true,
    state: parsed,
    hold: { owner: hold.owner, token: parsed.lock.token, revision: parsed.revision },
  };
}

/** Tests pass a Pool. Each call uses one auto-commit query on a pooled connection. */
export function createPgPoolStore(pool: Pool, slug: string): EngineLockStore {
  return createPgEngineStore({
    query: (sql, params) => pool.query(sql, params),
  }, slug);
}
