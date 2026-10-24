export const MISSION_STATUSES = ["draft", "published", "paused", "completed", "cancelled"] as const;
export const MISSION_VISIBILITIES = ["public", "community"] as const;
export const SUBMISSION_KINDS = ["none", "text", "link", "file"] as const;
export const REVIEW_MODES = ["auto", "review"] as const;
export const REWARD_TYPES = ["points", "none"] as const;

export type MissionStatus = (typeof MISSION_STATUSES)[number];
export type MissionVisibility = (typeof MISSION_VISIBILITIES)[number];
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];
export type ReviewMode = (typeof REVIEW_MODES)[number];
export type RewardType = (typeof REWARD_TYPES)[number];

export type MissionDraftInput = {
  title?: string | null;
  description?: string | null;
  instructions?: string | null;
  completionCriteria?: string | null;
  category?: string | null;
  tags?: string[] | null;
  visibility?: string | null;
  status?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maxParticipants?: number | null;
  submissionKind?: string | null;
  reviewMode?: string | null;
  rewardType?: string | null;
  points?: number | null;
  coverUrl?: string | null;
};

export function validateMissionDraft(input: MissionDraftInput):
  | { ok: true; value: MissionDraftInput & { title: string } }
  | { ok: false; error: string } {
  const title = String(input.title ?? "").trim();
  if (title.length < 3 || title.length > 160) {
    return { ok: false, error: "Title must be between 3 and 160 characters." };
  }
  const visibility = (MISSION_VISIBILITIES as readonly string[]).includes(String(input.visibility))
    ? (input.visibility as MissionVisibility)
    : "community";
  const status = (MISSION_STATUSES as readonly string[]).includes(String(input.status))
    ? (input.status as MissionStatus)
    : "draft";
  const submissionKind = (SUBMISSION_KINDS as readonly string[]).includes(String(input.submissionKind))
    ? (input.submissionKind as SubmissionKind)
    : "text";
  const reviewMode = (REVIEW_MODES as readonly string[]).includes(String(input.reviewMode))
    ? (input.reviewMode as ReviewMode)
    : "review";
  if (reviewMode === "auto" && submissionKind !== "none") {
    return { ok: false, error: "Automatic completion is only available when no evidence submission is required." };
  }
  const rewardType = (REWARD_TYPES as readonly string[]).includes(String(input.rewardType))
    ? (input.rewardType as RewardType)
    : "points";
  const points = rewardType === "none" ? 0 : Math.min(10000, Math.max(0, Number(input.points ?? 0)));
  if (!Number.isFinite(points)) return { ok: false, error: "Points must be a number." };

  const startsAt = parseOptionalDate(input.startsAt);
  if (input.startsAt && !startsAt) return { ok: false, error: "Start date is invalid." };
  const endsAt = parseOptionalDate(input.endsAt);
  if (input.endsAt && !endsAt) return { ok: false, error: "End date is invalid." };
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    return { ok: false, error: "End date must be after the start date." };
  }
  const maxParticipants = input.maxParticipants == null ? null : Number(input.maxParticipants);
  if (maxParticipants != null && (!Number.isFinite(maxParticipants) || maxParticipants < 1)) {
    return { ok: false, error: "Participant limit must be at least 1." };
  }
  const coverUrl = input.coverUrl?.trim() || null;
  if (coverUrl && !/^https:\/\/.+\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(coverUrl)) {
    return { ok: false, error: "Cover must be an https image URL." };
  }

  return {
    ok: true,
    value: {
      title,
      description: input.description?.trim() || null,
      instructions: input.instructions?.trim() || null,
      completionCriteria: input.completionCriteria?.trim() || null,
      category: input.category?.trim() || null,
      tags: (input.tags ?? []).map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 8),
      visibility,
      status,
      startsAt: startsAt?.toISOString() ?? null,
      endsAt: endsAt?.toISOString() ?? null,
      maxParticipants,
      submissionKind,
      reviewMode,
      rewardType,
      points,
      coverUrl,
    },
  };
}

export function missionIsOpen(mission: {
  status?: string | null;
  starts_at?: string | null;
  due_date?: string | null;
  ends_at?: string | null;
}, now = Date.now()): { ok: true } | { ok: false; error: string } {
  if (mission.status && mission.status !== "published") {
    return { ok: false, error: "This mission is not open." };
  }
  if (mission.starts_at && new Date(mission.starts_at).getTime() > now) {
    return { ok: false, error: "This mission has not started." };
  }
  const end = mission.ends_at || mission.due_date;
  if (end && new Date(end).getTime() < now) {
    return { ok: false, error: "This mission has ended." };
  }
  return { ok: true };
}

export function validateSubmission(kind: string, input: { text?: string | null; url?: string | null }): { ok: true } | { ok: false; error: string } {
  if (kind === "none") return { ok: true };
  if (kind === "text") {
    const text = String(input.text ?? "").trim();
    if (text.length < 8) return { ok: false, error: "Add a short description of what you completed." };
    return { ok: true };
  }
  if (kind === "link" || kind === "file") {
    const url = String(input.url ?? "").trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { ok: false, error: "Submission link must be http or https." };
      }
    } catch {
      return { ok: false, error: "Add a valid submission link." };
    }
    return { ok: true };
  }
  return { ok: false, error: "Unsupported submission type." };
}

/** Hub filters: All, Active, In progress, Completed. */
export function matchesMissionListFilter(input: {
  filter?: string | null;
  status?: string | null;
  participantStatus?: string | null;
}): boolean {
  const state = input.participantStatus ?? undefined;
  if (input.filter === "completed") return state === "approved" || state === "completed";
  if (input.filter === "active") return input.status === "published" && state !== "approved" && state !== "completed";
  if (input.filter === "in_progress") return state === "joined" || state === "submitted" || state === "rejected";
  return true;
}

function parseOptionalDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
