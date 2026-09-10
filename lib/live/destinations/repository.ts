import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { platformCapabilities, platformLabel, platformReadiness } from "./capabilities";
import {
  decryptCredentials,
  encryptCredentials,
  isEncryptionConfigured,
  maskSecret,
} from "./encryption";
import type {
  DestinationPlatform,
  EncryptedCredentialPayload,
  PublicDestination,
  PublicDestinationSession,
  DestinationSessionStatus,
  DestinationHealth,
} from "./types";
import { MAX_DESTINATIONS_PER_USER } from "./types";

type DestinationRow = {
  id: string;
  user_id: string;
  platform: DestinationPlatform;
  display_name: string;
  status: string;
  provider_account_id: string | null;
  provider_channel_id: string | null;
  provider_page_id: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown>;
  capabilities: Record<string, unknown>;
  encrypted_credentials: string | null;
  last_connected_at: string | null;
  last_used_at: string | null;
  last_error: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

type DestinationSessionRow = {
  id: string;
  live_session_id: string;
  destination_id: string;
  user_id: string;
  status: DestinationSessionStatus;
  provider_broadcast_id: string | null;
  provider_stream_id: string | null;
  egress_id: string | null;
  ingest_url_fingerprint: string | null;
  health: DestinationHealth;
  started_at: string | null;
  ended_at: string | null;
  last_health_at: string | null;
  last_error: string | null;
  reconnect_count: number;
  created_at: string;
  updated_at: string;
};

function db() {
  return createServiceRoleClient();
}

function toPublic(row: DestinationRow): PublicDestination {
  const readiness = platformReadiness(row.platform);
  const requiresApproval = readiness.status === "requires_approval";
  const hasCredentials = Boolean(row.encrypted_credentials);
  const accountConnected =
    hasCredentials &&
    row.status === "connected" &&
    !row.revoked_at;
  let streamKeyMasked: string | null = null;
  let rtmpUrlMasked: string | null = null;
  if (row.platform === "custom_rtmp" && row.encrypted_credentials) {
    try {
      const creds = decryptCredentials(row.encrypted_credentials);
      streamKeyMasked = maskSecret(creds.streamKey);
      rtmpUrlMasked = creds.rtmpUrl
        ? creds.rtmpUrl.replace(/\/[^/]+$/, "/***")
        : null;
    } catch {
      /* ignore decrypt for display */
    }
  }

  // Account connection status must not be overwritten by LIVE approval gate.
  // LIVE streaming eligibility remains requiresApproval / liveStreamingAllowed.
  const status: PublicDestination["status"] = accountConnected
    ? "connected"
    : requiresApproval
      ? "requires_approval"
      : (row.status as PublicDestination["status"]);

  return {
    id: row.id,
    platform: row.platform,
    displayName: row.display_name,
    status,
    providerAccountId: row.provider_account_id,
    providerChannelId: row.provider_channel_id,
    avatarUrl: row.avatar_url,
    capabilities: {
      ...platformCapabilities(row.platform),
      ...(row.capabilities as object),
    },
    lastConnectedAt: row.last_connected_at,
    lastUsedAt: row.last_used_at,
    lastError: row.last_error,
    hasCredentials,
    streamKeyMasked,
    rtmpUrlMasked,
    requiresApproval,
    approvalMessage: readiness.message,
    accountConnected,
    liveStreamingAllowed: !requiresApproval,
  };
}

export async function listUserDestinations(
  userId: string
): Promise<PublicDestination[]> {
  const { data } = await db()
    .from("live_destinations")
    .select("*")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: true });

  return ((data ?? []) as DestinationRow[]).map(toPublic);
}

