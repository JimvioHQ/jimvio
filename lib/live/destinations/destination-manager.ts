/**
 * LiveDestinationManager — orchestrates prepare → egress → monitor → stop.
 * Destination failures never terminate the core Jimvio Live session.
 */

import { liveStudioLog } from "@/lib/live/observability";
import { getDestinationAdapter } from "./adapters";
import { fingerprintIngestUrl } from "./encryption";
import {
  appendDestinationEvent,
  createDestinationSession,
  getDestinationCredentials,
  getDestinationForUser,
  listDestinationSessions,
  updateDestinationSession,
  updateStoredCredentials,
  type DestinationRow,
  type DestinationSessionRow,
} from "./repository";
import {
  startMultistreamEgress,
  stopMultistreamEgress,
  updateMultistreamEgress,
} from "./stream-egress";
import type {
  DestinationSessionStatus,
  LiveMetadata,
  PreparedIngest,
} from "./types";
import { MAX_ACTIVE_DESTINATIONS_PER_LIVE, MAX_RECONNECT_ATTEMPTS } from "./types";

export type PreparedDestination = {
  destination: DestinationRow;
  destinationSessionId: string;
  prepared: PreparedIngest;
  platform: DestinationRow["platform"];
};

function log(
  level: "info" | "warn" | "error",
  event:
    | "destination_prepare_failed"
    | "multistream_egress_started"
    | "multistream_egress_start_failed"
    | "multistream_stopped",
  fields: Record<string, string | number | boolean | null | undefined>
) {
  liveStudioLog(level === "warn" ? "warn" : level, event, fields);
}

async function setStatus(
  destinationSessionId: string,
  status: DestinationSessionStatus,
  extra?: { last_error?: string | null; reconnect_count?: number }
) {
  await updateDestinationSession(destinationSessionId, {
    status,
    last_error: extra?.last_error,
    reconnect_count: extra?.reconnect_count,
    health: { status, errorReason: extra?.last_error ?? null },
    last_health_at: new Date().toISOString(),
    ...(status === "live"
      ? { started_at: new Date().toISOString() }
      : {}),
    ...(status === "stopped" || status === "failed"
      ? { ended_at: new Date().toISOString() }
      : {}),
  });
  await appendDestinationEvent({
    destinationSessionId,
    eventType: `status:${status}`,
    payload: { error: extra?.last_error ?? null },
  });
}

/**
 * Prepare selected destinations. Failures are isolated — returns successes + failures.
 */
