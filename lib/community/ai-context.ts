import { createClient } from "@/lib/supabase/server";
import {
  getUserMembership,
  isMembershipActive,
  type CommunityMembershipRow,
} from "@/services/communityService";
import { mergeSettingsConfig } from "@/lib/community/owner-console/settings/mappers";

const MAX_RECENT_POSTS = 8;
const MAX_PINNED = 5;
const MAX_COURSES = 6;
const MAX_LESSONS_PER_COURSE = 8;
const MAX_RESOURCES = 8;
const MAX_KNOWLEDGE = 8;
const MAX_GROUPS = 8;
const MAX_CHANNELS = 12;
const MAX_FOCUS_MESSAGES = 12;
const BODY_TRUNCATE = 180;
const DEFAULT_MAX_CONTEXT_CHARS = 6500;

export type CommunityAiContextPost = {
  title: string | null;
  body: string;
  author: string;
  pinned?: boolean;
};

export type CommunityAiContextCourse = {
  title: string;
  description: string | null;
  lessons: string[];
};

export type CommunityAiContext = {
  communityId: string;
  name: string;
  description: string | null;
  about: string | null;
  rules: string | null;
  memberCount: number;
  groups: string[];
  channels: string[];
  recentPosts: CommunityAiContextPost[];
  pinnedPosts: CommunityAiContextPost[];
  announcements: string[];
  courses: CommunityAiContextCourse[];
  resources: string[];
  knowledge: string[];
  focusRoomName: string | null;
  focusMessages: string[];
};

type SpaceRow = {
  id: string;
  name: string;
  access_type: string | null;
  privacy: string | null;
  is_hidden: boolean | null;
  rules: string | null;
  welcome_message: string | null;
  description: string | null;
};

type RoomRow = {
  id: string;
  name: string;
  space_id: string;
  room_type: string | null;
  channel_kind: string | null;
  access_type: string | null;
  is_locked: boolean | null;
  is_hidden: boolean | null;
  visibility: string | null;
  welcome_message: string | null;
  description: string | null;
};

function isStaff(membership: CommunityMembershipRow | null, isOwner: boolean): boolean {
  if (isOwner) return true;
  const role = membership?.role ?? "";
  return role === "owner" || role === "admin" || role === "moderator";
}

function canAccessSpaceRow(
  space: SpaceRow,
  membership: CommunityMembershipRow | null,
  isOwner: boolean
): boolean {
  if (isOwner) return true;
  if (space.is_hidden && !isStaff(membership, isOwner)) return false;
  const privacy = (space.privacy ?? "").toLowerCase();
  if (privacy === "hidden" && !isStaff(membership, isOwner)) return false;

  const t = (space.access_type ?? "free").toLowerCase();
  if (t === "free") return true;
  if (!isMembershipActive(membership)) return false;
  if (t === "paid") return true;
  if (t === "premium") {
    const ids = (membership?.space_access ?? []).map(String);
    return (
      membership?.plan_type === "yearly" ||
      membership?.plan_type === "lifetime" ||
      ids.includes(String(space.id))
    );
  }
  return false;
}

function canAccessRoomRow(
  room: RoomRow,
  space: SpaceRow | undefined,
  membership: CommunityMembershipRow | null,
  isOwner: boolean
): boolean {
  if (isOwner) return true;
  if (!space || !canAccessSpaceRow(space, membership, isOwner)) return false;
  if ((room.is_hidden || room.visibility === "hidden") && !isStaff(membership, isOwner)) {
    return false;
  }
  if (!room.is_locked) return true;
  if (!isMembershipActive(membership)) return false;
  const at = room.access_type === "inherit" ? "paid" : room.access_type;
  if (at === "free") return true;
  if (at === "paid") return true;
  if (at === "premium") {
    const ids = (membership?.space_access ?? []).map(String);
    return (
      membership?.plan_type === "yearly" ||
      membership?.plan_type === "lifetime" ||
      ids.includes(String(room.space_id))
    );
  }
  return false;
}

function truncate(text: string, max = BODY_TRUNCATE): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function roomKindLabel(room: RoomRow): string {
  const kind = (room.channel_kind || room.room_type || "channel").toLowerCase();
  return `#${room.name} (${kind})`;
}

