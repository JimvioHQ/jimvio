import { createClient } from "@/lib/supabase/server";
import { aggregateMemberPoints } from "@/lib/community/points";

const ONLINE_WINDOW_MS = 15 * 60 * 1000;

async function getUserCommunityIds(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_memberships")
    .select("community_id")
    .eq("user_id", userId)
    .eq("status", "active");
  return (data ?? []).map((r) => r.community_id);
}

export type HubMessageThread = {
  id: string;
  kind: "direct" | "group" | "space";
  name: string;
  avatarUrl: string | null;
  subtitle: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  communityId: string;
  communityName: string;
  communitySlug: string;
  peerId: string | null;
  roomId: string | null;
  href: string | null;
};

export type HubMessageItem = {
  id: string;
  body: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  created_at: string;
  message_type: string;
  attachments: Array<{ url?: string; name?: string; mime?: string; size?: number }>;
  reactions: Record<string, number>;
};

export type HubMessagePeer = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  level: number;
  streakDays: number;
  isOnline: boolean;
  sharedCommunities: Array<{ id: string; name: string; slug: string; href: string }>;
};

function previewMessage(body: string, messageType: string | null) {
  if (messageType === "audio") return "Voice message";
  if (messageType === "file") return "Sent a file";
  if (messageType === "image") return "Sent an image";
  return body || "No messages yet";
}

function countReactions(raw: unknown) {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [emoji, users] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(users)) out[emoji] = users.length;
  }
  return out;
}