export async function getDestinationForUser(
  destinationId: string,
  userId: string
): Promise<DestinationRow | null> {
  const { data } = await db()
    .from("live_destinations")
    .select("*")
    .eq("id", destinationId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .maybeSingle();
  return (data as DestinationRow) ?? null;
}

export async function getDestinationCredentials(
  destinationId: string,
  userId: string
): Promise<EncryptedCredentialPayload | null> {
  const row = await getDestinationForUser(destinationId, userId);
  if (!row?.encrypted_credentials) return null;
  return decryptCredentials(row.encrypted_credentials);
}

export async function upsertOAuthDestination(input: {
  userId: string;
  platform: DestinationPlatform;
  displayName: string;
  providerAccountId: string;
  providerChannelId?: string | null;
  providerPageId?: string | null;
  avatarUrl?: string | null;
  credentials: EncryptedCredentialPayload;
}): Promise<PublicDestination> {
  if (!isEncryptionConfigured()) {
    throw new Error("Destination encryption key is not configured");
  }

  const encrypted = encryptCredentials(input.credentials);
  const now = new Date().toISOString();

  const existing = await db()
    .from("live_destinations")
    .select("id")
    .eq("user_id", input.userId)
    .eq("platform", input.platform)
    .eq("provider_account_id", input.providerAccountId)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing.data?.id) {
    const { data, error } = await db()
      .from("live_destinations")
      .update({
        display_name: input.displayName.slice(0, 120),
        provider_channel_id: input.providerChannelId ?? null,
        provider_page_id: input.providerPageId ?? null,
        avatar_url: input.avatarUrl ?? null,
        encrypted_credentials: encrypted,
        status: "connected",
        last_connected_at: now,
        last_error: null,
        capabilities: platformCapabilities(input.platform),
        updated_at: now,
      })
      .eq("id", existing.data.id)
      .select("*")
      .single();
    if (error || !data) throw new Error("Failed to update destination");
    return toPublic(data as DestinationRow);
  }

  const { count } = await db()
    .from("live_destinations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .is("revoked_at", null);

  if ((count ?? 0) >= MAX_DESTINATIONS_PER_USER) {
    throw new Error(`Maximum of ${MAX_DESTINATIONS_PER_USER} destinations allowed`);
  }

  const { data, error } = await db()
    .from("live_destinations")
    .insert({
      user_id: input.userId,
      platform: input.platform,
      display_name: input.displayName.slice(0, 120),
      status: "connected",
      provider_account_id: input.providerAccountId,
      provider_channel_id: input.providerChannelId ?? null,
      provider_page_id: input.providerPageId ?? null,
      avatar_url: input.avatarUrl ?? null,
      encrypted_credentials: encrypted,
      capabilities: platformCapabilities(input.platform),
      last_connected_at: now,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error("Failed to save destination");
  return toPublic(data as DestinationRow);
}

export async function createCustomRtmpDestination(input: {
  userId: string;
  displayName: string;
  rtmpUrl: string;
  streamKey: string;
}): Promise<PublicDestination> {
  if (!isEncryptionConfigured()) {
    throw new Error("Destination encryption key is not configured");
  }

  const { count } = await db()
    .from("live_destinations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .is("revoked_at", null);

  if ((count ?? 0) >= MAX_DESTINATIONS_PER_USER) {
    throw new Error(`Maximum of ${MAX_DESTINATIONS_PER_USER} destinations allowed`);
  }

  const encrypted = encryptCredentials({
    rtmpUrl: input.rtmpUrl,
    streamKey: input.streamKey,
  });

  const { data, error } = await db()
    .from("live_destinations")
    .insert({
      user_id: input.userId,
      platform: "custom_rtmp",
      display_name: input.displayName.slice(0, 120) || "Custom RTMP",
      status: "connected",
      encrypted_credentials: encrypted,
      capabilities: platformCapabilities("custom_rtmp"),
      last_connected_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) throw new Error("Failed to create Custom RTMP destination");
  return toPublic(data as DestinationRow);
}

export async function updateCustomRtmpDestination(input: {
  destinationId: string;
  userId: string;
  displayName?: string;
  rtmpUrl?: string;
  streamKey?: string;
}): Promise<PublicDestination> {
  const row = await getDestinationForUser(input.destinationId, input.userId);
  if (!row || row.platform !== "custom_rtmp") {
    throw new Error("Destination not found");
  }

  const existing = row.encrypted_credentials
    ? decryptCredentials(row.encrypted_credentials)
    : {};

  const next = {
    rtmpUrl: input.rtmpUrl ?? existing.rtmpUrl,
    streamKey: input.streamKey ?? existing.streamKey,
  };

  const { data, error } = await db()
    .from("live_destinations")
    .update({
      display_name: (input.displayName ?? row.display_name).slice(0, 120),
      encrypted_credentials: encryptCredentials(next),
      status: "connected",
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.destinationId)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error || !data) throw new Error("Failed to update destination");
  return toPublic(data as DestinationRow);
}

export async function revokeDestination(
  destinationId: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db()
    .from("live_destinations")
    .update({
      revoked_at: now,
      encrypted_credentials: null,
      status: "disconnected",
      updated_at: now,
    })
    .eq("id", destinationId)
    .eq("user_id", userId);
}

export async function updateStoredCredentials(
  destinationId: string,
  userId: string,
  credentials: EncryptedCredentialPayload
): Promise<void> {
  await db()
    .from("live_destinations")
    .update({
      encrypted_credentials: encryptCredentials(credentials),
      updated_at: new Date().toISOString(),
    })
    .eq("id", destinationId)
    .eq("user_id", userId);
}

export async function createDestinationSession(input: {
  liveSessionId: string;
  destinationId: string;
  userId: string;
  status?: DestinationSessionStatus;
}): Promise<DestinationSessionRow> {
  const { data, error } = await db()
    .from("live_destination_sessions")
    .upsert(
      {
        live_session_id: input.liveSessionId,
        destination_id: input.destinationId,
        user_id: input.userId,
        status: input.status ?? "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "live_session_id,destination_id" }
    )
    .select("*")
    .single();

  if (error || !data) throw new Error("Failed to create destination session");
  return data as DestinationSessionRow;
}

export async function updateDestinationSession(
  id: string,
  patch: Partial<{
    status: DestinationSessionStatus;
    provider_broadcast_id: string | null;
    provider_stream_id: string | null;
    egress_id: string | null;
    ingest_url_fingerprint: string | null;
    health: DestinationHealth;
    started_at: string | null;
    ended_at: string | null;
    last_health_at: string | null;
    last_error: string | null;
    reconnect_count: number;
  }>
): Promise<void> {
  await db()
    .from("live_destination_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function listDestinationSessions(
  liveSessionId: string
): Promise<PublicDestinationSession[]> {
  const { data } = await db()
    .from("live_destination_sessions")
    .select(
      "*, live_destinations!inner(platform, display_name)"
    )
    .eq("live_session_id", liveSessionId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as Array<
    DestinationSessionRow & {
      live_destinations: { platform: DestinationPlatform; display_name: string };
    }
  >).map((row) => ({
    id: row.id,
    liveSessionId: row.live_session_id,
    destinationId: row.destination_id,
    platform: row.live_destinations.platform,
    displayName: row.live_destinations.display_name || platformLabel(row.live_destinations.platform),
    status: row.status,
    health: (row.health ?? { status: row.status }) as DestinationHealth,
    lastError: row.last_error,
    reconnectCount: row.reconnect_count,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  }));
}

export async function appendDestinationEvent(input: {
  destinationSessionId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  providerEventId?: string | null;
}): Promise<void> {
  await db().from("live_destination_events").insert({
    destination_session_id: input.destinationSessionId,
    event_type: input.eventType,
    payload: input.payload ?? {},
    provider_event_id: input.providerEventId ?? null,
  });
}

export async function findSessionsByEgressId(
  egressId: string
): Promise<DestinationSessionRow[]> {
  const { data } = await db()
    .from("live_destination_sessions")
    .select("*")
    .eq("egress_id", egressId);
  return (data ?? []) as DestinationSessionRow[];
}

export type { DestinationRow, DestinationSessionRow };
