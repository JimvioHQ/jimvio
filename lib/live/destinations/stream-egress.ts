/**
 * LiveKit Room Composite Stream Egress — RTMP/RTMPS fan-out.
 * One egress job per live session; multiple destination URLs with isolated reconnect.
 */

import {
  EgressClient,
  StreamOutput,
  StreamProtocol,
  type EgressInfo,
} from "livekit-server-sdk";
import {
  getLiveKitApiKey,
  getLiveKitApiSecret,
  getLiveKitUrl,
  liveKitRoomName,
} from "@/lib/live/livekit-config";
import { createEgressClient } from "@/lib/live/egress";

function hostUrlFromWs(wsUrl: string): string {
  return wsUrl.replace(/^ws:/, "http:").replace(/^wss:/, "https:");
}

export function getStreamEgressClient(): EgressClient | null {
  return createEgressClient();
}

export async function startMultistreamEgress(input: {
  sessionId: string;
  pushUrls: string[];
}): Promise<{ egressId: string; info: EgressInfo } | { error: string }> {
  const client = getStreamEgressClient();
  if (!client) {
    return { error: "LiveKit Egress is not configured" };
  }
  if (input.pushUrls.length === 0) {
    return { error: "No stream destinations to start" };
  }

  // Validate protocols only — URLs already SSRF-checked for custom RTMP
  for (const url of input.pushUrls) {
    if (!/^rtmps?:\/\//i.test(url) && !url.startsWith("jimvio://")) {
      return { error: "Invalid stream protocol" };
    }
  }

  const rtmpUrls = input.pushUrls.filter((u) => /^rtmps?:\/\//i.test(u));
  if (rtmpUrls.length === 0) {
    return { error: "No RTMP destinations to start" };
  }

  try {
    const roomName = liveKitRoomName(input.sessionId);
    const streamOutput = new StreamOutput({
      protocol: StreamProtocol.RTMP,
      urls: rtmpUrls,
    });

    const info = await client.startRoomCompositeEgress(roomName, streamOutput, {
      layout: "speaker",
    });

    return { egressId: info.egressId, info };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to start stream egress",
    };
  }
}

export async function updateMultistreamEgress(input: {
  egressId: string;
  addUrls?: string[];
  removeUrls?: string[];
}): Promise<{ ok: true; info: EgressInfo } | { error: string }> {
  const client = getStreamEgressClient();
  if (!client) return { error: "LiveKit Egress is not configured" };

  try {
    const info = await client.updateStream(
      input.egressId,
      input.addUrls ?? [],
      input.removeUrls ?? []
    );
    return { ok: true, info };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update stream egress",
    };
  }
}

export async function stopMultistreamEgress(
  egressId: string
): Promise<{ ok: true } | { error: string }> {
  const client = getStreamEgressClient();
  if (!client) return { error: "LiveKit Egress is not configured" };
  try {
    await client.stopEgress(egressId);
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to stop stream egress",
    };
  }
}

export async function listActiveStreamEgress(
  sessionId: string
): Promise<EgressInfo[]> {
  const url = getLiveKitUrl();
  const key = getLiveKitApiKey();
  const secret = getLiveKitApiSecret();
  if (!url || !key || !secret) return [];
  const client = new EgressClient(hostUrlFromWs(url), key, secret);
  try {
    const list = await client.listEgress({
      roomName: liveKitRoomName(sessionId),
      active: true,
    });
    return list.filter((e) => (e.streamResults?.length ?? 0) > 0);
  } catch {
    return [];
  }
}
