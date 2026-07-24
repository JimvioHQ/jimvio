/**
 * Derive smart recommendations + personalized rails from existing workspace data.
 * Pure functions — no fetches.
 */

import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import {
  communityChannelHref,
  communityGroupHref,
} from "@/lib/community/workspace/navigation";
import type {
  ContinueLearningItem,
  PersonalBookmark,
  PersonalVisit,
  SmartRecommendation,
} from "./types";

export type PersonalizationInput = {
  communityId: string;
  communitySlug: string;
  spacesWithRooms: WorkspaceSpaceRow[];
  visits: PersonalVisit[];
  bookmarks: PersonalBookmark[];
  continueLearning: ContinueLearningItem[];
  favoriteGroupIds: string[];
  favoriteChannelIds: string[];
  courses?: Array<{ id: string; title: string; href: string; progress?: number }>;
  upcomingEvents?: Array<{ id: string; title: string; href: string }>;
  liveHref?: string | null;
  liveTitle?: string | null;
  isLive?: boolean;
  moderators?: Array<{ id: string; name: string; username?: string | null }>;
  lastSeenAt?: string | null;
};

export function deriveContinueDiscussion(
  input: PersonalizationInput
): PersonalVisit[] {
  return input.visits
    .filter((v) => v.communityId === input.communityId && v.kind === "channel")
    .slice(0, 6);
}

export function deriveContinueLearning(
  input: PersonalizationInput
): ContinueLearningItem[] {
  const fromStore = input.continueLearning.slice(0, 4);
  if (fromStore.length > 0) return fromStore;

  const fromCourses = (input.courses ?? [])
    .filter((c) => (c.progress ?? 0) > 0 && (c.progress ?? 0) < 100)
    .slice(0, 3)
    .map((c) => ({
      id: c.id,
      kind: "course" as const,
      title: c.title,
      href: c.href,
      progress: c.progress,
      lastAt: new Date().toISOString(),
    }));

  return fromCourses;
}

export function deriveRecommendations(
  input: PersonalizationInput
): SmartRecommendation[] {
  const { communitySlug, spacesWithRooms } = input;
  const visitedChannelIds = new Set(
    input.visits.filter((v) => v.kind === "channel").map((v) => v.id)
  );
  const visitedGroupIds = new Set(
    input.visits.filter((v) => v.kind === "group").map((v) => v.id)
  );
  const favGroups = new Set(input.favoriteGroupIds);
  const favChannels = new Set(input.favoriteChannelIds);
  const recs: SmartRecommendation[] = [];

  for (const space of spacesWithRooms) {
    const groupHref = communityGroupHref(communitySlug, space.slug);
    if (!visitedGroupIds.has(space.id) && !favGroups.has(space.id)) {
      recs.push({
        id: `group:${space.id}`,
        kind: "group",
        title: space.name,
        reason: favGroups.size
          ? "Similar to groups you follow"
          : "Suggested group for you",
        href: groupHref,
        score: 40 + Math.min(space.rooms.length * 3, 20),
      });
    }

    for (const room of space.rooms) {
      if (visitedChannelIds.has(room.id) || favChannels.has(room.id)) continue;
      const isResource =
        room.room_type === "resources" || /resource|guide/i.test(room.name);
      const isCourse = room.room_type === "course";
      recs.push({
        id: `channel:${room.id}`,
        kind: isCourse ? "course" : isResource ? "resource" : "channel",
        title: room.name,
        reason: isCourse
          ? "Continue learning path"
          : isResource
            ? "New resources to explore"
            : favChannels.size
              ? "Based on channels you visit"
              : "Recommended channel",
        href: communityChannelHref(communitySlug, room.slug),
        score:
          (isCourse ? 55 : isResource ? 48 : 35) +
          (space.rooms.length > 3 ? 5 : 0),
      });
    }
  }

  for (const event of input.upcomingEvents ?? []) {
    recs.push({
      id: `event:${event.id}`,
      kind: "event",
      title: event.title,
      reason: "Upcoming event",
      href: event.href,
      score: 52,
    });
  }

  for (const mod of (input.moderators ?? []).slice(0, 3)) {
    recs.push({
      id: `creator:${mod.id}`,
      kind: "creator",
      title: mod.name,
      reason: "Featured creator on your team",
      href: mod.username
        ? `/communities/${communitySlug}/members/${mod.username}`
        : `/communities/${communitySlug}/members`,
      score: 30,
    });
  }

  return recs.sort((a, b) => b.score - a.score).slice(0, 10);
}

