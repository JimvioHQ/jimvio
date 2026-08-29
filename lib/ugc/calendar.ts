import type { UgcLocale, UgcMessageKey } from "@/lib/ugc/i18n/messages";

export const UGC_CALENDAR_EVENT_TYPES = [
  "campaign_start",
  "campaign_end",
  "application_deadline",
  "submission_deadline",
  "payout",
] as const;

export type UgcCalendarEventType = (typeof UGC_CALENDAR_EVENT_TYPES)[number];

export type UgcCalendarFilter = "all" | "campaigns" | "submissions" | "payouts";

export type UgcCalendarListGroupId = "today" | "tomorrow" | "thisWeek" | "later";

export type UgcCalendarEvent = {
  id: string;
  type: UgcCalendarEventType;
  title: string;
  date: string;
  href: string;
  campaign_id: string | null;
  status: string | null;
};

export const UGC_CALENDAR_FILTERS: UgcCalendarFilter[] = [
  "all",
  "campaigns",
  "submissions",
  "payouts",
];

const SKIP_CAMPAIGN_STATUSES = new Set(["draft", "cancelled"]);

export function isSkippedCampaignStatus(status: string | null | undefined): boolean {
  return Boolean(status && SKIP_CAMPAIGN_STATUSES.has(status));
}

export function calendarEventMatchesFilter(
  type: UgcCalendarEventType,
  filter: UgcCalendarFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "campaigns") {
    return (
      type === "campaign_start" ||
      type === "campaign_end" ||
      type === "application_deadline"
    );
  }
  if (filter === "submissions") return type === "submission_deadline";
  if (filter === "payouts") return type === "payout";
  return false;
}

export function calendarEventTypeKey(type: UgcCalendarEventType): UgcMessageKey {
  switch (type) {
    case "campaign_start":
      return "eventCampaignStart";
    case "campaign_end":
      return "eventCampaignEnd";
    case "application_deadline":
      return "eventApplicationDeadline";
    case "submission_deadline":
      return "eventSubmissionDeadline";
    case "payout":
      return "eventPayoutDate";
  }
}

export function calendarFilterKey(filter: UgcCalendarFilter): UgcMessageKey {
  switch (filter) {
    case "all":
      return "calendarFilterAll";
    case "campaigns":
      return "calendarFilterCampaigns";
    case "submissions":
      return "calendarFilterSubmissions";
    case "payouts":
      return "calendarFilterPayouts";
  }
}

export function calendarListGroupKey(group: UgcCalendarListGroupId): UgcMessageKey {
  switch (group) {
    case "today":
      return "calendarGroupToday";
    case "tomorrow":
      return "calendarGroupTomorrow";
    case "thisWeek":
      return "calendarGroupThisWeek";
    case "later":
      return "calendarGroupLater";
  }
}

export function localeToBcp47(locale: UgcLocale): string {
  if (locale === "fr") return "fr-FR";
  if (locale === "rw") return "rw-RW";
  return "en-US";
}

/** Sunday-first for English; Monday-first for FR/RW. */
export function weekStartForLocale(locale: UgcLocale): 0 | 1 {
  return locale === "en" ? 0 : 1;
}

export function parseCalendarDate(iso: string): Date | null {
  const trimmed = iso.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  if (!isoHasAuthoritativeTime(trimmed)) {
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  return d;
}

export function isoHasAuthoritativeTime(iso: string): boolean {
  const trimmed = iso.trim();
  if (!/T\d{2}:\d{2}/.test(trimmed)) return false;
  const match = /T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:Z|([+-]\d{2}:?\d{2}))?/.exec(
    trimmed,
  );
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  const ms = match[4] ? Number(match[4].slice(0, 3).padEnd(3, "0")) : 0;
  const offset = match[5];
  const isUtc =
    trimmed.endsWith("Z") || offset === "+00:00" || offset === "+0000" || offset === "-00:00";
  if (isUtc && hours === 0 && minutes === 0 && seconds === 0 && ms === 0) {
    return false;
  }
  return hours !== 0 || minutes !== 0 || seconds !== 0 || ms !== 0 || Boolean(offset);
}

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfLocalMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfLocalWeek(now: Date, weekStart: 0 | 1): Date {
  const start = startOfLocalDay(now);
  const daysFromStart = (start.getDay() - weekStart + 7) % 7;
  const end = new Date(start);
  end.setDate(start.getDate() + (6 - daysFromStart));
  return end;
}

export function upcomingListGroup(
  eventDate: Date,
  now: Date,
  weekStart: 0 | 1,
): UgcCalendarListGroupId | null {
  const eventDay = startOfLocalDay(eventDate);
  const today = startOfLocalDay(now);
  if (eventDay.getTime() < today.getTime()) return null;

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (eventDay.getTime() === today.getTime()) return "today";
  if (eventDay.getTime() === tomorrow.getTime()) return "tomorrow";

  const weekEnd = endOfLocalWeek(now, weekStart);
  if (eventDay.getTime() <= weekEnd.getTime()) return "thisWeek";
  return "later";
}

export function weekdayLabels(locale: UgcLocale, weekStart: 0 | 1): string[] {
  const bcp = localeToBcp47(locale);
  const sunday = new Date(2026, 0, 4);
  const labels: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + ((weekStart + i) % 7));
    labels.push(new Intl.DateTimeFormat(bcp, { weekday: "short" }).format(day));
  }
  return labels;
}

export function monthOffset(year: number, month: number, weekStart: 0 | 1): number {
  const first = new Date(year, month, 1);
  return (first.getDay() - weekStart + 7) % 7;
}

export function isIsoInInclusiveRange(
  iso: string,
  from: string | null,
  to: string | null,
): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  if (from) {
    const fromT = Date.parse(from);
    if (!Number.isNaN(fromT) && t < fromT) return false;
  }
  if (to) {
    const toT = Date.parse(to);
    if (!Number.isNaN(toT) && t > toT) return false;
  }
  return true;
}

export function calendarEventHref(input: {
  type: UgcCalendarEventType;
  campaignId: string | null;
  participantStatus?: string | null;
}): string {
  if (input.type === "payout") return "/ugc/payouts";
  if (!input.campaignId) return "/ugc";
  if (input.type === "submission_deadline") {
    return `/ugc/${input.campaignId}/submit`;
  }
  if (input.type === "application_deadline") {
    if (
      input.participantStatus === "pending" ||
      input.participantStatus === "waitlisted"
    ) {
      return `/ugc/${input.campaignId}/application`;
    }
    return `/ugc/${input.campaignId}`;
  }
  if (input.participantStatus === "accepted") {
    return `/ugc/${input.campaignId}/dashboard`;
  }
  return `/ugc/${input.campaignId}`;
}

export function formatCalendarDayHeading(date: Date, locale: UgcLocale): string {
  return new Intl.DateTimeFormat(localeToBcp47(locale), {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatEventDate(
  iso: string,
  locale: UgcLocale,
): { date: string; time: string | null } | null {
  const parsed = parseCalendarDate(iso);
  if (!parsed) return null;
  const bcp = localeToBcp47(locale);
  const date = new Intl.DateTimeFormat(bcp, { dateStyle: "medium" }).format(parsed);
  if (!isoHasAuthoritativeTime(iso)) return { date, time: null };
  const time = new Intl.DateTimeFormat(bcp, { timeStyle: "short" }).format(parsed);
  return { date, time };
}