function isAnnouncementRoom(room: RoomRow): boolean {
  const k = `${room.channel_kind ?? ""} ${room.room_type ?? ""} ${room.name}`.toLowerCase();
  return /announce|broadcast|update/.test(k);
}

function isResourcesRoom(room: RoomRow): boolean {
  const k = `${room.channel_kind ?? ""} ${room.room_type ?? ""} ${room.name}`.toLowerCase();
  return room.room_type === "resources" || /resource|file|template|guide|download/.test(k);
}

function isKnowledgeRoom(room: RoomRow): boolean {
  const k = `${room.channel_kind ?? ""} ${room.room_type ?? ""} ${room.name}`.toLowerCase();
  return /knowledge|wiki|faq|guide|docs/.test(k);
}

/**
 * Permission-aware Community Brain snapshot for AI prompting.
 * Only includes Groups / Channels / Posts / Courses / Resources the member can access.
 */
export async function loadCommunityAiContext(
  communityId: string,
  userId: string,
  opts?: { roomId?: string | null; maxChars?: number }
): Promise<CommunityAiContext | null> {
  const supabase = await createClient();

  const communityQuery = await supabase
    .from("communities")
    .select(
      "id, name, description, tagline, long_description, member_count, owner_id, settings"
    )
    .eq("id", communityId)
    .maybeSingle();

  const community = communityQuery.data as {
    id: string;
    name: string;
    description: string | null;
    tagline: string | null;
    long_description: string | null;
    member_count: number | null;
    owner_id: string;
    settings: unknown;
  } | null;

  if (!community) return null;

  const [membership, spacesRes, roomsRes] = await Promise.all([
    getUserMembership(userId, communityId),
    supabase
      .from("spaces")
      .select(
        "id, name, access_type, privacy, is_hidden, rules, welcome_message, description"
      )
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(40),
    supabase
      .from("rooms")
      .select(
        "id, name, space_id, room_type, channel_kind, access_type, is_locked, is_hidden, visibility, welcome_message, description"
      )
      .eq("community_id", communityId)
      .eq("is_active", true)
      .is("archived_at", null)
      .order("sort_order", { ascending: true })
      .limit(120),
  ]);

  const isOwner = community.owner_id === userId;
  if (!isOwner && !isMembershipActive(membership)) return null;

  const settings = mergeSettingsConfig(community.settings);
  const rules =
    (settings.onboarding?.rules ?? "").trim() ||
    null;

  const spaces = (spacesRes.data ?? []) as SpaceRow[];
  const spaceById = new Map(spaces.map((s) => [s.id, s]));
  const rooms = (roomsRes.data ?? []) as RoomRow[];

  const accessibleSpaces = spaces.filter((s) =>
    canAccessSpaceRow(s, membership, isOwner)
  );
  const accessibleRooms = rooms.filter((r) =>
    canAccessRoomRow(r, spaceById.get(r.space_id), membership, isOwner)
  );
  const accessibleRoomIds = new Set(accessibleRooms.map((r) => r.id));

  const focusRoomId = opts?.roomId?.trim() || null;
  if (focusRoomId && !accessibleRoomIds.has(focusRoomId)) {
    // Focus room outside member permissions — ignore rather than leak.
  }
  const focusAllowed =
    focusRoomId && accessibleRoomIds.has(focusRoomId) ? focusRoomId : null;
  const focusRoom = focusAllowed
    ? accessibleRooms.find((r) => r.id === focusAllowed) ?? null
    : null;

  const postRoomFilter = [...accessibleRoomIds];
  const postsQuery = supabase
    .from("community_posts")
    .select(
      "title, body, is_pinned, post_type, room_id, profiles!community_posts_author_id_fkey(full_name, username)"
    )
    .eq("community_id", communityId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(40);

  const coursesQuery = supabase
    .from("community_courses")
    .select(
      "title, description, room_id, is_published, course_modules(title, sort_order, course_lessons(title, sort_order, is_free))"
    )
    .eq("community_id", communityId)
    .limit(20);

  const resourceRoomIds = accessibleRooms
    .filter((r) => isResourcesRoom(r) || isKnowledgeRoom(r) || isAnnouncementRoom(r))
    .map((r) => r.id)
    .slice(0, 20);

  const messageRoomIds = [
    ...new Set([
      ...(focusAllowed ? [focusAllowed] : []),
      ...resourceRoomIds,
    ]),
  ].slice(0, 24);

  const [postsRes, coursesRes, messagesRes] = await Promise.all([
    postRoomFilter.length > 0
      ? postsQuery.in("room_id", postRoomFilter)
      : Promise.resolve({ data: [] as Array<{
          title: string | null;
          body: string | null;
          is_pinned: boolean | null;
          post_type: string | null;
          room_id: string;
          profiles: { full_name: string | null; username: string | null } | null;
        }> }),
    coursesQuery,
    messageRoomIds.length > 0
      ? supabase
          .from("community_messages")
          .select("body, room_id, is_pinned, created_at")
          .in("room_id", messageRoomIds)
          .eq("is_deleted", false)
          .is("thread_id", null)
          .order("created_at", { ascending: false })
          .limit(60)
      : Promise.resolve({
          data: [] as Array<{
            body: string | null;
            room_id: string;
            is_pinned: boolean | null;
            created_at: string | null;
          }>,
        }),
  ]);

  type CourseRow = {
    title: string;
    description: string | null;
    room_id: string;
    is_published: boolean | null;
    course_modules:
      | Array<{
          title: string;
          sort_order: number | null;
          course_lessons:
            | Array<{
                title: string;
                sort_order: number | null;
                is_free: boolean | null;
              }>
            | null;
        }>
      | null;
  };

  const mapPost = (post: {
    title: string | null;
    body: string | null;
    is_pinned?: boolean | null;
    room_id?: string;
    profiles?: { full_name: string | null; username: string | null } | null;
  }): CommunityAiContextPost => {
    const profile = post.profiles ?? null;
    return {
      title: post.title ?? null,
      body: truncate(post.body ?? ""),
      author: profile?.full_name ?? profile?.username ?? "Member",
      pinned: Boolean(post.is_pinned),
    };
  };

  const allPosts = ((postsRes.data ?? []) as Array<{
    title: string | null;
    body: string | null;
    is_pinned: boolean | null;
    room_id: string;
    profiles: { full_name: string | null; username: string | null } | null;
  }>)
    .filter((p) => accessibleRoomIds.has(p.room_id))
    .map(mapPost);

  const recentPosts = allPosts.filter((p) => !p.pinned).slice(0, MAX_RECENT_POSTS);
  const pinnedPosts = allPosts.filter((p) => p.pinned).slice(0, MAX_PINNED);

  const courses: CommunityAiContextCourse[] = [];
  for (const course of (coursesRes.data ?? []) as CourseRow[]) {
    if (!accessibleRoomIds.has(course.room_id)) continue;
    if (course.is_published === false && !isStaff(membership, isOwner)) continue;
    const modules = [...(course.course_modules ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    const lessons: string[] = [];
    for (const mod of modules) {
      const ls = [...(mod.course_lessons ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );
      for (const lesson of ls) {
        if (lessons.length >= MAX_LESSONS_PER_COURSE) break;
        // Titles only — never dump private lesson bodies into prompts.
        lessons.push(lesson.title);
      }
      if (lessons.length >= MAX_LESSONS_PER_COURSE) break;
    }
    courses.push({
      title: course.title,
      description: course.description ? truncate(course.description, 160) : null,
      lessons,
    });
    if (courses.length >= MAX_COURSES) break;
  }

  const messages = ((messagesRes.data ?? []) as Array<{
    body: string | null;
    room_id: string;
    is_pinned: boolean | null;
    created_at: string | null;
  }>).filter((m) => accessibleRoomIds.has(m.room_id));

  const announcements: string[] = [];
  const resources: string[] = [];
  const knowledge: string[] = [];
  const focusMessages: string[] = [];

  for (const msg of messages) {
    const body = truncate(msg.body ?? "", 160);
    if (!body) continue;
    const room = accessibleRooms.find((r) => r.id === msg.room_id);
    if (!room) continue;

    if (focusAllowed && msg.room_id === focusAllowed && focusMessages.length < MAX_FOCUS_MESSAGES) {
      focusMessages.push(body);
    }
    if (isAnnouncementRoom(room) && announcements.length < 6) {
      announcements.push(body);
    }
    if (isResourcesRoom(room) && resources.length < MAX_RESOURCES) {
      resources.push(`[${room.name}] ${body}`);
    }
    if (
      (isKnowledgeRoom(room) || msg.is_pinned) &&
      knowledge.length < MAX_KNOWLEDGE
    ) {
      knowledge.push(`[${room.name}] ${body}`);
    }
  }

  // Group/channel rules & about from accessible spaces/rooms (welcome + rules).
  const groupRules = accessibleSpaces
    .map((s) => s.rules?.trim())
    .filter(Boolean)
    .slice(0, 2) as string[];
  const combinedRules =
    rules ||
    (groupRules.length > 0 ? groupRules.join("\n") : null);

  return {
    communityId,
    name: community.name,
    description: community.description ?? community.tagline ?? null,
    about:
      community.long_description?.trim() ||
      community.description?.trim() ||
      community.tagline?.trim() ||
      null,
    rules: combinedRules,
    memberCount: community.member_count ?? 0,
    groups: accessibleSpaces.slice(0, MAX_GROUPS).map((s) => s.name),
    channels: accessibleRooms.slice(0, MAX_CHANNELS).map(roomKindLabel),
    recentPosts,
    pinnedPosts,
    announcements,
    courses,
    resources,
    knowledge,
    focusRoomName: focusRoom?.name ?? null,
    focusMessages,
  };
}

/** Flattens a context snapshot into a compact prompt-ready string (bounded). */
export function formatCommunityAiContext(
  context: CommunityAiContext,
  maxChars = DEFAULT_MAX_CONTEXT_CHARS
): string {
  const lines: string[] = [
    `Community: ${context.name}`,
    ...(context.description ? [`Description: ${truncate(context.description, 240)}`] : []),
    ...(context.about && context.about !== context.description
      ? [`About: ${truncate(context.about, 280)}`]
      : []),
    ...(context.rules ? [`Rules: ${truncate(context.rules, 320)}`] : []),
    `Members: ${context.memberCount}`,
  ];

  if (context.groups.length) {
    lines.push(`Groups (accessible): ${context.groups.join(", ")}`);
  }
  if (context.channels.length) {
    lines.push(`Channels (accessible): ${context.channels.join(", ")}`);
  }

  if (context.pinnedPosts.length) {
    lines.push("Pinned posts:");
    context.pinnedPosts.forEach((post, i) => {
      const title = post.title ? `"${post.title}" — ` : "";
      lines.push(`${i + 1}. ${title}${post.body}`);
    });
  }

  if (context.recentPosts.length) {
    lines.push("Recent posts:");
    context.recentPosts.forEach((post, i) => {
      const title = post.title ? `"${post.title}" — ` : "";
      lines.push(`${i + 1}. ${title}${post.body} (by ${post.author})`);
    });
  } else {
    lines.push("No recent accessible posts.");
  }

  if (context.announcements.length) {
    lines.push("Announcements:");
    context.announcements.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  }

  if (context.courses.length) {
    lines.push("Courses (titles / lesson outline only):");
    context.courses.forEach((c, i) => {
      lines.push(
        `${i + 1}. ${c.title}${c.description ? ` — ${c.description}` : ""}`
      );
      if (c.lessons.length) {
        lines.push(`   Lessons: ${c.lessons.join("; ")}`);
      }
    });
  } else {
    lines.push("No accessible courses listed.");
  }

  if (context.resources.length) {
    lines.push("Resources:");
    context.resources.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  } else {
    lines.push("No accessible resources listed.");
  }

  if (context.knowledge.length) {
    lines.push("Knowledge / pinned notes:");
    context.knowledge.forEach((k, i) => lines.push(`${i + 1}. ${k}`));
  } else {
    lines.push("No accessible knowledge articles listed.");
  }

  if (context.focusRoomName) {
    lines.push(`Focus channel: #${context.focusRoomName}`);
    if (context.focusMessages.length) {
      lines.push("Recent focus-channel messages:");
      context.focusMessages.forEach((m, i) => lines.push(`${i + 1}. ${m}`));
    }
  }

  let out = lines.join("\n");
  if (out.length > maxChars) {
    out = `${out.slice(0, maxChars)}\n[Context truncated for size.]`;
  }
  return out;
}

/** Strip control / delimiter spoofing from untrusted member prompts. */
export function sanitizeAiUserPrompt(raw: string, maxLen = 2000): string {
  return raw
    .replace(/\u0000/g, "")
    .replace(/<\/?system>/gi, "")
    .replace(/Community context:/gi, "Member text:")
    .trim()
    .slice(0, maxLen);
}
