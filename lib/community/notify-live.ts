import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyUser } from "@/lib/notifications/notify-user";

const MEMBER_NOTIFY_CAP = 200;

/** Notify active community members about a live lifecycle event (capped). */
export async function notifyCommunityLiveEvent(
  db: SupabaseClient,
  params: {
    communityId: string;
    actorId: string;
    title: string;
    message: string;
    communitySlug: string;
    sessionId: string;
    event: "live_started" | "live_ended" | "live_scheduled" | "live_reminder";
  }
): Promise<void> {
  const { data: members } = await db
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", params.communityId)
    .eq("status", "active")
    .limit(MEMBER_NOTIFY_CAP);

  const ids = new Set<string>();
  for (const row of members ?? []) {
    if (row.user_id) ids.add(row.user_id as string);
  }
  ids.delete(params.actorId);
  if (ids.size === 0) return;

  const actionUrl = `/communities/live/${params.sessionId}`;

  const category =
    params.event === "live_reminder" ? ("live_reminder" as const) : ("live_started" as const);

  await Promise.all(
    Array.from(ids).map((userId) =>
      notifyUser(db, {
        userId,
        type: "community",
        category,
        title: params.title,
        message: params.message,
        actionUrl,
        actorId: params.actorId,
        groupKey: `live:${params.sessionId}:${params.event}`,
        eventKey: `live:${userId}:${params.sessionId}:${params.event}`,
        data: {
          event: params.event,
          live: true,
          sessionId: params.sessionId,
          actorId: params.actorId,
          communitySlug: params.communitySlug,
        },
      })
    )
  );
}
