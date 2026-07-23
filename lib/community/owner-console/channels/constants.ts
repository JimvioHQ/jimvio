/**
 * Owner Console Channels — constants & defaults.
 */

import type {
  ChannelAutomationConfig,
  ChannelBehaviorConfig,
  ChannelPermissionConfig,
  ChannelTemplateId,
  ChannelVisibilityMode,
  OwnerChannelKind,
} from "./types";
import { CHANNEL_PERMISSION_ACTORS, OWNER_CHANNEL_KINDS } from "./types";

export const CHANNEL_ICON_PRESETS = [
  "💬",
  "📢",
  "📚",
  "🧠",
  "❓",
  "📈",
  "📁",
  "🎬",
  "🎤",
  "🔴",
  "🎓",
  "📅",
  "🛒",
  "💳",
  "🛟",
  "✨",
] as const;

export const CHANNEL_COLOR_PRESETS = [
  "#0F766E",
  "#1D4ED8",
  "#B45309",
  "#BE123C",
  "#4338CA",
  "#047857",
  "#0369A1",
  "#7C2D12",
] as const;

export const DEFAULT_CHANNEL_ICON = CHANNEL_ICON_PRESETS[0];
export const DEFAULT_CHANNEL_COLOR = CHANNEL_COLOR_PRESETS[0];

export const CHANNEL_KIND_LABELS: Record<OwnerChannelKind, string> = {
  discussion: "Discussion",
  announcement: "Announcement",
  resources: "Resources",
  knowledge: "Knowledge",
  qa: "Q&A",
  signals: "Signals",
  files: "Files",
  media: "Media",
  voice: "Voice",
  live: "Live",
  courses: "Courses",
  events: "Events",
  marketplace: "Marketplace",
  commerce: "Commerce",
  support: "Support",
  ai: "AI",
};

/** Product kind → DB rooms.room_type (ChatRoom-compatible). */
export const CHANNEL_KIND_TO_ROOM_TYPE: Record<OwnerChannelKind, string> = {
  discussion: "chat",
  announcement: "posts",
  resources: "resources",
  knowledge: "resources",
  qa: "chat",
  signals: "chat",
  files: "resources",
  media: "resources",
  voice: "voice",
  live: "live",
  courses: "course",
  events: "tasks",
  marketplace: "chat",
  commerce: "chat",
  support: "chat",
  ai: "chat",
};

export const CHANNEL_VISIBILITY_LABELS: Record<ChannelVisibilityMode, string> = {
  public: "Public",
  members: "Members only",
  private: "Private",
  invite_only: "Invite only",
  hidden: "Hidden",
};

export const CHANNEL_VISIBILITY_DESCRIPTIONS: Record<
  ChannelVisibilityMode,
  string
> = {
  public: "Visible to everyone in the community directory.",
  members: "Visible to community members.",
  private: "Visible only to granted members.",
  invite_only: "Join by invitation only.",
  hidden: "Hidden from directories; direct link or invite only.",
};

export const DEFAULT_PERMISSION_CONFIG: ChannelPermissionConfig = {
  whoCanView: ["owner", "admin", "moderator", "creator", "mentor", "vip", "verified", "member", "guest"],
  whoCanPost: ["owner", "admin", "moderator", "creator", "mentor", "vip", "verified", "member"],
  whoCanReply: ["owner", "admin", "moderator", "creator", "mentor", "vip", "verified", "member"],
  whoCanUpload: ["owner", "admin", "moderator", "creator", "mentor", "member"],
  whoCanPin: ["owner", "admin", "moderator"],
  whoCanModerate: ["owner", "admin", "moderator"],
  whoCanGoLive: ["owner", "admin", "creator"],
  whoCanCreateThreads: ["owner", "admin", "moderator", "creator", "member"],
};

export const DEFAULT_BEHAVIOR_CONFIG: ChannelBehaviorConfig = {
  slowModeSeconds: 0,
  readOnly: false,
  welcomeMessage: "Welcome to the channel.",
  autoArchiveDays: null,
  defaultTabs: ["home", "discussion"],
};

export const DEFAULT_AUTOMATION_CONFIG: ChannelAutomationConfig = {
  autoWelcome: true,
  autoArchive: false,
  autoAiSummary: false,
  autoPinRules: false,
  autoModeration: false,
  autoKnowledgeCapture: false,
};

export type ChannelTemplate = {
  id: ChannelTemplateId;
  label: string;
  kind: OwnerChannelKind;
  icon: string;
  description: string;
};

