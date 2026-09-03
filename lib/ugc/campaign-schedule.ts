import type { UGCCampaign } from "@/types/ugc";
import { localDateKey, parseCalendarDate } from "@/lib/ugc/calendar";

function daysRemaining(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const end = Date.parse(iso);
  if (Number.isNaN(end)) return null;
  if (end <= now) return 0;
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export type CampaignLifecycleStatus = "upcoming" | "live" | "ending_soon" | "ended";

export type CampaignScheduleKind =
  | "campaign_start"
  | "campaign_end"
  | "content_deadline"
  | "live_date"
  | "submission_deadline"
  | "review_start"
  | "review_end"
  | "payment"
  | "custom";

export type CampaignScheduleEvent = {
  id: string;
  kind: CampaignScheduleKind;
  title: string;
  description: string | null;
  date: string;
  ends_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CampaignScheduleSnapshot = {
  lifecycle: CampaignLifecycleStatus;
  events: CampaignScheduleEvent[];
};

const ENDING_SOON_DAYS = 3;

export function getCampaignLifecycleStatus(
  campaign: Pick<UGCCampaign, "status" | "starts_at" | "ends_at"> & {
    submission_deadline?: string | null;
  },
  now = Date.now(),
): CampaignLifecycleStatus {
  if (campaign.status === "completed" || campaign.status === "cancelled") return "ended";

  const endIso = campaign.ends_at ?? campaign.submission_deadline ?? null;
  if (endIso) {
    const end = Date.parse(endIso);
    if (!Number.isNaN(end) && end < now) return "ended";
  }

  if (campaign.starts_at) {
    const start = Date.parse(campaign.starts_at);
    if (!Number.isNaN(start) && start > now) return "upcoming";
  }

  const days = daysRemaining(endIso, now);
  if (days !== null && days <= ENDING_SOON_DAYS) return "ending_soon";

  if (campaign.status === "paused") return "upcoming";
  return "live";
}

export function lifecycleLabel(status: CampaignLifecycleStatus): string {
  switch (status) {
    case "upcoming":
      return "Upcoming";
    case "live":
      return "Live";
    case "ending_soon":
      return "Ending soon";
    case "ended":
      return "Ended";
  }
}

export function scheduleKindLabel(kind: CampaignScheduleKind): string {
  switch (kind) {
    case "campaign_start":
      return "Campaign start";
    case "campaign_end":
      return "Campaign end";
    case "content_deadline":
      return "Content deadline";
    case "live_date":
      return "Live date";
    case "submission_deadline":
      return "Submission deadline";
    case "review_start":
      return "Review starts";
    case "review_end":
      return "Review ends";
    case "payment":
      return "Payment / reward";
    case "custom":
      return "Campaign event";
  }
}

type ScheduleCampaign = Pick<
  UGCCampaign,
  "id" | "title" | "starts_at" | "ends_at" | "created_at"
> & {
  content_deadline?: string | null;
  live_at?: string | null;
  submission_deadline?: string | null;
  review_starts_at?: string | null;
  review_ends_at?: string | null;
  payment_at?: string | null;
};

function pushMilestone(
  events: CampaignScheduleEvent[],
  seen: Set<string>,
  event: CampaignScheduleEvent,
) {
  const date = event.date?.trim();
  if (!date) return;
  if (Number.isNaN(Date.parse(date))) return;
  const key = `${event.kind}:${date}`;
  if (seen.has(key)) return;
  seen.add(key);
  events.push({ ...event, date });
}

export function buildCampaignSchedule(
  campaign: ScheduleCampaign,
  customEvents: CampaignScheduleEvent[] = [],
): CampaignScheduleEvent[] {
  const events: CampaignScheduleEvent[] = [];
  const seen = new Set<string>();
  const id = campaign.id;

  pushMilestone(events, seen, {
    id: `${id}-start`,
    kind: "campaign_start",
    title: "Campaign starts",
    description: "Creators can begin producing content.",
    date: campaign.starts_at ?? campaign.created_at,
  });

  if (campaign.live_at) {
    pushMilestone(events, seen, {
      id: `${id}-live`,
      kind: "live_date",
      title: "Live / go-live",
      description: "Campaign content is expected to go live.",
      date: campaign.live_at,
    });
  }

  if (campaign.content_deadline) {
    pushMilestone(events, seen, {
      id: `${id}-content`,
      kind: "content_deadline",
      title: "Content deadline",
      description: "Finish creating campaign content.",
      date: campaign.content_deadline,
    });
  }

  const submissionDeadline = campaign.submission_deadline ?? campaign.ends_at;
  if (submissionDeadline) {
    pushMilestone(events, seen, {
      id: `${id}-submit`,
      kind: "submission_deadline",
      title: "Submission deadline",
      description: "Last day to submit content for review.",
      date: submissionDeadline,
    });
  }

  if (campaign.review_starts_at) {
    pushMilestone(events, seen, {
      id: `${id}-review-start`,
      kind: "review_start",
      title: "Review period starts",
      description: "The brand begins reviewing submissions.",
      date: campaign.review_starts_at,
    });
  }

  if (campaign.review_ends_at) {
    pushMilestone(events, seen, {
      id: `${id}-review-end`,
      kind: "review_end",
      title: "Review period ends",
      description: "Reviews and revision windows close.",
      date: campaign.review_ends_at,
    });
  }

  if (campaign.payment_at) {
    pushMilestone(events, seen, {
      id: `${id}-payment`,
      kind: "payment",
      title: "Payment / reward date",
      description: "Approved earnings are scheduled for payout.",
      date: campaign.payment_at,
    });
  }

  if (campaign.ends_at) {
    pushMilestone(events, seen, {
      id: `${id}-end`,
      kind: "campaign_end",
      title: "Campaign ends",
      description: "The campaign closes.",
      date: campaign.ends_at,
    });
  }

  for (const custom of customEvents) {
    pushMilestone(events, seen, {
      ...custom,
      kind: custom.kind || "custom",
    });
  }

  events.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return events;
}

export function eventsOnDate(
  events: CampaignScheduleEvent[],
  dateKey: string,
): CampaignScheduleEvent[] {
  return events.filter((event) => {
    const parsed = parseCalendarDate(event.date);
    if (!parsed) return false;
    return localDateKey(parsed) === dateKey;
  });
}

export type CampaignDayInfo = {
  dateKey: string;
  lifecycle: CampaignLifecycleStatus;
  whatHappens: CampaignScheduleEvent[];
  campaign: {
    id: string;
    title: string;
    brand: string;
    description: string | null;
    platforms: string[];
    hashtags: string[];
    mentions: string[];
    reward: {
      model: string;
      fixed_rate: number;
      rate_per_1k_views: number;
      max_payout_per_sub: number | null;
    };
    requirements: {
      min_duration: number | null;
      max_duration: number | null;
      requires_face: boolean;
    };
    href: string;
    briefHref: string;
  };
};

export function buildCampaignDayInfo(input: {
  dateKey: string;
  campaign: UGCCampaign;
  events: CampaignScheduleEvent[];
}): CampaignDayInfo {
  const { campaign, dateKey, events } = input;
  return {
    dateKey,
    lifecycle: getCampaignLifecycleStatus(campaign),
    whatHappens: eventsOnDate(events, dateKey),
    campaign: {
      id: campaign.id,
      title: campaign.title,
      brand: campaign.vendor?.business_name ?? "Brand",
      description: campaign.description,
      platforms: campaign.allowed_platforms ?? [],
      hashtags: campaign.required_hashtags ?? [],
      mentions: campaign.required_mentions ?? [],
      reward: {
        model: campaign.payment_model,
        fixed_rate: campaign.fixed_rate ?? 0,
        rate_per_1k_views: campaign.rate_per_1k_views ?? 0,
        max_payout_per_sub: campaign.max_payout_per_sub ?? null,
      },
      requirements: {
        min_duration: campaign.min_duration,
        max_duration: campaign.max_duration,
        requires_face: campaign.requires_face,
      },
      href: `/ugc/${campaign.id}`,
      briefHref: `/ugc/${campaign.id}`,
    },
  };
}

export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
