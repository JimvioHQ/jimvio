/**
 * Member personalization — visits, bookmarks, continue state, personal activity.
 * Client store + server `community_member_visits` for cross-device resume.
 */

export const PERSONAL_ITEM_KINDS = [
  "group",
  "channel",
  "course",
  "resource",
  "knowledge",
  "event",
  "message",
  "live",
  "creator",
] as const;

export type PersonalItemKind = (typeof PERSONAL_ITEM_KINDS)[number];

export type PersonalVisit = {
  id: string;
  kind: PersonalItemKind;
  communityId: string;
  title: string;
  href: string;
  subtitle?: string | null;
  visitedAt: string;
};

export type PersonalBookmark = {
  id: string;
  kind: PersonalItemKind;
  communityId: string;
  title: string;
  href: string;
  subtitle?: string | null;
  savedAt: string;
};

export type PersonalActivity = {
  id: string;
  communityId: string;
  verb: string;
  title: string;
  href?: string | null;
  at: string;
};

export type ContinueLearningItem = {
  id: string;
  kind: "course" | "resource" | "knowledge" | "guide";
  communityId?: string;
  title: string;
  href: string;
  progress?: number;
  lastAt: string;
};

export type SmartRecommendation = {
  id: string;
  kind: PersonalItemKind;
  title: string;
  reason: string;
  href: string;
  score: number;
};

export type NotificationPriority =
  | "mention"
  | "reply"
  | "announcement"
  | "live"
  | "course"
  | "resource"
  | "other";

export const NOTIFICATION_PRIORITY_ORDER: NotificationPriority[] = [
  "mention",
  "reply",
  "live",
  "announcement",
  "course",
  "resource",
  "other",
];

export function notificationPriorityWeight(p: NotificationPriority): number {
  const i = NOTIFICATION_PRIORITY_ORDER.indexOf(p);
  return i < 0 ? 99 : i;
}