export async function prepareLiveDestinations(input: {
  userId: string;
  liveSessionId: string;
  destinationIds: string[];
  metadata: LiveMetadata;
}): Promise<{
  prepared: PreparedDestination[];
  failures: Array<{ destinationId: string; error: string }>;
}> {
  const prepared: PreparedDestination[] = [];
  const failures: Array<{ destinationId: string; error: string }> = [];

  const uniqueIds = [...new Set(input.destinationIds)].slice(
    0,
    MAX_ACTIVE_DESTINATIONS_PER_LIVE
  );

  for (const destinationId of uniqueIds) {
    const destination = await getDestinationForUser(destinationId, input.userId);
    if (!destination) {
      failures.push({ destinationId, error: "Destination not found" });
      continue;
    }

    if (destination.platform === "jimvio") {
      // Jimvio is always live via core session — track as live without egress
      const ds = await createDestinationSession({
        liveSessionId: input.liveSessionId,
        destinationId,
        userId: input.userId,
        status: "live",
      });
      await setStatus(ds.id, "live");
      continue;
    }

    const ds = await createDestinationSession({
      liveSessionId: input.liveSessionId,
      destinationId,
      userId: input.userId,
      status: "preparing",
    });

    try {
      const adapter = getDestinationAdapter(destination.platform);
      const credentials = await getDestinationCredentials(destinationId, input.userId);

      const ctx = {
        userId: input.userId,
        destinationId,
        credentials,
        metadata: input.metadata,
        displayName: destination.display_name,
        providerAccountId: destination.provider_account_id,
        providerChannelId: destination.provider_channel_id,
        providerPageId: destination.provider_page_id,
      };

      const validated = await adapter.validate(ctx);
      if (!validated.ok) {
        await setStatus(ds.id, "failed", { last_error: validated.error });
        failures.push({ destinationId, error: validated.error });
        if (destination.platform === "twitch") {
          liveStudioLog("warn", "twitch_destination_failed", {
            live_session_id: input.liveSessionId,
            destination_id: destinationId,
            reason: "validate_failed",
          });
        }
        if (destination.platform === "tiktok") {
          liveStudioLog("warn", "tiktok_destination_error", {
            live_session_id: input.liveSessionId,
            destination_id: destinationId,
            reason: "validate_failed",
          });
        }
        continue;
      }

      // Persist credentials immediately after any refresh during validate/ensureAccess.
      // Twitch rotates refresh tokens — losing them causes reconnect_required.
      if (ctx.credentials) {
        const beforeExpires = credentials?.expiresAt ?? null;
        const afterExpires = ctx.credentials.expiresAt ?? null;
        const refreshed =
          Boolean(ctx.credentials.accessToken) &&
          (beforeExpires !== afterExpires ||
            credentials?.accessToken !== ctx.credentials.accessToken ||
            credentials?.refreshToken !== ctx.credentials.refreshToken);
        if (refreshed) {
          await updateStoredCredentials(destinationId, input.userId, ctx.credentials);
          if (destination.platform === "twitch") {
            liveStudioLog("info", "twitch_token_refresh", {
              destination_id: destinationId,
            });
          }
          if (destination.platform === "tiktok") {
            liveStudioLog("info", "tiktok_token_refresh", {
              destination_id: destinationId,
            });
          }
        }
      }

      if (destination.platform === "twitch") {
        liveStudioLog("info", "twitch_destination_prepare", {
          live_session_id: input.liveSessionId,
          destination_id: destinationId,
        });
      }
      if (destination.platform === "tiktok") {
        liveStudioLog("info", "tiktok_destination_prepare", {
          live_session_id: input.liveSessionId,
          destination_id: destinationId,
        });
      }

      const prep = await adapter.prepare(ctx);
      if (!prep.ok) {
        await setStatus(ds.id, "failed", { last_error: prep.error });
        failures.push({ destinationId, error: prep.error });
        if (destination.platform === "twitch") {
          liveStudioLog("warn", "twitch_destination_failed", {
            live_session_id: input.liveSessionId,
            destination_id: destinationId,
            reason: "prepare_failed",
          });
        }
        if (destination.platform === "tiktok") {
          liveStudioLog("warn", "tiktok_destination_error", {
            live_session_id: input.liveSessionId,
            destination_id: destinationId,
            reason: "prepare_failed",
          });
        }
        // Still persist credentials if prepare refreshed tokens then failed later
        if (ctx.credentials) {
          await updateStoredCredentials(destinationId, input.userId, ctx.credentials);
        }
        continue;
      }

      // Persist any credential updates from prepare (e.g. Twitch stream key)
      if (ctx.credentials) {
        await updateStoredCredentials(destinationId, input.userId, ctx.credentials);
      }

      await updateDestinationSession(ds.id, {
        status: "ready",
        provider_broadcast_id: prep.value.providerBroadcastId ?? null,
        provider_stream_id: prep.value.providerStreamId ?? null,
        ingest_url_fingerprint: fingerprintIngestUrl(prep.value.pushUrl),
        health: { status: "ready" },
      });

      prepared.push({
        destination,
        destinationSessionId: ds.id,
        prepared: prep.value,
        platform: destination.platform,
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Destination preparation failed";
      await setStatus(ds.id, "failed", { last_error: msg });
      failures.push({ destinationId, error: msg });
      log("error", "destination_prepare_failed", {
        live_session_id: input.liveSessionId,
        destination_id: destinationId,
        error: msg,
      });
    }
  }

  return { prepared, failures };
}

/**
 * Start LiveKit stream egress for prepared destinations.
 * Does not block / fail Jimvio Live if egress fails — marks destinations connecting/failed.
 */
export async function startDestinationEgress(input: {
  userId: string;
  liveSessionId: string;
  prepared: PreparedDestination[];
  metadata: LiveMetadata;
}): Promise<{ egressId: string | null; started: number; failed: number }> {
  const rtmpTargets = input.prepared.filter(
    (p) => p.platform !== "jimvio" && /^rtmps?:\/\//i.test(p.prepared.pushUrl)
  );

  if (rtmpTargets.length === 0) {
    return { egressId: null, started: 0, failed: 0 };
  }

  for (const t of rtmpTargets) {
    await setStatus(t.destinationSessionId, "connecting");
  }

  const result = await startMultistreamEgress({
    sessionId: input.liveSessionId,
    pushUrls: rtmpTargets.map((t) => t.prepared.pushUrl),
  });

  if ("error" in result) {
    for (const t of rtmpTargets) {
      await setStatus(t.destinationSessionId, "failed", {
        last_error:
          "Destination temporarily unavailable. Jimvio Live is still running.",
      });
    }
    log("error", "multistream_egress_start_failed", {
      live_session_id: input.liveSessionId,
      error: result.error,
    });
    return { egressId: null, started: 0, failed: rtmpTargets.length };
  }

  let started = 0;
  let failed = 0;

  for (const t of rtmpTargets) {
    await updateDestinationSession(t.destinationSessionId, {
      egress_id: result.egressId,
    });

    const adapter = getDestinationAdapter(t.platform);
    const credentials = await getDestinationCredentials(
      t.destination.id,
      input.userId
    );
    const startRes = await adapter.start({
      userId: input.userId,
      destinationId: t.destination.id,
      credentials,
      metadata: input.metadata,
      displayName: t.destination.display_name,
      providerAccountId: t.destination.provider_account_id,
      providerChannelId: t.destination.provider_channel_id,
      providerPageId: t.destination.provider_page_id,
      prepared: t.prepared,
    });

    if (!startRes.ok) {
      failed += 1;
      await setStatus(t.destinationSessionId, "reconnecting", {
        last_error: startRes.error,
      });
      if (t.platform === "twitch") {
        liveStudioLog("warn", "twitch_destination_failed", {
          live_session_id: input.liveSessionId,
          destination_id: t.destination.id,
          reason: "start_failed",
        });
      }
      // Keep egress URL; platform may catch up. Do not kill other destinations.
    } else {
      started += 1;
      await setStatus(t.destinationSessionId, "live");
      if (t.platform === "twitch") {
        liveStudioLog("info", "twitch_destination_started", {
          live_session_id: input.liveSessionId,
          destination_id: t.destination.id,
        });
      }
    }
  }

  log("info", "multistream_egress_started", {
    live_session_id: input.liveSessionId,
    egress_id: result.egressId,
    started,
    failed,
  });

  return { egressId: result.egressId, started, failed };
}

export async function stopAllDestinations(input: {
  userId: string;
  liveSessionId: string;
  metadata?: LiveMetadata;
}): Promise<void> {
  const sessions = await listDestinationSessions(input.liveSessionId);
  const egressIds = new Set<string>();

  // Load internal rows for egress ids + provider ids
  const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
  const db = createServiceRoleClient();
  const { data: rows } = await db
    .from("live_destination_sessions")
    .select("*")
    .eq("live_session_id", input.liveSessionId);

  for (const row of (rows ?? []) as DestinationSessionRow[]) {
    if (row.egress_id) egressIds.add(row.egress_id);

    const destination = await getDestinationForUser(row.destination_id, input.userId);
    if (!destination) {
      await setStatus(row.id, "stopped");
      continue;
    }

    try {
      const adapter = getDestinationAdapter(destination.platform);
      const credentials = await getDestinationCredentials(
        destination.id,
        input.userId
      );
      await adapter.stop({
        userId: input.userId,
        destinationId: destination.id,
        credentials,
        metadata: input.metadata ?? { title: "Jimvio Live" },
        displayName: destination.display_name,
        providerAccountId: destination.provider_account_id,
        providerChannelId: destination.provider_channel_id,
        providerPageId: destination.provider_page_id,
        prepared: row.provider_broadcast_id
          ? {
              rtmpUrl: "",
              pushUrl: "",
              providerBroadcastId: row.provider_broadcast_id,
              providerStreamId: row.provider_stream_id,
            }
          : null,
      });
    } catch {
      /* isolate stop failures */
    }

    await setStatus(row.id, "stopped");
    if (destination.platform === "twitch") {
      liveStudioLog("info", "twitch_destination_stopped", {
        live_session_id: input.liveSessionId,
        destination_id: destination.id,
      });
    }
  }

  for (const egressId of egressIds) {
    await stopMultistreamEgress(egressId);
  }

  log("info", "multistream_stopped", {
    live_session_id: input.liveSessionId,
    destinations: sessions.length,
  });
}

/**
 * Attempt destination-level reconnect with exponential backoff metadata.
 * Permanent auth failures are not retried.
 */
export async function reconnectDestination(input: {
  userId: string;
  liveSessionId: string;
  destinationSessionId: string;
  pushUrl: string;
  egressId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
  const db = createServiceRoleClient();
  const { data: row } = await db
    .from("live_destination_sessions")
    .select("*")
    .eq("id", input.destinationSessionId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Destination session not found" };
  const session = row as DestinationSessionRow;

  if (session.reconnect_count >= MAX_RECONNECT_ATTEMPTS) {
    await setStatus(session.id, "failed", {
      last_error: "Reconnect attempts exhausted.",
      reconnect_count: session.reconnect_count,
    });
    return { ok: false, error: "Reconnect attempts exhausted." };
  }

  const nextCount = session.reconnect_count + 1;
  await setStatus(session.id, "reconnecting", { reconnect_count: nextCount });

  if (input.egressId) {
    const updated = await updateMultistreamEgress({
      egressId: input.egressId,
      addUrls: [input.pushUrl],
    });
    if ("error" in updated) {
      if (nextCount >= MAX_RECONNECT_ATTEMPTS) {
        await setStatus(session.id, "failed", {
          last_error: updated.error,
          reconnect_count: nextCount,
        });
      }
      return { ok: false, error: updated.error };
    }
    await setStatus(session.id, "live", { reconnect_count: nextCount });
    return { ok: true };
  }

  return { ok: false, error: "No active egress to reconnect" };
}

export async function handleStreamEgressWebhook(input: {
  egressId: string;
  error?: string | null;
  streamResults?: Array<{ url?: string; status?: string | number }>;
}): Promise<void> {
  const rows = await (
    await import("./repository")
  ).findSessionsByEgressId(input.egressId);

  for (const row of rows) {
    if (input.error) {
      await setStatus(row.id, "failed", {
        last_error:
          "Destination temporarily unavailable. Jimvio Live is still running.",
      });
      continue;
    }
    // Mark live if stream results indicate active
    if (row.status === "connecting" || row.status === "reconnecting") {
      await setStatus(row.id, "live");
    }
  }
}