export async function getHubMessageThreads(userId: string) {
  const supabase = await createClient();
  const communityIds = await getUserCommunityIds(userId);
  const threads: HubMessageThread[] = [];
  const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

  if (communityIds.length > 0) {
    const { data: convs } = await supabase
      .from("community_inbox_conversations")
      .select(
        `id, community_id, user_high, user_low, updated_at,
         communities(name, slug),
         community_inbox_messages(id, body, created_at, sender_id, message_type)`
      )
      .in("community_id", communityIds)
      .or(`user_high.eq.${userId},user_low.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(50);

    const peerIds = (convs ?? []).map((c) =>
      c.user_high === userId ? c.user_low : c.user_high
    );
    const uniquePeerIds = [...new Set(peerIds)];

    const [{ data: peers }, { data: peerPoints }] = await Promise.all([
      uniquePeerIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .in("id", uniquePeerIds)
        : Promise.resolve({ data: [] as never[] }),
      uniquePeerIds.length
        ? supabase
            .from("member_points")
            .select("user_id, last_active_at")
            .in("user_id", uniquePeerIds)
            .gte("last_active_at", onlineCutoff)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const peerMap = new Map((peers ?? []).map((p) => [p.id, p]));
    const onlineSet = new Set((peerPoints ?? []).map((p) => p.user_id));

    for (const conv of convs ?? []) {
      const peerId = conv.user_high === userId ? conv.user_low : conv.user_high;
      const peer = peerMap.get(peerId);
      const community = conv.communities as { name: string; slug: string } | null;
      const msgs = [...(conv.community_inbox_messages ?? [])].sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
      const last = msgs[0];
      const unreadCount =
        last && last.sender_id !== userId ? 1 : 0;

      threads.push({
        id: conv.id,
        kind: "direct",
        name: peer?.full_name ?? peer?.username ?? "Member",
        avatarUrl: peer?.avatar_url ?? null,
        subtitle: community?.name ?? null,
        lastMessage: last
          ? previewMessage(last.body, last.message_type)
          : "No messages yet",
        lastMessageTime: last?.created_at ?? conv.updated_at ?? new Date().toISOString(),
        unreadCount,
        isOnline: onlineSet.has(peerId),
        communityId: conv.community_id,
        communityName: community?.name ?? "Community",
        communitySlug: community?.slug ?? "",
        peerId,
        roomId: null,
        href: peer?.username ? `/c/profile/${peer.username}` : null,
      });
    }

    const [{ data: rooms }, { data: spaces }] = await Promise.all([
      supabase
        .from("rooms")
        .select("id, name, community_id, communities(name, slug)")
        .in("community_id", communityIds)
        .eq("room_type", "chat")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(30),
      supabase
        .from("spaces")
        .select("id, name, slug, community_id, communities(name, slug)")
        .in("community_id", communityIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(20),
    ]);

    const roomIds = (rooms ?? []).map((r) => r.id);
    let roomLastMsg = new Map<string, { body: string; created_at: string; sender_id: string; message_type: string | null }>();
    if (roomIds.length > 0) {
      const { data: roomMsgs } = await supabase
        .from("community_messages")
        .select("room_id, body, created_at, sender_id, message_type")
        .in("room_id", roomIds)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(300);

      for (const msg of roomMsgs ?? []) {
        if (!roomLastMsg.has(msg.room_id)) {
          roomLastMsg.set(msg.room_id, {
            body: msg.body ?? "",
            created_at: msg.created_at ?? new Date().toISOString(),
            sender_id: msg.sender_id,
            message_type: msg.message_type,
          });
        }
      }
    }

    for (const room of rooms ?? []) {
      const community = room.communities as { name: string; slug: string } | null;
      const last = roomLastMsg.get(room.id);
      threads.push({
        id: `room:${room.id}`,
        kind: "group",
        name: room.name,
        avatarUrl: null,
        subtitle: community?.name ?? null,
        lastMessage: last
          ? previewMessage(last.body, last.message_type)
          : "Group chat",
        lastMessageTime: last?.created_at ?? new Date().toISOString(),
        unreadCount: last && last.sender_id !== userId ? 1 : 0,
        isOnline: false,
        communityId: room.community_id,
        communityName: community?.name ?? "Community",
        communitySlug: community?.slug ?? "",
        peerId: null,
        roomId: room.id,
        href: community ? `/c/community/${community.slug}/room?room=${room.id}` : null,
      });
    }

    for (const space of spaces ?? []) {
      const community = space.communities as { name: string; slug: string } | null;
      threads.push({
        id: `space:${space.id}`,
        kind: "space",
        name: space.name,
        avatarUrl: null,
        subtitle: community?.name ?? null,
        lastMessage: "Open space",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isOnline: false,
        communityId: space.community_id,
        communityName: community?.name ?? "Community",
        communitySlug: community?.slug ?? "",
        peerId: null,
        roomId: null,
        href: community ? `/c/community/${community.slug}` : null,
      });
    }
  }

  threads.sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );

  const unread = threads.filter((t) => t.unreadCount > 0).length;
  const groups = threads.filter((t) => t.kind === "group").length;
  const spaceCount = threads.filter((t) => t.kind === "space").length;

  return {
    threads,
    tabCounts: {
      all: threads.length,
      unread,
      groups,
      spaces: spaceCount,
    },
  };
}

export async function getHubDirectMessages(userId: string, conversationId: string) {
  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("community_inbox_conversations")
    .select("id, user_low, user_high, community_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv || (conv.user_low !== userId && conv.user_high !== userId)) {
    return null;
  }

  const { data: rows } = await supabase
    .from("community_inbox_messages")
    .select("id, body, sender_id, created_at, message_type, attachments, reactions")
    .eq("conversation_id", conversationId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(200);

  const senderIds = [...new Set((rows ?? []).map((r) => r.sender_id))];
  const { data: profs } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", senderIds)
    : { data: [] as never[] };

  const profileMap = new Map((profs ?? []).map((p) => [p.id, p]));

  const messages: HubMessageItem[] = (rows ?? []).map((r) => {
    const profile = profileMap.get(r.sender_id);
    const attachments = Array.isArray(r.attachments) ? (r.attachments as HubMessageItem["attachments"]) : [];
    return {
      id: r.id,
      body: r.body,
      sender_id: r.sender_id,
      sender_name: profile?.full_name ?? profile?.username ?? "Member",
      sender_avatar: profile?.avatar_url ?? null,
      created_at: r.created_at ?? new Date().toISOString(),
      message_type: r.message_type ?? "text",
      attachments,
      reactions: countReactions(r.reactions),
    };
  });

  return { conversationId, messages, pinnedMessage: null as string | null };
}

export async function getHubRoomMessages(userId: string, roomId: string) {
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, community_id, name, communities(slug, name)")
    .eq("id", roomId)
    .maybeSingle();

  if (!room) return null;

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("id")
    .eq("community_id", room.community_id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return null;

  const [{ data: rows }, { data: pinned }] = await Promise.all([
    supabase
      .from("community_messages")
      .select("id, body, sender_id, created_at, message_type, attachments, reactions")
      .eq("room_id", roomId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("community_messages")
      .select("body")
      .eq("room_id", roomId)
      .eq("is_pinned", true)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const senderIds = [...new Set((rows ?? []).map((r) => r.sender_id))];
  const { data: profs } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", senderIds)
    : { data: [] as never[] };

  const profileMap = new Map((profs ?? []).map((p) => [p.id, p]));

  const messages: HubMessageItem[] = (rows ?? []).map((r) => {
    const profile = profileMap.get(r.sender_id);
    const attachments = Array.isArray(r.attachments) ? (r.attachments as HubMessageItem["attachments"]) : [];
    return {
      id: r.id,
      body: r.body ?? "",
      sender_id: r.sender_id,
      sender_name: profile?.full_name ?? profile?.username ?? "Member",
      sender_avatar: profile?.avatar_url ?? null,
      created_at: r.created_at ?? new Date().toISOString(),
      message_type: r.message_type ?? "text",
      attachments,
      reactions: countReactions(r.reactions),
    };
  });

  const community = room.communities as { slug: string; name: string } | null;

  return {
    roomId,
    roomName: room.name,
    communitySlug: community?.slug ?? "",
    communityName: community?.name ?? "",
    messages,
    pinnedMessage: pinned?.body ?? null,
  };
}

export async function getHubMessagePeer(userId: string, peerId: string) {
  const supabase = await createClient();
  const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

  const [{ data: profile }, { data: pointsRows }, { data: myCommunities }, { data: peerCommunities }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, bio")
        .eq("id", peerId)
        .maybeSingle(),
      supabase
        .from("member_points")
        .select("total_points, level, streak_days, last_active_at")
        .eq("user_id", peerId),
      supabase
        .from("community_memberships")
        .select("community_id, communities(id, name, slug)")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("community_memberships")
        .select("community_id, communities(id, name, slug)")
        .eq("user_id", peerId)
        .eq("status", "active"),
    ]);

  if (!profile) return null;

  const points = aggregateMemberPoints(pointsRows ?? []);
  const isOnline = (pointsRows ?? []).some(
    (row) => row.last_active_at && row.last_active_at >= onlineCutoff
  );

  const mySet = new Set((myCommunities ?? []).map((m) => m.community_id));
  const sharedCommunities = (peerCommunities ?? [])
    .filter((m) => mySet.has(m.community_id))
    .map((m) => {
      const c = m.communities as { id: string; name: string; slug: string } | null;
      return c
        ? { id: c.id, name: c.name, slug: c.slug, href: `/c/community/${c.slug}` }
        : null;
    })
    .filter(Boolean) as HubMessagePeer["sharedCommunities"];

  return {
    id: profile.id,
    name: profile.full_name ?? profile.username ?? "Member",
    username: profile.username,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    level: points.level,
    streakDays: points.streak_days,
    isOnline,
    sharedCommunities,
  } satisfies HubMessagePeer;
}

export async function sendHubDirectMessage(
  userId: string,
  conversationId: string,
  body: string
) {
  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("community_inbox_conversations")
    .select("id, user_low, user_high")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv || (conv.user_low !== userId && conv.user_high !== userId)) {
    return { error: "Forbidden" };
  }

  const trimmed = body.trim();
  if (!trimmed) return { error: "Message cannot be empty" };

  const { data, error } = await supabase
    .from("community_inbox_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: trimmed,
      message_type: "text",
      reactions: {},
      attachments: [],
    })
    .select("id, body, sender_id, created_at, message_type, attachments, reactions")
    .single();

  if (error) return { error: error.message };

  await supabase
    .from("community_inbox_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return { message: data };
}
