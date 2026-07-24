/**
 * Owner Console Groups — constants & defaults (no hardcoded magic in UI).
 */

import type {
  GroupDefaultContent,
  GroupPermissionConfig,
  GroupPrivacyMode,
} from "./types";
import { GROUP_PERMISSION_ACTORS } from "./types";

export const GROUP_ICON_PRESETS = [
  "💬",
  "📚",
  "📣",
  "📅",
  "✅",
  "🎯",
  "💡",
  "🚀",
  "🌟",
  "🔥",
  "💼",
  "🧠",
  "🛡️",
  "🎓",
  "🌐",
  "⚡",
] as const;

export const GROUP_COLOR_PRESETS = [
  "#0F766E",
  "#1D4ED8",
  "#B45309",
  "#BE123C",
  "#4338CA",
  "#047857",
  "#0369A1",
  "#7C2D12",
] as const;

export const DEFAULT_GROUP_ICON = GROUP_ICON_PRESETS[0];
export const DEFAULT_GROUP_COLOR = GROUP_COLOR_PRESETS[0];

/**
 * Groups are Telegram-style discussion spaces: members participate freely.
 * Structural actions (invite, sub-channels, live) stay staff-gated by default.
 */
export const DEFAULT_PERMISSION_CONFIG: GroupPermissionConfig = {
  whoCanJoin: "members",
  whoCanInvite: ["owner", "admin", "moderator"],
  whoCanCreateChannels: ["owner", "admin"],
  whoCanUpload: ["owner", "admin", "moderator", "creator", "mentor", "member"],
  whoCanCreateEvents: ["owner", "admin", "moderator", "creator"],
  whoCanCreateCourses: ["owner", "admin", "creator", "mentor"],
  whoCanCreateVoiceRooms: ["owner", "admin", "moderator", "creator"],
  whoCanCreateLiveSessions: ["owner", "admin", "creator"],
  whoCanGoLive: ["owner", "admin", "creator"],
};

export const DEFAULT_GROUP_CONTENT: GroupDefaultContent = {
  welcomeMessage: "Welcome to the group.",
  /** Empty by design — channels are created intentionally after the group. */
  defaultChannels: [],
  defaultResources: [],
  defaultRules: "Be respectful. Stay on topic. No spam.",
};

export const GROUP_PRIVACY_LABELS: Record<GroupPrivacyMode, string> = {
  public: "Public",
  private: "Private",
  invite_only: "Invite only",
  hidden: "Hidden",
};

export const GROUP_PRIVACY_DESCRIPTIONS: Record<GroupPrivacyMode, string> = {
  public: "Visible to all community members. Anyone can join.",
  private: "Listed for members. Join requires approval or access grant.",
  invite_only: "Members join only by invitation.",
  hidden: "Not listed in directories. Reachable by direct link/invite only.",
};

export const GROUP_STATUS_LABELS = {
  active: "Active",
  archived: "Archived",
  hidden: "Hidden",
  locked: "Locked",
} as const;

export const STAFF_ROLE_OPTIONS = [
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Group Admin" },
] as const;

export const DEFAULT_CHANNEL_TYPE_OPTIONS = [
  { value: "chat", label: "Chat" },
  { value: "posts", label: "Posts" },
  { value: "resources", label: "Resources" },
  { value: "course", label: "Course" },
  { value: "tasks", label: "Tasks" },
] as const;

export function accessTypeFromPrivacy(privacy: GroupPrivacyMode): string {
  switch (privacy) {
    case "private":
      return "paid";
    case "invite_only":
      return "premium";
    case "hidden":
      return "free";
    default:
      return "free";
  }
}

export function normalizePermissionConfig(
  raw: unknown
): GroupPermissionConfig {
  const base = { ...DEFAULT_PERMISSION_CONFIG };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.whoCanJoin === "string" &&
    ["everyone", "members", "invite_only", "approval"].includes(o.whoCanJoin)
  ) {
    base.whoCanJoin = o.whoCanJoin as GroupPermissionConfig["whoCanJoin"];
  }
  const keys: (keyof Omit<GroupPermissionConfig, "whoCanJoin">)[] = [
    "whoCanInvite",
    "whoCanCreateChannels",
    "whoCanUpload",
    "whoCanCreateEvents",
    "whoCanCreateCourses",
    "whoCanCreateVoiceRooms",
    "whoCanCreateLiveSessions",
    "whoCanGoLive",
  ];
  for (const key of keys) {
    const val = o[key];
    if (Array.isArray(val)) {
      base[key] = val.filter(
        (r): r is (typeof GROUP_PERMISSION_ACTORS)[number] =>
          typeof r === "string" &&
          (GROUP_PERMISSION_ACTORS as readonly string[]).includes(r)
      );
    }
  }
  // Back-compat: older configs only had whoCanGoLive for live/voice creation.
  if (!Array.isArray(o.whoCanCreateLiveSessions) && Array.isArray(o.whoCanGoLive)) {
    base.whoCanCreateLiveSessions = [...base.whoCanGoLive];
  }
  if (
    !Array.isArray(o.whoCanCreateVoiceRooms) &&
    Array.isArray(o.whoCanGoLive)
  ) {
    base.whoCanCreateVoiceRooms = [
      "owner",
      "admin",
      "moderator",
      "creator",
    ];
  }
  return base;
}

export function normalizeDefaultContent(raw: unknown): GroupDefaultContent {
  const base: GroupDefaultContent = {
    welcomeMessage: DEFAULT_GROUP_CONTENT.welcomeMessage,
    defaultChannels: [...DEFAULT_GROUP_CONTENT.defaultChannels],
    defaultResources: [],
    defaultRules: DEFAULT_GROUP_CONTENT.defaultRules,
  };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  if (typeof o.welcomeMessage === "string") base.welcomeMessage = o.welcomeMessage;
  if (typeof o.defaultRules === "string") base.defaultRules = o.defaultRules;
  if (Array.isArray(o.defaultResources)) {
    base.defaultResources = o.defaultResources.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0
    );
  }
  if (Array.isArray(o.defaultChannels)) {
    base.defaultChannels = o.defaultChannels
      .map((c) => {
        if (!c || typeof c !== "object") return null;
        const row = c as Record<string, unknown>;
        const name = typeof row.name === "string" ? row.name.trim() : "";
        const roomType =
          typeof row.roomType === "string"
            ? row.roomType
            : typeof row.room_type === "string"
              ? row.room_type
              : "chat";
        if (!name) return null;
        return { name, roomType };
      })
      .filter((x): x is { name: string; roomType: string } => Boolean(x));
  }
  return base;
}
