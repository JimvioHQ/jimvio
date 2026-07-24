/**
 * Moderation Center labels, defaults, auto-mod catalog.
 */

import type { PermissionCapability } from "@/lib/community/workspace/permissions";
import type {
  AutoModRuleKey,
  ModerationAction,
  ModerationQueueId,
  RiskLevel,
} from "./types";

export const QUEUE_LABELS: Record<ModerationQueueId, string> = {
  reports: "Reports",
  messages: "Flagged Messages",
  posts: "Flagged Posts",
  files: "Flagged Files",
  spam: "Spam Queue",
  scam: "Scam Queue",
  appeals: "Pending Appeals",
  muted: "Muted Members",
  suspended: "Suspended Members",
  banned: "Banned Members",
  automod: "Auto Moderation",
  audit: "Audit Timeline",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const ACTION_LABELS: Record<ModerationAction, string> = {
  approve: "Approve",
  dismiss: "Dismiss",
  warn: "Warn",
  mute: "Mute",
  timeout: "Timeout",
  suspend: "Suspend",
  ban: "Ban",
  delete_content: "Delete Content",
  restore_content: "Restore Content",
  escalate: "Escalate",
  assign_moderator: "Assign Moderator",
  add_note: "Add Internal Note",
};

export const DEFAULT_AUTO_MOD_RULES: Array<{
  ruleKey: AutoModRuleKey;
  name: string;
  description: string;
  severity: RiskLevel;
  action: string;
  config: Record<string, unknown>;
}> = [
  {
    ruleKey: "spam_detection",
    name: "Spam Detection",
    description: "Flag repetitive promotional or junk content.",
    severity: "medium",
    action: "flag",
    config: { threshold: 3 },
  },
  {
    ruleKey: "duplicate_detection",
    name: "Duplicate Detection",
    description: "Catch near-identical posts and messages.",
    severity: "low",
    action: "flag",
    config: { windowMinutes: 30 },
  },
  {
    ruleKey: "scam_detection",
    name: "Scam Detection",
    description: "Detect phishing and payment scams.",
    severity: "high",
    action: "escalate",
    config: {},
  },
  {
    ruleKey: "toxic_language",
    name: "Toxic Language",
    description: "Flag harassment and abusive language.",
    severity: "high",
    action: "flag",
    config: {},
  },
  {
    ruleKey: "nsfw",
    name: "NSFW",
    description: "Detect adult or unsafe media.",
    severity: "high",
    action: "flag",
    config: {},
  },
  {
    ruleKey: "blocked_words",
    name: "Blocked Words",
    description: "Match community blocklists.",
    severity: "medium",
    action: "delete",
    config: { words: [] as string[] },
  },
  {
    ruleKey: "rate_limits",
    name: "Rate Limits",
    description: "Throttle rapid posting and messaging.",
    severity: "medium",
    action: "mute",
    config: { maxPerMinute: 20 },
  },
  {
    ruleKey: "link_protection",
    name: "Link Protection",
    description: "Restrict untrusted external links.",
    severity: "medium",
    action: "flag",
    config: { allowlist: [] as string[] },
  },
  {
    ruleKey: "invite_protection",
    name: "Invite Protection",
    description: "Block unauthorized invite spam.",
    severity: "medium",
    action: "flag",
    config: {},
  },
  {
    ruleKey: "ai_moderation",
    name: "AI Moderation",
    description: "Future-ready AI classification hooks.",
    severity: "medium",
    action: "flag",
    config: { provider: "future", enabled: false },
  },
];

export const DEFAULT_MUTE_MINUTES = 60;
export const DEFAULT_TIMEOUT_MINUTES = 24 * 60;
export const DEFAULT_SUSPEND_DAYS = 7;

/** Map moderator actions → capability engine keys. */
export function capabilityForModerationAction(
  action: string
): PermissionCapability {
  switch (action) {
    case "warn":
      return "moderation.warn";
    case "mute":
    case "timeout":
      return "moderation.mute";
    case "suspend":
      return "moderation.suspend";
    case "ban":
      return "moderation.ban";
    case "delete_content":
    case "restore_content":
      return "moderation.delete";
    case "approve":
    case "dismiss":
    case "escalate":
    case "assign_moderator":
    case "add_note":
    default:
      return "moderation.manage";
  }
}

export function inferQueueFromTargetType(
  targetType: string,
  reason: string
): string {
  const r = reason.toLowerCase();
  if (r.includes("spam")) return "spam";
  if (r.includes("scam") || r.includes("phish")) return "scam";
  if (targetType === "message") return "messages";
  if (targetType === "post" || targetType === "comment") return "posts";
  if (targetType === "file") return "files";
  return "reports";
}
