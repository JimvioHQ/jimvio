export const EVENT_KINDS = ["workshop", "webinar", "ama", "meetup", "launch", "other"] as const;
export const EVENT_STATUSES = ["draft", "published", "cancelled", "completed"] as const;
export const EVENT_VISIBILITIES = ["public", "private"] as const;
export const EVENT_FORMATS = ["online", "in_person", "hybrid"] as const;

export type EventKind = (typeof EVENT_KINDS)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];
export type EventVisibility = (typeof EVENT_VISIBILITIES)[number];
export type EventFormat = (typeof EVENT_FORMATS)[number];

export type EventDraftInput = {
  title?: string | null;
  description?: string | null;
  kind?: string | null;
  format?: string | null;
  visibility?: string | null;
  status?: string | null;
  timezone?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  meetingUrl?: string | null;
  location?: string | null;
  venue?: string | null;
  capacity?: number | null;
  imageUrl?: string | null;
  tags?: string[] | null;
  hostName?: string | null;
};

const IMAGE_TYPES = /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i;
const MAX_IMAGE_URL = 2000;

export function isDiscoverableEvent(event: {
  visibility?: string | null;
  status?: string | null;
  is_published?: boolean | null;
}): boolean {
  const status = event.status ?? (event.is_published ? "published" : "draft");
  const visibility = event.visibility ?? "public";
  return visibility === "public" && status === "published";
}

export function validateEventDraft(input: EventDraftInput): { ok: true; value: Required<Pick<EventDraftInput, "title" | "startsAt">> & EventDraftInput } | { ok: false; error: string } {
  const title = String(input.title ?? "").trim();
  if (title.length < 3 || title.length > 160) {
    return { ok: false, error: "Title must be between 3 and 160 characters." };
  }
  const description = input.description?.trim() || null;
  if (description && description.length > 8000) {
    return { ok: false, error: "Description is too long." };
  }
  const kind = (EVENT_KINDS as readonly string[]).includes(String(input.kind))
    ? (input.kind as EventKind)
    : "meetup";
  const format = (EVENT_FORMATS as readonly string[]).includes(String(input.format))
    ? (input.format as EventFormat)
    : input.format == null
      ? "online"
      : null;
  if (!format) return { ok: false, error: "Choose online, in-person, or hybrid." };
  const visibility = (EVENT_VISIBILITIES as readonly string[]).includes(String(input.visibility))
    ? (input.visibility as EventVisibility)
    : "public";
  const status = (EVENT_STATUSES as readonly string[]).includes(String(input.status))
    ? (input.status as EventStatus)
    : "draft";
  const timezone = String(input.timezone || "UTC").trim();
  if (!isValidTimeZone(timezone)) return { ok: false, error: "Choose a valid timezone." };

  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "Start date and time are required." };
  }
  let endsAt: string | null = null;
  if (input.endsAt) {
    const end = new Date(input.endsAt);
    if (Number.isNaN(end.getTime())) return { ok: false, error: "End date is invalid." };
    if (end.getTime() <= startsAt.getTime()) {
      return { ok: false, error: "End time must be after the start time." };
    }
    endsAt = end.toISOString();
  }

  const meetingUrl = input.meetingUrl?.trim() || null;
  if ((format === "online" || format === "hybrid") && meetingUrl && !isHttpUrl(meetingUrl)) {
    return { ok: false, error: "Meeting link must be a valid http or https URL." };
  }
  if (format === "in_person" && !String(input.venue || input.location || "").trim()) {
    return { ok: false, error: "Add a venue for in-person events." };
  }
  const imageUrl = input.imageUrl?.trim() || null;
  if (imageUrl) {
    if (imageUrl.length > MAX_IMAGE_URL || !isHttpUrl(imageUrl) || !IMAGE_TYPES.test(imageUrl)) {
      return { ok: false, error: "Cover image must be an https image URL (png, jpg, webp, or gif)." };
    }
  }
  const capacity = input.capacity == null || input.capacity === ("" as unknown)
    ? null
    : Number(input.capacity);
  if (capacity != null && (!Number.isFinite(capacity) || capacity < 1 || capacity > 100000)) {
    return { ok: false, error: "Capacity must be a positive number." };
  }
  const tags = (input.tags ?? [])
    .map((tag) => String(tag).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  return {
    ok: true,
    value: {
      ...input,
      title,
      description,
      kind,
      format,
      visibility,
      status,
      timezone,
      startsAt: startsAt.toISOString(),
      endsAt,
      meetingUrl: format === "in_person" ? null : meetingUrl,
      location: input.location?.trim() || null,
      venue: input.venue?.trim() || null,
      capacity,
      imageUrl,
      tags,
      hostName: input.hostName?.trim() || null,
    },
  };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function formatEventWhen(iso: string, timeZone?: string | null): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timeZone && isValidTimeZone(timeZone) ? timeZone : undefined,
  }).format(date);
}
