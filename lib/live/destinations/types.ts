/** Multistream destination types — capability-honest, no fake support. */

export type DestinationPlatform =
  | "jimvio"
  | "youtube"
  | "twitch"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "custom_rtmp";

export type DestinationCapabilityStatus =
  | "supported"
  | "ready"
  | "requires_approval"
  | "unsupported"
  | "disconnected"
  | "error"
  | "reconnecting"
  | "connected"
  | "reconnect_required";

export type DestinationSessionStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "connecting"
  | "live"
  | "reconnecting"
  | "failed"
  | "stopped"
  | "skipped";

export type DestinationCapabilities = {
  oauth: boolean;
  createBroadcast: boolean;
  createStream: boolean;
  startBroadcast: boolean;
  stopBroadcast: boolean;
  metadata: boolean;
  privacy: boolean;
  health: boolean;
  chat: boolean;
  comments: boolean;
  thumbnail: boolean;
  customRTMP: boolean;
};

export type DestinationPrivacy = "public" | "unlisted" | "private";

export type LiveMetadata = {
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  category?: string | null;
  language?: string | null;
  privacy?: DestinationPrivacy;
  scheduledStart?: string | null;
};

export type EncryptedCredentialPayload = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string | null;
  streamKey?: string;
  rtmpUrl?: string;
  pageAccessToken?: string;
  scopes?: string[];
  extra?: Record<string, string>;
};

export type PreparedIngest = {
  rtmpUrl: string;
  /** Full push URL including stream key (server-only). Never send to browser. */
  pushUrl: string;
  providerBroadcastId?: string | null;
  providerStreamId?: string | null;
};

export type DestinationHealth = {
  status: DestinationSessionStatus;
  bitrateKbps?: number | null;
  fps?: number | null;
  resolution?: string | null;
  packetLoss?: number | null;
  droppedFrames?: number | null;
  latencyMs?: number | null;
  reconnectCount?: number;
  connectionDurationSec?: number | null;
  lastSuccessfulPacketAt?: string | null;
  lastProviderResponseAt?: string | null;
  errorReason?: string | null;
};

export type PublicDestination = {
  id: string;
  platform: DestinationPlatform;
  displayName: string;
  status: DestinationCapabilityStatus;
  providerAccountId: string | null;
  providerChannelId: string | null;
  avatarUrl: string | null;
  capabilities: DestinationCapabilities;
  lastConnectedAt: string | null;
  lastUsedAt: string | null;
  lastError: string | null;
  hasCredentials: boolean;
  /** Stream key masked for custom RTMP only */
  streamKeyMasked: string | null;
  rtmpUrlMasked: string | null;
  requiresApproval: boolean;
  approvalMessage: string | null;
  /**
   * Account OAuth connected (e.g. TikTok Login Kit).
   * Independent of LIVE multistream readiness.
   */
  accountConnected: boolean;
  /** When false, destination cannot be enabled for LIVE fan-out. */
  liveStreamingAllowed: boolean;
  /**
   * Official platform LIVE publishing capability available to Jimvio.
   * Distinct from accountConnected — TikTok Login Kit can be connected while
   * liveCapabilityAvailable remains false.
   */
  liveCapabilityAvailable: boolean;
};

export type PublicDestinationSession = {
  id: string;
  liveSessionId: string;
  destinationId: string;
  platform: DestinationPlatform;
  displayName: string;
  status: DestinationSessionStatus;
  health: DestinationHealth;
  lastError: string | null;
  reconnectCount: number;
  startedAt: string | null;
  endedAt: string | null;
};

export const MAX_DESTINATIONS_PER_USER = 20;
export const MAX_ACTIVE_DESTINATIONS_PER_LIVE = 8;
export const MAX_RECONNECT_ATTEMPTS = 4;
