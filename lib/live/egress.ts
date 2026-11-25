/**
 * LiveKit Egress → file/S3 → Cloudinary replay pipeline.
 * Survives browser close (server-side egress). Media transport only — roles verified by callers.
 *
 * LiveKit Cloud requires a cloud storage destination on EncodedFileOutput.output
 * (S3 / Azure / GCP). A filepath-only EncodedFileOutput yields:
 *   "request has missing or invalid field: output"
 *
 * Status honesty:
 * - starting = StartEgress accepted, waiting for LiveKit ACTIVE / media start
 * - active   = egress confirmed running (EGRESS_ACTIVE)
 * - ending / ready / failed = terminal lifecycle
 *
 * Never treat StartEgress HTTP success as “recording”.
 */

import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EgressStatus,
  RoomServiceClient,
  S3Upload,
  type EgressInfo,
} from "livekit-server-sdk";
import {
  getLiveKitApiKey,
  getLiveKitApiSecret,
  getLiveKitUrl,
  liveKitRoomName,
} from "@/lib/live/livekit-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { liveStudioLog } from "@/lib/live/observability";
import { normalizeEgressStorageError } from "@/lib/live/egress-errors";
import { extractEgressFileResult } from "@/lib/live/egress-file-result";
import { getCanonicalAppOrigin } from "@/lib/app-origin";

function hostUrlFromWs(wsUrl: string): string {
  // wss://xxx.livekit.cloud → https://xxx.livekit.cloud
  return wsUrl.replace(/^ws:/, "http:").replace(/^wss:/, "https:");
}

export function createEgressClient(): EgressClient | null {
  const url = getLiveKitUrl();
  const key = getLiveKitApiKey();
  const secret = getLiveKitApiSecret();
  if (!url || !key || !secret) return null;
  return new EgressClient(hostUrlFromWs(url), key, secret);
}

function createRoomServiceClient(): RoomServiceClient | null {
  const url = getLiveKitUrl();
  const key = getLiveKitApiKey();
  const secret = getLiveKitApiSecret();
  if (!url || !key || !secret) return null;
  return new RoomServiceClient(hostUrlFromWs(url), key, secret);
}

/** Public template URL for room-composite (avatar-only safe start signal). */
export function egressCompositeTemplateBaseUrl(): string {
  return `${getCanonicalAppOrigin()}/live/egress-template`;
}

export type EgressFileOutputResult =
  | { ok: true; file: EncodedFileOutput; filepath: string }
  | { ok: false; error: string };

/** Build a valid LiveKit Cloud file output (S3-compatible storage required). */
export function buildEgressFileOutput(sessionId: string): EgressFileOutputResult {
  const filepath = `jimvio/live/${sessionId}/${Date.now()}.mp4`;
  const bucket = process.env.LIVEKIT_EGRESS_S3_BUCKET?.trim();
  const accessKey = process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY?.trim();
  const secret = process.env.LIVEKIT_EGRESS_S3_SECRET?.trim();
  const region = process.env.LIVEKIT_EGRESS_S3_REGION?.trim() || "us-east-005";
  const endpoint = process.env.LIVEKIT_EGRESS_S3_ENDPOINT?.trim();

  if (!bucket || !accessKey || !secret) {
    return {
      ok: false,
      error:
        "Recording storage is not configured. Set LIVEKIT_EGRESS_S3_BUCKET, LIVEKIT_EGRESS_S3_ACCESS_KEY, and LIVEKIT_EGRESS_S3_SECRET.",
    };
  }

  // A malformed endpoint makes the SDK emit an Egress output rejected by LiveKit.
  // Fail before creating a recording row so the UI gets an actionable 503.
  if (endpoint) {
    try {
      const parsed = new URL(endpoint);
      if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
        throw new Error("invalid endpoint");
      }
    } catch {
      return {
        ok: false,
        error:
          "Recording storage endpoint is invalid. Set LIVEKIT_EGRESS_S3_ENDPOINT to the provider's HTTPS S3-compatible endpoint.",
      };
    }
  }

  const file = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey,
        secret,
        bucket,
        region,
        endpoint: endpoint || undefined,
        forcePathStyle: Boolean(endpoint),
      }),
    },
  });

  return { ok: true, file, filepath };
}

