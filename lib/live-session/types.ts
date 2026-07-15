export interface LiveSessionInput {
  spaceId: string;
  title: string;
  description?: string;
  privacy?: "public" | "private" | "members_only";
  scheduledAt?: string;
  maxViewers?: number;
  settings?: Record<string, unknown>;
  enableTips?: boolean;
  enableTickets?: boolean;
  ticketPrice?: number;
}

export interface JoinResult {
  success: boolean;
  session?: LiveSessionDetail;
  accessToken?: string;
  chatToken?: string;
  hlsUrl?: string;
  userRole?: "host" | "viewer" | "moderator";
  webrtcSignalUrl?: string;
  error?: string;
}

export interface LiveSessionDetail {
  id: string;
  space_id: string;
  community_id: string;
  host_id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live" | "ended" | "cancelled";
  privacy: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  max_viewers: number;
  viewer_count: number;
  peak_viewers: number;
  stream_key: string | null;
  playback_url: string | null;
  recording_url: string | null;
  recording_started_at: string | null;
  recording_ended_at: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  space?: {
    id: string;
    name: string;
    slug: string;
    access_type: string;
  };
  host?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  space_access_type: string;
}

export interface BrowseOptions {
  status?: string[];
  spaceId?: string;
  limit?: number;
  cursor?: string;
}

export interface BrowseResult {
  sessions: LiveSessionDetail[];
  nextCursor?: string;
}

export interface SessionAccess {
  canJoin: boolean;
  requiresPayment: boolean;
  priceCents?: number;
  reason?: "free" | "paid" | "premium_required" | "ended" | "not_started";
}

export interface SendMessageInput {
  sessionId: string;
  type: "chat" | "qa" | "poll" | "reaction";
  content: string;
  metadata?: Record<string, unknown>;
  replyToId?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  userRole: "host" | "viewer" | "moderator";
  type: "chat" | "qa" | "poll" | "reaction";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  replyToId?: string;
}

export interface TipResult {
  success: boolean;
  transactionId: string;
}

export interface TicketResult {
  success: boolean;
  ticketId: string;
  accessToken: string;
}

export interface RecordingSession {
  recordingId: string;
  hlsUrl: string;
}

export interface RecordingResult {
  recordingId: string;
  playbackUrl: string;
}

export interface ModerationAction {
  type: "delete_message" | "ban_user" | "pin_message" | "mute_user";
  sessionId: string;
  targetId: string;
  reason?: string;
  durationMinutes?: number;
}

export interface CapabilityConfig {
  id: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface AccessConfig {
  type: "free" | "paid" | "premium" | "ticketed" | "subscription" | "custom";
  tiers?: string[];
  ticketIds?: string[];
  customStrategyId?: string;
  customStrategyConfig?: Record<string, unknown>;
}

export interface WebRTCConfig {
  simulcast: boolean;
  bitrate?: number;
}

export interface RecordingConfig {
  autoStart: boolean;
  quality: "720p" | "1080p" | "4k" | "adaptive";
}

export interface MonetizationConfig {
  tipsEnabled: boolean;
  ticketsEnabled: boolean;
}

export interface CapabilityConfig {
  id: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface AccessConfig {
  type: "free" | "paid" | "premium" | "ticketed" | "subscription" | "custom";
  tiers?: string[];
  ticketIds?: string[];
  customStrategyId?: string;
  customStrategyConfig?: Record<string, unknown>;
}

export interface WebRTCConfig {
  simulcast: boolean;
  bitrate?: number;
}

export interface RecordingConfig {
  autoStart: boolean;
  quality: "720p" | "1080p" | "4k" | "adaptive";
}

export interface MonetizationConfig {
  tipsEnabled: boolean;
  ticketsEnabled: boolean;
}

export interface CapabilityConfig {
  id: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface AccessConfig {
  type: "free" | "paid" | "premium" | "ticketed" | "subscription" | "custom";
  tiers?: string[];
  ticketIds?: string[];
  customStrategyId?: string;
  customStrategyConfig?: Record<string, unknown>;
}

export interface WebRTCConfig {
  simulcast: boolean;
  bitrate?: number;
}

export interface RecordingConfig {
  autoStart: boolean;
  quality: "720p" | "1080p" | "4k" | "adaptive";
}

export interface MonetizationConfig {
  tipsEnabled: boolean;
  ticketsEnabled: boolean;
}

export interface SessionConfig {
  spaceId: string;
  title: string;
  access: AccessConfig;
  capabilities: CapabilityConfig[];
  webrtc: WebRTCConfig;
  recording: RecordingConfig;
  monetization: MonetizationConfig;
}

/** Types for SWR hooks */
export interface UseLiveSessionsOptions {
  spaceId: string;
  options?: BrowseOptions;
  revalidate?: number;
}

export interface UseLiveSessionOptions {
  sessionId: string;
  accessToken: string;
  revalidate?: number;
}

export interface UseJoinSessionOptions {
  sessionId: string;
  paymentToken?: string;
}

export interface UseChatOptions {
  sessionId: string;
  chatToken: string;
  revalidate?: number;
}