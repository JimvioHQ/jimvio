import { applyClaim, claimOrFilter, classifyLock, extendLockUntil, type ClaimFailure, type ClaimSuccess, type EngineLockStore, type HoldFailure, type ReleaseSuccess, type WriteSuccess } from "@/lib/growth/engine/lock";
import { appendAudit, parseEngineState } from "@/lib/growth/engine/state";
import type { EngineState } from "@/lib/growth/engine/types";
import { getAdminDB } from "@/services/base";
import type { Json, Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type EngineClient = SupabaseClient<Database>;

function asMetadata(state: EngineState): Json {
  return JSON.parse(JSON.stringify(state)) as Json;
}

function campaignStatus(state: EngineState): "active" | "paused" {
  return state.status === "running" ? "active" : "paused";
}

/**
 * One conditional update on growth_campaigns. The revision, owner, and token
 * predicates run inside that update. No migration is required.
 */
export function createSupabaseEngineStore(slug: string, client?: EngineClient): EngineLockStore {
  const db = () => client ?? getAdminDB();

  async function read(): Promise<EngineState | null> {
    const { data, error } = await db().from("growth_campaigns").select("metadata").eq("slug", slug).maybeSingle();
    if (error) throw new Error("The growth engine control record could not be read.");
    if (!data) return null;
    const parsed = parseEngineState(data.metadata);
    if (!parsed) throw new Error("Growth engine control record is unreadable. It was not overwritten.");
    return parsed;
  }

  return {
    read,

    async claim(input): Promise<ClaimSuccess | ClaimFailure> {
      const kind = classifyLock(input.snapshot.lock, input.owner, input.now);
      const outcome = kind === "expired" ? "expired_recovered" as const : kind === "renew" ? "renewed" as const : "acquired" as const;
      const nextToken = crypto.randomUUID();
      const next = applyClaim(input.snapshot, {
        owner: input.owner,
        token: nextToken,
        now: input.now,
        ttlMs: input.ttlMs,
        outcome,
      });
      const { data, error } = await db()
        .from("growth_campaigns")
        .update({ status: campaignStatus(next), metadata: asMetadata(next) })
        .eq("slug", slug)
        .eq("metadata->>revision", String(input.snapshot.revision))
        .eq("metadata->>version", "1")
        .in("metadata->>status", ["paused", "running"])
        .or(claimOrFilter(input.owner, input.now.toISOString()))
        .select("metadata");
      if (error) throw new Error("The growth engine lock could not be claimed.");
      if (!data?.length) {
        const latest = await read().catch(() => null);
        return { ok: false, outcome: "contended", state: latest };
      }
      const parsed = parseEngineState(data[0].metadata);
      if (!parsed?.lock) throw new Error("The growth engine lock claim did not return a readable row.");
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
      const nextToken = crypto.randomUUID();
      const next = applyClaim({ ...input.initial, revision: 0, lock: null }, {
        owner: input.owner,
        token: nextToken,
        now: input.now,
        ttlMs: input.ttlMs,
        outcome: "acquired",
      });
      const { error } = await db().from("growth_campaigns").insert({
        name: "Jimvio growth engine",
        slug,
        channel: "internal",
        status: campaignStatus(next),
        metadata: asMetadata(next),
        created_by: input.actorId,
      });
      if (error?.code === "23505") return { ok: false, outcome: "contended", state: null };
      if (error) throw new Error("The growth engine control row could not be created.");
      return {
        ok: true,
        state: next,
        hold: { owner: input.owner, token: nextToken, revision: next.revision },
        outcome: "acquired",
      };
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
      const { data, error } = await db()
        .from("growth_campaigns")
        .update({ status: campaignStatus(next), metadata: asMetadata(next) })
        .eq("slug", slug)
        .eq("metadata->>revision", String(input.hold.revision))
        .eq("metadata->lock->>owner", input.hold.owner)
        .eq("metadata->lock->>token", input.hold.token)
        .eq("metadata->>version", "1")
        .in("metadata->>status", ["paused", "running"])
        .select("metadata");
      if (error) throw new Error("The growth engine lock could not be updated.");
      if (!data?.length) return { ok: false, outcome: "stale_release_rejected" };
      const parsed = parseEngineState(data[0].metadata);
      if (!parsed?.lock) throw new Error("The growth engine lock update did not return a readable row.");
      return {
        ok: true,
        state: parsed,
        hold: { owner: input.hold.owner, token: parsed.lock.token, revision: parsed.revision },
      };
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
      const { data, error } = await db()
        .from("growth_campaigns")
        .update({ status: campaignStatus(next), metadata: asMetadata(next) })
        .eq("slug", slug)
        .eq("metadata->>revision", String(input.hold.revision))
        .eq("metadata->lock->>owner", input.hold.owner)
        .eq("metadata->lock->>token", input.hold.token)
        .eq("metadata->>version", "1")
        .in("metadata->>status", ["paused", "running"])
        .select("metadata");
      if (error) throw new Error("The growth engine lock could not be released.");
      if (!data?.length) return { ok: false, outcome: "stale_release_rejected" };
      const parsed = parseEngineState(data[0].metadata);
      if (!parsed) throw new Error("The growth engine lock release did not return a readable row.");
      return { ok: true, state: parsed };
    },
  };
}