function isTerminalRecordingStatus(status: string | null | undefined): boolean {
  return status === "ready" || status === "failed";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Room-composite (default template) only signals START_RECORDING after a track
 * is subscribed. Jimvio supports avatar-only hosts, so we use a custom template
 * that signals start after room connect. Still wait for at least one real
 * participant so egress does not join an empty room.
 */
async function waitForRoomParticipant(roomName: string): Promise<
  | { ok: true; identity: string; hasScreenShare: boolean; hasVideo: boolean }
  | { ok: false; error: string }
> {
  const rooms = createRoomServiceClient();
  if (!rooms) {
    return { ok: false, error: "LiveKit room service is not configured" };
  }

  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try {
      const participants = await rooms.listParticipants(roomName);
      const human = participants.find(
        (p) => !p.identity?.startsWith("EG_") && p.identity !== "egress"
      );
      if (human?.identity) {
        const tracks = human.tracks ?? [];
        // TrackSource.SCREEN_SHARE = 3, CAMERA = 1 (livekit protocol)
        const hasScreenShare = tracks.some((t) => Number(t.source) === 3);
        const hasVideo = tracks.some(
          (t) => t.type === 1 /* VIDEO */ || Number(t.source) === 1 || Number(t.source) === 3
        );
        return {
          ok: true,
          identity: human.identity,
          hasScreenShare,
          hasVideo,
        };
      }
    } catch {
      // Room may not exist yet while the host is still connecting.
    }
    await sleep(400);
  }

  return {
    ok: false,
    error:
      "Live room is not ready for recording yet. Stay connected and try again in a moment.",
  };
}

async function waitForEgressRunning(
  client: EgressClient,
  egressId: string,
  timeoutMs = 14_000
): Promise<{ status: "active" } | { status: "failed"; error: string } | { status: "starting" }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const list = await client.listEgress({ egressId });
      const info = list[0];
      if (!info) {
        await sleep(500);
        continue;
      }
      const st = info.status;
      if (st === EgressStatus.EGRESS_ACTIVE) {
        return { status: "active" };
      }
      const failed =
        Boolean(info.error) ||
        st === EgressStatus.EGRESS_FAILED ||
        st === EgressStatus.EGRESS_ABORTED ||
        st === EgressStatus.EGRESS_LIMIT_REACHED ||
        st === EgressStatus.EGRESS_COMPLETE;
      if (failed) {
        return {
          status: "failed",
          error: normalizeEgressStorageError(info.error || "Recording could not be saved — egress aborted before media started"),
        };
      }
    } catch {
      // transient list errors — keep polling
    }
    await sleep(500);
  }
  return { status: "starting" };
}

export async function startSessionEgress(input: {
  sessionId: string;
  communityId: string | null;
  userId: string;
}): Promise<
  | { recordingId: string; egressId: string; alreadyActive?: boolean; status: "starting" | "active" }
  | { error: string; status: number }
