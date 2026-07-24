/**
 * Live Commerce Network — vendor-agnostic media provider contracts.
 * LiveKit is the default adapter; Daily / Agora / 100ms / raw WebRTC can plug in later.
 */

export type LiveMediaVendor =
  | "livekit"
  | "daily"
  | "agora"
  | "100ms"
  | "webrtc"
  | "local";

export type LiveConnectionQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

export type LiveStudioLayout =
  | "presentation"
  | "grid"
  | "screen_share"
  | "classroom"
  | "spotlight"
  | "cinema";

export type LiveHostRole = "host" | "cohost" | "speaker" | "moderator" | "viewer";

export type LiveHostSeat = {
  id: string;
  name: string;
  role: LiveHostRole;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  onStage: boolean;
};

export type LiveStudioControls = {
  camera: boolean;
  microphone: boolean;
  screenShare: boolean;
  windowShare: boolean;
  backgroundBlur: boolean;
  noiseSuppression: boolean;
  recording: boolean;
  replayReady: boolean;
  layout: LiveStudioLayout;
  scene: string;
  liveSeconds: number;
  connectionQuality: LiveConnectionQuality;
};

export type LivePinnedOffer = {
  id: string;
  title: string;
  priceLabel: string;
  kind: "product" | "bundle" | "coupon" | "affiliate" | "flash";
  inventory: number | null;
  href: string;
  pinned: boolean;
};

export type LiveCommunitySignal = {
  chatRate: number;
  pollActive: boolean;
  qaOpen: number;
  reactionsPerMin: number;
  pinnedMessage: string | null;
  announcement: string | null;
};

export type LiveCourseSession = {
  title: string;
  slidesShared: boolean;
  whiteboardOpen: boolean;
  quizActive: boolean;
  attendance: number;
  certificateEligible: boolean;
  recordingUrl: string | null;
};

export type LiveAnalyticsSnapshot = {
  concurrent: number;
  peak: number;
  watchMinutes: number;
  revenue: number;
  orders: number;
  conversions: number;
  chatMessages: number;
  followerDelta: number;
  communityJoins: number;
};

export type LiveAiAssistItem = {
  id: string;
  kind:
    | "talking_point"
    | "chat_summary"
    | "question"
    | "spam"
    | "product"
    | "poll"
    | "caption"
    | "recap";
  title: string;
  body: string;
};

export type LiveClipDraft = {
  id: string;
  title: string;
  caption: string;
  kind: "highlight" | "short" | "clip";
  durationSec: number;
  status: "detected" | "draft" | "ready";
};

export type LiveNetworkContext = {
  base: string;
  communityId: string;
  communityName?: string;
  overview?: {
    liveNow?: number | null;
    memberCount?: number | null;
    membersJoinedThisWeek?: number | null;
    messagesThisWeek?: number | null;
    totalEarned?: number | null;
    healthScore?: { score: number } | null;
    activeLiveSession?: { href?: string; title?: string } | null;
    courses?: Array<{ id: string; title: string; href: string }> | null;
    featuredCourse?: { title?: string; href?: string } | null;
  } | null;
};

/** Media transport contract — do not couple UI to a single SFU vendor. */
export interface LiveMediaProvider {
  readonly id: LiveMediaVendor;
  readonly label: string;
  connect?(roomName: string): Promise<void> | void;
  disconnect?(): Promise<void> | void;
  getStudioDefaults(): LiveStudioControls;
  listLayouts(): LiveStudioLayout[];
  maxHosts(): number;
}

export interface LiveAnalyticsProvider {
  readonly id: string;
  snapshot(ctx: LiveNetworkContext): LiveAnalyticsSnapshot;
}

export interface LiveAiAssistProvider {
  readonly id: string;
  assist(ctx: LiveNetworkContext): LiveAiAssistItem[];
}

export interface LiveClippingProvider {
  readonly id: string;
  detect(ctx: LiveNetworkContext): LiveClipDraft[];
}
