/**
 * Live Collaboration Suite — domain types (Phase 6).
 * Extends Live Studio; never forks ChatRoom or LiveKit.
 */

export const LIVE_ROOM_TYPES = [
  "voice",
  "video",
  "stage",
  "workshop",
  "mentorship",
  "office_hours",
  "ama",
  "webinar",
  "live_shopping",
  "creator_meeting",
] as const;

export type LiveRoomType = (typeof LIVE_ROOM_TYPES)[number];

export const LIVE_ROOM_TYPE_LABELS: Record<LiveRoomType, string> = {
  voice: "Voice Room",
  video: "Video Room",
  stage: "Stage",
  workshop: "Workshop",
  mentorship: "Mentorship",
  office_hours: "Office Hours",
  ama: "AMA",
  webinar: "Webinar",
  live_shopping: "Live Shopping",
  creator_meeting: "Creator Meeting",
};

export const LIVE_LAYOUT_PANELS = [
  "header",
  "stage",
  "participants",
  "chat",
  "resources",
  "tasks",
  "knowledge",
  "ai",
] as const;

export type LiveLayoutPanel = (typeof LIVE_LAYOUT_PANELS)[number];

export const SCREEN_SHARE_TARGETS = [
  "entire_screen",
  "window",
  "browser_tab",
] as const;

export type ScreenShareTarget = (typeof SCREEN_SHARE_TARGETS)[number];

export const SCREEN_SHARE_QUALITY = ["standard", "high"] as const;
export type ScreenShareQuality = (typeof SCREEN_SHARE_QUALITY)[number];

export type WhiteboardTool = "draw" | "sticky" | "shape" | "text" | "pointer";

export type WhiteboardStroke = {
  id: string;
  tool: WhiteboardTool;
  color: string;
  points: { x: number; y: number }[];
  text?: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
};

export type SharedNoteVersion = {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
};

export type LiveSharedNotes = {
  sessionId: string;
  body: string;
  versions: SharedNoteVersion[];
  updatedAt: string;
};

export type LiveReactionKind = "emoji" | "raise_hand" | "applause";

export type LiveReaction = {
  id: string;
  sessionId: string;
  kind: LiveReactionKind;
  emoji?: string;
  userId: string | null;
  userName: string | null;
  createdAt: string;
};

export type LivePollOption = { id: string; label: string; votes: number };

export type LivePoll = {
  id: string;
  sessionId: string;
  question: string;
  options: LivePollOption[];
  active: boolean;
  createdAt: string;
};

export type LiveQaItem = {
  id: string;
  sessionId: string;
  body: string;
  authorName: string | null;
  upvotes: number;
  answered: boolean;
  createdAt: string;
};

export type LiveRecordingMeta = {
  id: string;
  sessionId: string;
  title: string;
  durationSec: number | null;
  url: string | null;
  ready: boolean;
  transcriptPlaceholder: string;
  bookmarks: { id: string; label: string; atSec: number }[];
  chapters: { id: string; title: string; atSec: number }[];
  createdAt: string;
};

export type LiveKnowledgeCapture = {
  sessionId: string;
  summary: string;
  keyDecisions: string[];
  actionItems: string[];
  resources: string[];
  /** Placeholder until backend AI persists cards */
  knowledgeCardIds: string[];
  updatedAt: string;
};

export type LiveCreatorToolsState = {
  sessionId: string;
  cohostIds: string[];
  moderatorIds: string[];
  guestSpeakerIds: string[];
  waitingRoomEnabled: boolean;
  waitingUserIds: string[];
  inviteLink: string | null;
};