> {
  const client = createEgressClient();
  if (!client) {
    return { error: "LiveKit Egress is not configured", status: 503 };
  }

  const fileOut = buildEgressFileOutput(input.sessionId);
  if (!fileOut.ok) {
    return { error: fileOut.error, status: 503 };
  }

  const db = createServiceRoleClient();
  const { data: existing } = await db
    .from("live_recordings")
    .select("id, egress_id, status")
    .eq("session_id", input.sessionId)
    .in("status", ["starting", "active"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id && existing.egress_id) {
    return {
      recordingId: existing.id as string,
      egressId: existing.egress_id as string,
      alreadyActive: true,
      status: existing.status === "active" ? "active" : "starting",
    };
  }

  const roomName = liveKitRoomName(input.sessionId);
  const ready = await waitForRoomParticipant(roomName);
  if (!ready.ok) {
    return { error: ready.error, status: 409 };
  }

  const { data: recording, error: insertErr } = await db
    .from("live_recordings")
    .insert({
      session_id: input.sessionId,
      community_id: input.communityId,
      started_by: input.userId,
      status: "starting",
    })
    .select("id")
    .single();

  if (insertErr || !recording) {
    return { error: insertErr?.message ?? "Failed to create recording row", status: 400 };
  }

  try {
    // EncodedOutputs.file form → fileOutputs[] + valid EncodedFileOutput.output (S3).
    // customBaseUrl: avatar-only safe START_RECORDING (see /live/egress-template).
    liveStudioLog("info", "recording_start", {
      sessionId: input.sessionId,
      roomName,
      participant: ready.identity,
      hasScreenShare: ready.hasScreenShare,
      hasVideo: ready.hasVideo,
    });

    // Template waits for decoded screen/camera frames when those publications
    // exist (see /live/egress-template). Server only gates on participant join.
    const info: EgressInfo = await client.startRoomCompositeEgress(
      roomName,
      { file: fileOut.file },
      {
        layout: "speaker",
        customBaseUrl: egressCompositeTemplateBaseUrl(),
      }
    );

    const egressId = info.egressId;
    await db
      .from("live_recordings")
      .update({
        egress_id: egressId,
        status: "starting",
        updated_at: new Date().toISOString(),
      })
      .eq("id", recording.id);

    const confirmed = await waitForEgressRunning(client, egressId);
    if (confirmed.status === "failed") {
      await db
        .from("live_recordings")
        .update({
          status: "failed",
          error: confirmed.error,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", recording.id);
      return { error: confirmed.error, status: 500 };
    }

    if (confirmed.status === "active") {
      await db
        .from("live_recordings")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", recording.id);
      return { recordingId: recording.id as string, egressId, status: "active" };
    }

    // Still starting — client + reconcile will promote to active or failed.
    return { recordingId: recording.id as string, egressId, status: "starting" };
  } catch (e) {
    await db
      .from("live_recordings")
      .update({
        status: "failed",
        error: normalizeEgressStorageError(e instanceof Error ? e.message : "Egress start failed"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", recording.id);
    return {
      error: normalizeEgressStorageError(e instanceof Error ? e.message : "Egress start failed"),
      status: 500,
    };
  }
}

export async function stopSessionEgress(input: {
  sessionId: string;
  userId: string;
}): Promise<{ ok: true; recordingId: string } | { error: string; status: number }> {
  const client = createEgressClient();
  if (!client) return { error: "LiveKit Egress is not configured", status: 503 };

  const db = createServiceRoleClient();
  const { data: recording } = await db
    .from("live_recordings")
    .select("id, egress_id, started_by")
    .eq("session_id", input.sessionId)
    .in("status", ["starting", "active"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!recording?.egress_id) {
    return { error: "No active recording", status: 404 };
  }
  if (recording.started_by !== input.userId) {
    // Host may stop; ownership check also done at API with canRecord
  }

  try {
    await client.stopEgress(recording.egress_id);
    await db
      .from("live_recordings")
      .update({
        status: "ending",
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", recording.id);
    return { ok: true, recordingId: recording.id as string };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Egress stop failed",
      status: 500,
    };
  }
}

export async function markRecordingReady(input: {
  egressId: string;
  cloudinaryUrl?: string | null;
  cloudinaryPublicId?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  byteSize?: number | null;
  error?: string | null;
  /** When true, allow ready recovery from the known empty-location failure. */
  allowRecoverFromFailed?: boolean;
}): Promise<void> {
  const db = createServiceRoleClient();
  const { data: row } = await db
    .from("live_recordings")
    .select("id, status, error")
    .eq("egress_id", input.egressId)
    .maybeSingle();

  if (!row?.id) return;

  const current = row.status as string;
  const nextFailed = Boolean(input.error);
  const nextReady = !nextFailed;

  // Never flip READY → FAILED or FAILED → READY after a final authoritative state,
  // except the explicit empty-location recovery path.
  if (current === "ready" && nextFailed) {
    return;
  }
  if (
    current === "failed" &&
    nextReady &&
    !(
      input.allowRecoverFromFailed &&
      row.error === "Egress completed without a storage location"
    )
  ) {
    return;
  }
  if (isTerminalRecordingStatus(current) && current === (nextFailed ? "failed" : "ready")) {
    // Idempotent finalize — allow metadata refresh only for same terminal state.
  }

  const playableLocation =
    nextReady && input.cloudinaryUrl && /^https?:\/\//i.test(input.cloudinaryUrl)
      ? input.cloudinaryUrl
      : nextReady
        ? input.cloudinaryUrl ?? null
        : null;

  await db
    .from("live_recordings")
    .update({
      status: nextFailed ? "failed" : "ready",
      cloudinary_url: playableLocation,
      cloudinary_public_id: nextFailed ? null : input.cloudinaryPublicId ?? null,
      thumbnail_url: nextFailed ? null : input.thumbnailUrl ?? null,
      duration_seconds: nextFailed ? null : input.durationSeconds ?? null,
      byte_size: nextFailed ? null : input.byteSize ?? null,
      error: input.error ?? null,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
}

/**
 * When LiveKit webhooks are delayed/missing, reconcile "ending"/stale rows from
 * LiveKit egress status so Ready/playback can complete without a page refresh.
 *
 * Also recovers rows incorrectly marked failed when fileResults was empty but
 * the deprecated result.file location was present (LiveKit node-sdks#625).
 */
export async function reconcileSessionRecordings(sessionId: string): Promise<void> {
  const client = createEgressClient();
  if (!client) return;

  const db = createServiceRoleClient();
  const { data: openRows } = await db
    .from("live_recordings")
    .select("id, egress_id, status, error")
    .eq("session_id", sessionId)
    .in("status", ["starting", "active", "ending"])
    .not("egress_id", "is", null)
    .limit(10);

  const { data: recoverable } = await db
    .from("live_recordings")
    .select("id, egress_id, status, error")
    .eq("session_id", sessionId)
    .eq("status", "failed")
    .eq("error", "Egress completed without a storage location")
    .not("egress_id", "is", null)
    .limit(10);

  const rows = [...(openRows ?? []), ...(recoverable ?? [])];
  if (!rows.length) return;

  for (const row of rows) {
    const egressId = row.egress_id as string | null;
    if (!egressId) continue;
    try {
      const list = await client.listEgress({ egressId });
      const info = list[0];
      if (!info) continue;

      const status = info.status;
      const failed =
        Boolean(info.error) ||
        status === EgressStatus.EGRESS_FAILED ||
        status === EgressStatus.EGRESS_ABORTED ||
        status === EgressStatus.EGRESS_LIMIT_REACHED;
      const complete = status === EgressStatus.EGRESS_COMPLETE;
      const file = extractEgressFileResult(info);
      const location = file.location;

      if (complete || failed) {
        const error =
          failed
            ? info.error || "Egress failed"
            : !location
              ? "Egress completed without a storage location"
              : null;
        await markRecordingReady({
          egressId,
          cloudinaryUrl: error ? null : location,
          durationSeconds: file.durationNs
            ? Math.round(file.durationNs / 1e9)
            : null,
          byteSize: file.sizeBytes,
          error,
          allowRecoverFromFailed: row.status === "failed",
        });
        liveStudioLog(error ? "error" : "info", "egress_webhook", {
          egressId,
          sessionId,
          source: "reconcile",
          failed: Boolean(error),
          hasLocation: Boolean(location),
          status: String(status),
          error: error ? error.slice(0, 300) : null,
          fileResults: info.fileResults?.length ?? 0,
          fileSource: file.source,
          hasFilename: Boolean(file.filename),
          hasFileLocation: Boolean(location),
          fileSize: file.sizeBytes != null ? String(file.sizeBytes) : null,
          egressError: info.error ? String(info.error).slice(0, 300) : null,
        });
      } else if (status === EgressStatus.EGRESS_ACTIVE && row.status !== "active") {
        await db
          .from("live_recordings")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      } else if (
        status === EgressStatus.EGRESS_STARTING &&
        row.status !== "starting" &&
        row.status !== "active"
      ) {
        await db
          .from("live_recordings")
          .update({
            status: "starting",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
    } catch (e) {
      liveStudioLog("error", "egress_webhook_failed", {
        sessionId,
        egressId,
        source: "reconcile",
        error: e instanceof Error ? e.message : "reconcile_failed",
      });
    }
  }
}