export const CHANNEL_TEMPLATES: ChannelTemplate[] = [
  {
    id: "general_chat",
    label: "General Chat",
    kind: "discussion",
    icon: "💬",
    description: "Everyday conversation hub",
  },
  {
    id: "announcements",
    label: "Announcements",
    kind: "announcement",
    icon: "📢",
    description: "Broadcast updates to members",
  },
  {
    id: "resources",
    label: "Resources",
    kind: "resources",
    icon: "📚",
    description: "Files, links, and docs",
  },
  {
    id: "signals",
    label: "Signals",
    kind: "signals",
    icon: "📈",
    description: "Trading or alert signals",
  },
  {
    id: "qa",
    label: "Q&A",
    kind: "qa",
    icon: "❓",
    description: "Questions and answers",
  },
  {
    id: "voice",
    label: "Voice Room",
    kind: "voice",
    icon: "🎤",
    description: "Voice hangout space",
  },
  {
    id: "live",
    label: "Live Room",
    kind: "live",
    icon: "🔴",
    description: "Live streaming hub",
  },
  {
    id: "knowledge",
    label: "Knowledge Hub",
    kind: "knowledge",
    icon: "🧠",
    description: "Knowledge capture and wiki",
  },
  {
    id: "course_discussion",
    label: "Course Discussion",
    kind: "courses",
    icon: "🎓",
    description: "Course cohort chat",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    kind: "marketplace",
    icon: "🛒",
    description: "Buys, sells, and offers",
  },
  {
    id: "support",
    label: "Support",
    kind: "support",
    icon: "🛟",
    description: "Member support desk",
  },
];

export function accessTypeFromVisibility(v: ChannelVisibilityMode): string {
  switch (v) {
    case "public":
      return "free";
    case "private":
      return "paid";
    case "invite_only":
      return "premium";
    case "hidden":
      return "inherit";
    default:
      return "inherit";
  }
}

export function normalizePermissionConfig(
  raw: unknown
): ChannelPermissionConfig {
  const base = { ...DEFAULT_PERMISSION_CONFIG };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const keys = Object.keys(base) as (keyof ChannelPermissionConfig)[];
  for (const key of keys) {
    const val = o[key];
    if (Array.isArray(val)) {
      base[key] = val.filter(
        (r): r is (typeof CHANNEL_PERMISSION_ACTORS)[number] =>
          typeof r === "string" &&
          (CHANNEL_PERMISSION_ACTORS as readonly string[]).includes(r)
      );
    }
  }
  return base;
}

export function normalizeBehaviorConfig(raw: unknown): ChannelBehaviorConfig {
  const base = { ...DEFAULT_BEHAVIOR_CONFIG, defaultTabs: [...DEFAULT_BEHAVIOR_CONFIG.defaultTabs] };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  if (typeof o.slowModeSeconds === "number") base.slowModeSeconds = Math.max(0, o.slowModeSeconds);
  if (typeof o.readOnly === "boolean") base.readOnly = o.readOnly;
  if (typeof o.welcomeMessage === "string") base.welcomeMessage = o.welcomeMessage;
  if (o.autoArchiveDays === null) base.autoArchiveDays = null;
  if (typeof o.autoArchiveDays === "number") base.autoArchiveDays = o.autoArchiveDays;
  if (Array.isArray(o.defaultTabs)) {
    base.defaultTabs = o.defaultTabs.filter((t): t is string => typeof t === "string");
  }
  return base;
}

export function normalizeAutomationConfig(
  raw: unknown
): ChannelAutomationConfig {
  const base = { ...DEFAULT_AUTOMATION_CONFIG };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof ChannelAutomationConfig)[]) {
    if (typeof o[key] === "boolean") base[key] = o[key] as boolean;
  }
  return base;
}

export function parseChannelKind(
  kind: string | null | undefined,
  roomType: string | null | undefined
): OwnerChannelKind {
  if (kind && (OWNER_CHANNEL_KINDS as readonly string[]).includes(kind)) {
    return kind as OwnerChannelKind;
  }
  const rt = roomType ?? "chat";
  if (rt === "posts") return "announcement";
  if (rt === "resources") return "resources";
  if (rt === "voice") return "voice";
  if (rt === "live") return "live";
  if (rt === "course") return "courses";
  if (rt === "tasks") return "events";
  if (rt === "files") return "files";
  if (rt === "signals") return "signals";
  if (rt === "qa") return "qa";
  return "discussion";
}
