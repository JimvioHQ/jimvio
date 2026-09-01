import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyUser } from "@/lib/notifications/notify-user";
import { notifyMention, notifyReply, notifyReaction } from "@/lib/notifications/publishers";
import {
  isCommunityMuted,
  parseNotificationMutes,
} from "@/lib/community/notification-mutes";

/** Matches @username mentions (letters, numbers, ._- , 2-32 chars). */
const MENTION_RE = /@([a-zA-Z0-9_.]{2,32})/g;

export function extractMentionedUsernames(body: string): string[] {
  const seen = new Set<string>();
  for (const match of body.matchAll(MENTION_RE)) {
    seen.add(match[1].toLowerCase());
  }
  return Array.from(seen);
}

async function filterCommunityMutedRecipients(
  db: SupabaseClient,
  communityId: string,
  userIds: string[]
): Promise<string[]> {
  if (!userIds.length) return [];
  const { data } = await db
    .from("community_memberships")
    .select("user_id, notification_mutes")
    .eq("community_id", communityId)
    .in("user_id", userIds);
  const muted = new Set<string>();
  for (const row of data ?? []) {
    if (isCommunityMuted(parseNotificationMutes((row as any).notification_mutes))) {
      muted.add(row.user_id as string);
    }
  }
  return userIds.filter((id) => !muted.has(id));
}

type PostEvent = "like" | "comment";

/** Notify a post's author about a like/comment. Skips self-notifications. */
export async function notifyPostAuthor(
  db: SupabaseClient,
  params: {
    postAuthorId: string;
    actorId: string;
    actorName: string;
    postId: string;
    communitySlug: string;
    communityId?: string;
    postTitle?: string | null;
    event: PostEvent;
  }
): Promise<void> {
  if (params.actorId === params.postAuthorId) return;

  if (params.communityId) {
    const allowed = await filterCommunityMutedRecipients(db, params.communityId, [
      params.postAuthorId,
    ]);
    if (!allowed.length) return;
  }

  const preview = params.postTitle?.trim() || "your post";
  const isLike = params.event === "like";

  const actionUrl = `/communities/${params.communitySlug}/feed?post=${params.postId}`;
  if (isLike) {
    await notifyReaction({
      userId: params.postAuthorId,
      actorId: params.actorId,
      actorName: params.actorName,
      actionUrl,
    });
    return;
  }

  await notifyReply({
    userId: params.postAuthorId,
    actorId: params.actorId,
    actorName: params.actorName,
    actionUrl,
    preview,
  });
}

/** Notify a community's owner + admins/moderators about an event. Skips self. */
export async function notifyCommunityStaff(
  db: SupabaseClient,
  params: {
    communityId: string;
    ownerId: string;
    actorId: string;
    title: string;
    message: string;
    communitySlug: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  const staffIds = new Set<string>([params.ownerId]);

  const { data: staff } = await db
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", params.communityId)
    .eq("status", "active")
    .in("role", ["owner", "admin", "moderator"]);

  for (const row of staff ?? []) {
    if (row.user_id) staffIds.add(row.user_id as string);
  }

  staffIds.delete(params.actorId);
  if (staffIds.size === 0) return;

  const recipients = await filterCommunityMutedRecipients(
    db,
    params.communityId,
    Array.from(staffIds)
  );
  if (!recipients.length) return;

  await Promise.all(
    recipients.map((userId) =>
      notifyUser(db, {
        userId,
        type: "community",
        title: params.title,
        message: params.message,
        actionUrl: `/communities/${params.communitySlug}`,
        data: { actorId: params.actorId, ...params.data },
      })
    )
  );
}

/**
 * Notify @mentioned community members in a chat/post body. Resolves usernames
 * against active members only, so mentions can't be used to spam arbitrary users.
 */
export async function notifyMentionedUsers(
  db: SupabaseClient,
  params: {
    body: string;
    communityId: string;
    communitySlug: string;
    actorId: string;
    actorName: string;
    actionUrl?: string;
  }
): Promise<void> {
  const usernames = extractMentionedUsernames(params.body);
  if (usernames.length === 0) return;

  const { data: profiles } = await db
    .from("profiles")
    .select("id, username")
    .in("username", usernames);

  const candidateIds = (profiles ?? [])
    .map((p) => p.id as string)
    .filter((id) => id !== params.actorId);
  if (candidateIds.length === 0) return;

  const { data: members } = await db
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", params.communityId)
    .eq("status", "active")
    .in("user_id", candidateIds);

  const mentionedIds = new Set((members ?? []).map((m) => m.user_id as string));
  if (mentionedIds.size === 0) return;

  const recipients = await filterCommunityMutedRecipients(
    db,
    params.communityId,
    Array.from(mentionedIds)
  );
  if (!recipients.length) return;

  await Promise.all(
    recipients.map((userId) =>
      notifyMention({
        userId,
        actorId: params.actorId,
        actorName: params.actorName,
        actionUrl: params.actionUrl ?? `/communities/${params.communitySlug}`,
        context: "a message",
      })
    )
  );
}

/** Notify a community's owner when a free member joins. */
export async function notifyCommunityOwnerOnJoin(
  db: SupabaseClient,
  params: {
    ownerId: string;
    memberId: string;
    memberName: string;
    communityId: string;
    communitySlug: string;
    communityName: string;
  }
): Promise<void> {
  if (params.ownerId === params.memberId) return;

  const allowed = await filterCommunityMutedRecipients(db, params.communityId, [
    params.ownerId,
  ]);
  if (!allowed.length) return;

  await notifyUser(db, {
    userId: params.ownerId,
    type: "community",
    title: "New member",
    message: `${params.memberName} joined ${params.communityName}`,
    actionUrl: `/communities/${params.communitySlug}/members`,
    data: { event: "member_joined", memberId: params.memberId, communityId: params.communityId },
  });
}

/** Notify owner that someone requested to join a private community. */
export async function notifyCommunityOwnerOnJoinRequest(
  db: SupabaseClient,
  params: {
    ownerId: string;
    memberId: string;
    memberName: string;
    communityId: string;
    communitySlug: string;
    communityName: string;
  }
): Promise<void> {
  if (params.ownerId === params.memberId) return;

  const allowed = await filterCommunityMutedRecipients(db, params.communityId, [
    params.ownerId,
  ]);
  if (!allowed.length) return;

  await notifyUser(db, {
    userId: params.ownerId,
    type: "community",
    title: "Join request",
    message: `${params.memberName} requested to join ${params.communityName}`,
    actionUrl: `/owner/communities/${params.communitySlug}/members`,
    data: { event: "join_request", memberId: params.memberId, communityId: params.communityId },
  });
}