export function deriveDiscovery(input: PersonalizationInput) {
  const groups = [...input.spacesWithRooms]
    .sort((a, b) => b.rooms.length - a.rooms.length)
    .slice(0, 4)
    .map((s) => ({
      id: s.id,
      title: s.name,
      meta: `${s.rooms.length} channels`,
      href: communityGroupHref(input.communitySlug, s.slug),
      kind: "group" as const,
    }));

  const channels = input.spacesWithRooms
    .flatMap((s) =>
      s.rooms.map((r) => ({
        id: r.id,
        title: r.name,
        meta: s.name,
        href: communityChannelHref(input.communitySlug, r.slug),
        kind: "channel" as const,
        roomType: r.room_type,
      }))
    )
    .slice(0, 6);

  const resources = channels
    .filter(
      (c) =>
        c.roomType === "resources" || /resource|guide|library/i.test(c.title)
    )
    .slice(0, 4);

  const discussions = channels
    .filter((c) => c.roomType === "chat" || c.roomType === "posts")
    .slice(0, 4);

  const creators = (input.moderators ?? []).slice(0, 4).map((m) => ({
    id: m.id,
    title: m.name,
    meta: "Creator",
    href: m.username
      ? `/communities/${input.communitySlug}/members/${m.username}`
      : `/communities/${input.communitySlug}/members`,
    kind: "creator" as const,
  }));

  return { groups, channels, resources, discussions, creators };
}

export function deriveNewSinceLastVisit(
  input: PersonalizationInput
): Array<{ id: string; title: string; href: string; label: string }> {
  const last = input.lastSeenAt ? Date.parse(input.lastSeenAt) : 0;
  if (!last) return [];

  const items: Array<{ id: string; title: string; href: string; label: string }> =
    [];

  // Heuristic: surface resource/course channels as "new since last visit"
  // when the member has an established last-seen timestamp.
  for (const space of input.spacesWithRooms) {
    for (const room of space.rooms) {
      if (
        room.room_type === "resources" ||
        room.room_type === "course" ||
        /resource|guide|course/i.test(room.name)
      ) {
        items.push({
          id: room.id,
          title: room.name,
          href: communityChannelHref(input.communitySlug, room.slug),
          label:
            room.room_type === "course" ? "Course" : "Resource",
        });
      }
    }
  }

  return items.slice(0, 4);
}

export function deriveQuickActions(input: PersonalizationInput) {
  const actions: Array<{
    id: string;
    label: string;
    href: string;
    tone: "accent" | "neutral" | "live";
  }> = [];

  const continueLearn = deriveContinueLearning(input)[0];
  if (continueLearn) {
    actions.push({
      id: "continue-learn",
      label: "Continue Learning",
      href: continueLearn.href,
      tone: "accent",
    });
  }

  const continueChat = deriveContinueDiscussion(input)[0];
  if (continueChat) {
    actions.push({
      id: "resume-discussion",
      label: "Resume Discussion",
      href: continueChat.href,
      tone: "neutral",
    });
  }

  if (input.isLive && input.liveHref) {
    actions.push({
      id: "join-live",
      label: "Join Live",
      href: input.liveHref,
      tone: "live",
    });
  }

  const resource = deriveNewSinceLastVisit(input).find(
    (i) => i.label === "Resource"
  );
  if (resource) {
    actions.push({
      id: "open-resource",
      label: "Open Resource",
      href: resource.href,
      tone: "neutral",
    });
  }

  const event = input.upcomingEvents?.[0];
  if (event) {
    actions.push({
      id: "view-event",
      label: "View Event",
      href: event.href,
      tone: "neutral",
    });
  }

  return actions.slice(0, 5);
}
