/**
 * LiveKit Egress → file/S3 → Cloudinary replay pipeline.
 * Survives browser close (server-side egress). Media transport only — roles verified by callers.
 *
 * LiveKit Cloud requires a cloud storage destination on EncodedFileOutput.output
 * (S3 / Azure / GCP). A filepath-only EncodedFileOutput yields:
 *   "request has missing or invalid field: output"
 */

import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
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

export type EgressFileOutputResult =
  | { ok: true; file: EncodedFileOutput; filepath: string }
  | { ok: false; error: string };

/** Build a valid LiveKit Cloud file output (S3-compatible storage required). */
export function buildEgressFileOutput(sessionId: string): EgressFileOutputResult {
  const filepath = `jimvio/live/${sessionId}/${Date.now()}.mp4`;
  const bucket = process.env.LIVEKIT_EGRESS_S3_BUCKET?.trim();
  const accessKey = process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY?.trim();
  const secret = process.env.LIVEKIT_EGRESS_S3_SECRET?.trim();
  const region = process.env.LIVEKIT_EGRESS_S3_REGION?.trim() || "auto";
  const endpoint = process.env.LIVEKIT_EGRESS_S3_ENDPOINT?.trim();

  if (!bucket || !accessKey || !secret) {
    return {
      ok: false,
      error:
        "Recording storage is not configured. Set LIVEKIT_EGRESS_S3_BUCKET, LIVEKIT_EGRESS_S3_ACCESS_KEY, and LIVEKIT_EGRESS_S3_SECRET.",
    };
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

export async function startSessionEgress(input: {
  sessionId: string;
  communityId: string | null;
  userId: string;
}): Promise<{ recordingId: string; egressId: string; alreadyActive?: boolean } | { error: string; status: number }> {
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
    .select("id, egress_id")
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
    };
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
    const roomName = liveKitRoomName(input.sessionId);
    // EncodedOutputs.file form → fileOutputs[] + valid EncodedFileOutput.output (S3).
    const info: EgressInfo = await client.startRoomCompositeEgress(
      roomName,
      { file: fileOut.file },
      { layout: "speaker" }
    );

    const egressId = info.egressId;
    await db
      .from("live_recordings")
      .update({
        egress_id: egressId,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", recording.id);

    return { recordingId: recording.id as string, egressId };
  } catch (e) {
    await db
      .from("live_recordings")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message : "Egress start failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", recording.id);
    return {
      error: e instanceof Error ? e.message : "Egress start failed",
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
}): Promise<void> {
  const db = createServiceRoleClient();
  await db
    .from("live_recordings")
    .update({
      status: input.error ? "failed" : "ready",
      cloudinary_url: input.cloudinaryUrl ?? null,
      cloudinary_public_id: input.cloudinaryPublicId ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
      duration_seconds: input.durationSeconds ?? null,
      byte_size: input.byteSize ?? null,
      error: input.error ?? null,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("egress_id", input.egressId);
}
