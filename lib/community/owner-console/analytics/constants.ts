/**
 * Analytics labels, ranges, score helpers.
 */

import type {
  AnalyticsRangeId,
  AnalyticsSectionId,
  ScoreLabel,
} from "./types";

export const SECTION_LABELS: Record<AnalyticsSectionId, string> = {
  overview: "Overview",
  members: "Members",
  groups: "Groups",
  channels: "Channels",
  messages: "Messages",
  knowledge: "Knowledge",
  courses: "Courses",
  commerce: "Commerce",
  live: "Live",
  events: "Events",
  moderation: "Moderation",
  growth: "Growth",
  retention: "Retention",
  engagement: "Engagement",
  ai: "AI Insights",
};

export const RANGE_LABELS: Record<AnalyticsRangeId, string> = {
  today: "Today",
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  custom: "Custom Range",
};

export function rangeToDays(range: AnalyticsRangeId): number {
  switch (range) {
    case "today":
      return 1;
    case "7d":
      return 7;
    case "90d":
      return 90;
    case "custom":
    case "30d":
    default:
      return 30;
  }
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreTier(score: number): ScoreLabel {
  if (score >= 80) return "Excellent";
  if (score >= 62) return "Strong";
  if (score >= 42) return "Steady";
  return "Building";
}

export function rangeBounds(
  range: AnalyticsRangeId,
  customStart?: string | null,
  customEnd?: string | null
): { start: Date; end: Date; startIso: string; endIso: string } {
  const end = customEnd ? new Date(customEnd) : new Date();
  const days = rangeToDays(range);
  const start = customStart
    ? new Date(customStart)
    : new Date(end.getTime() - days * 86_400_000);
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}
