import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { loadVerifiedUserIds } from "@/lib/identity/verified-users";
import { notifyUser } from "@/lib/notifications/notify-user";
import { aggregateMemberPoints } from "@/lib/community/points";
import type { Json } from "@/types/supabase";
import {
  findLastVisibleMessage,
  isCallSignalingMessage,
  previewChatMessage,
} from "@/lib/community/message-signaling";
import {
  isMarketplaceUnread,
  marketplaceReadKey,
  marketplaceThreadId,
  previewMarketplaceMessage,
} from "@/lib/messaging/marketplace-thread";

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
  /** direct = 1:1 (community DM or platform-wide DM when communitySlug is ""); marketplace = buyer ↔ store. */
  kind: "direct" | "group" | "space" | "marketplace";
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
  /** Marketplace threads only. */
  market?: { conversationId: string; vendorId: string; isVendorSide: boolean; storeHref: string | null };
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
  isVerified: boolean;
  isCreator?: boolean;
  topPercentLabel?: string | null;
  sharedCommunities: Array<{ id: string; name: string; slug: string; href: string }>;
};

function resolveEntityAvatar(
  primary: string | null | undefined,
  fallback: string | null | undefined
): string | null {
  const p = primary?.trim();
  if (p) return p;
  const f = fallback?.trim();
  return f || null;
}
function countReactions(raw: unknown) {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [emoji, users] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(users)) out[emoji] = users.length;
  }
  return out;
}

async function loadReadCursors(userId: string) {
  const supabase = await createClient();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("messaging_conversation_reads")
      .select("conversation_key, last_read_at")
      .eq("user_id", userId);
    if (error) return new Map<string, string>();
    return new Map(
      ((data ?? []) as Array<{ conversation_key: string; last_read_at: string }>).map(
        (r) => [r.conversation_key, r.last_read_at]
      )
    );
  } catch {
    return new Map<string, string>();
  }
}

/** Fallback when unread RPC is unavailable — binary unread from last visible message. */
function unreadFromLast(
  last: { created_at?: string | null; sender_id: string } | null | undefined,
  userId: string,
  lastReadAt: string | undefined
) {
  if (!last || last.sender_id === userId) return 0;
  if (!last.created_at) return 1;
  if (lastReadAt && new Date(last.created_at).getTime() <= new Date(lastReadAt).getTime()) {
    return 0;
  }
  return 1;
}

async function loadUnreadCounts(
  userId: string,
  inboxIds: string[],
  roomIds: string[]
): Promise<Map<string, number>> {
  const supabase = await createClient();
  const out = new Map<string, number>();
  if (inboxIds.length === 0 && roomIds.length === 0) return out;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("hub_message_unread_counts", {
      p_user_id: userId,
      p_inbox_ids: inboxIds,
      p_room_ids: roomIds,
    });
    if (error || !data) return out;
    for (const row of data as Array<{ conversation_key: string; unread_count: number | string }>) {
      const n = typeof row.unread_count === "number" ? row.unread_count : Number(row.unread_count);
      if (row.conversation_key && Number.isFinite(n) && n > 0) {
        out.set(row.conversation_key, Math.min(Math.floor(n), 999));
      }
    }
  } catch {
    /* RPC may be missing until migration applies */
  }
  return out;
}

async function loadRoomLastMessages(
  roomIds: string[]
): Promise<Map<string, { body: string; created_at: string; sender_id: string; message_type: string | null }>> {
  const supabase = await createClient();
  const roomLastMsg = new Map<
    string,
    { body: string; created_at: string; sender_id: string; message_type: string | null }
  >();
  if (roomIds.length === 0) return roomLastMsg;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("hub_room_last_messages", {
      p_room_ids: roomIds,
    });
    if (!error && data) {
      for (const msg of data as Array<{
        room_id: string;
        body: string | null;
        created_at: string | null;
        sender_id: string;
        message_type: string | null;
      }>) {
        if (isCallSignalingMessage(msg.message_type, msg.body)) continue;
        roomLastMsg.set(msg.room_id, {
          body: msg.body ?? "",
          created_at: msg.created_at ?? new Date().toISOString(),
          sender_id: msg.sender_id,
          message_type: msg.message_type,
        });
      }
      return roomLastMsg;
    }
  } catch {
    /* fall through */
  }

  // Legacy fallback: global newest-N can starve quiet rooms — keep as safety net only.
  const { data: roomMsgs } = await supabase
    .from("community_messages")
    .select("room_id, body, created_at, sender_id, message_type")
    .in("room_id", roomIds)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(Math.min(500, Math.max(roomIds.length * 3, 100)));

  for (const msg of roomMsgs ?? []) {
    if (roomLastMsg.has(msg.room_id)) continue;
    if (isCallSignalingMessage(msg.message_type, msg.body)) continue;
    roomLastMsg.set(msg.room_id, {
      body: msg.body ?? "",
      created_at: msg.created_at ?? new Date().toISOString(),
      sender_id: msg.sender_id,
      message_type: msg.message_type,
    });
  }
  return roomLastMsg;
}

type MarketConvRow = {
  id: string;
  buyer_id: string;
  vendor_id: string;
  updated_at: string | null;
  vendor: { business_name?: string | null; business_slug?: string | null; business_logo?: string | null } | null;
};

/** Buyer ↔ store chats where the viewer is the buyer or owns the store (RLS applies). */
async function loadMarketplaceThreads(userId: string, readCursors: Map<string, string>): Promise<HubMessageThread[]> {
  const supabase = await createClient();
  try {
    const { data: myVendors } = await supabase.from("vendors").select("id").eq("user_id", userId);
    const vendorIds = (myVendors ?? []).map((v) => v.id);
    const or = [`buyer_id.eq.${userId}`, ...(vendorIds.length ? [`vendor_id.in.(${vendorIds.join(",")})`] : [])].join(",");
    const { data: convs, error } = await supabase
      .from("conversations")
      .select("id, buyer_id, vendor_id, updated_at, vendor:vendors!vendor_id (business_name, business_slug, business_logo)")
      .or(or)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error || !convs?.length) return [];
    const rows = convs as unknown as MarketConvRow[];
    const buyerIds = [...new Set(rows.filter((c) => c.buyer_id !== userId).map((c) => c.buyer_id))];
    const [{ data: msgs }, { data: buyers }] = await Promise.all([
      supabase
        .from("conversation_messages")
        .select("conversation_id, sender_id, body, message_type, created_at")
        .in("conversation_id", rows.map((c) => c.id))
        .order("created_at", { ascending: false })
        .limit(400),
      buyerIds.length
        ? supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", buyerIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);
    const last = new Map<string, { sender_id: string; body: string | null; message_type: string | null; created_at: string | null }>();
    for (const m of msgs ?? []) if (!last.has(m.conversation_id)) last.set(m.conversation_id, m);
    const buyerById = new Map((buyers ?? []).map((b) => [b.id, b]));

    return rows.map((c) => {
      const iAmBuyer = c.buyer_id === userId;
      const buyer = iAmBuyer ? null : buyerById.get(c.buyer_id);
      const m = last.get(c.id);
      const storeHref = c.vendor?.business_slug ? `/vendors/${c.vendor.business_slug}` : null;
      return {
        id: marketplaceThreadId(c.id),
        kind: "marketplace" as const,
        name: iAmBuyer ? (c.vendor?.business_name ?? "Store") : (buyer?.full_name ?? buyer?.username ?? "Buyer"),
        avatarUrl: iAmBuyer ? (c.vendor?.business_logo ?? null) : (buyer?.avatar_url ?? null),
        subtitle: iAmBuyer ? "Marketplace · you're buying" : "Marketplace · your store",
        lastMessage: m ? previewMarketplaceMessage(m.body, m.message_type) : "No messages yet",
        lastMessageTime: m?.created_at ?? c.updated_at ?? new Date().toISOString(),
        unreadCount: m && m.created_at && isMarketplaceUnread({ sender_id: m.sender_id, created_at: m.created_at }, userId, readCursors.get(marketplaceReadKey(c.id))) ? 1 : 0,
        isOnline: false,
        communityId: "",
        communityName: "Marketplace",
        communitySlug: "",
        peerId: iAmBuyer ? null : c.buyer_id,
        roomId: null,
        href: iAmBuyer ? storeHref : buyer?.username ? `/u/${buyer.username}` : null,
        market: { conversationId: c.id, vendorId: c.vendor_id, isVendorSide: !iAmBuyer, storeHref },
      };
    });
  } catch {
    return [];
  }
}

export async function getHubMessageThreads(userId: string) {
  const supabase = await createClient();
  const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const [communityIds, readCursors] = await Promise.all([getUserCommunityIds(userId), loadReadCursors(userId)]);
  const threads: HubMessageThread[] = [];

  const inboxSelect = `id, community_id, user_high, user_low, updated_at,
         communities(name, slug),
         community_inbox_messages(id, body, created_at, sender_id, message_type)`;
  const inboxQuery = () =>
    supabase
      .from("community_inbox_conversations")
      .select(inboxSelect)
      .or(`user_high.eq.${userId},user_low.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(50)
      .order("created_at", { ascending: false, referencedTable: "community_inbox_messages" })
      .limit(30, { referencedTable: "community_inbox_messages" });

  // Platform-wide DMs (no community) and marketplace chats show for everyone, member of a community or not.
  const [platformDms, communityDms, marketThreads] = await Promise.all([
    inboxQuery().is("community_id", null),
    communityIds.length > 0 ? inboxQuery().in("community_id", communityIds) : Promise.resolve({ data: [] as never[] }),
    loadMarketplaceThreads(userId, readCursors),
  ]);
  threads.push(...marketThreads);

  {
    const convs = [...(platformDms.data ?? []), ...(communityDms.data ?? [])];
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
      const last = findLastVisibleMessage(conv.community_inbox_messages ?? []);
      const unreadCount = unreadFromLast(
        last,
        userId,
        readCursors.get(`inbox:${conv.id}`)
      );

      threads.push({
        id: conv.id,
        kind: "direct",
        name: peer?.full_name ?? peer?.username ?? "Member",
        avatarUrl: peer?.avatar_url ?? null,
        subtitle: community?.name ?? (peer?.username ? `@${peer.username}` : null),
        lastMessage: last
          ? previewChatMessage(last.body ?? "", last.message_type)
          : "No messages yet",
        lastMessageTime: last?.created_at ?? conv.updated_at ?? new Date().toISOString(),
        unreadCount,
        isOnline: onlineSet.has(peerId),
        communityId: conv.community_id ?? "",
        communityName: community?.name ?? (conv.community_id ? "Community" : "Direct message"),
        // "" = platform-wide DM (served by /api/messages/direct).
        communitySlug: conv.community_id ? (community?.slug ?? "") : "",
        peerId,
        roomId: null,
        href: peer?.username ? `/u/${peer.username}` : null,
      });
    }
  }

  if (communityIds.length > 0) {
    type RoomRow = {
      id: string;
      name: string;
      slug: string;
      community_id: string;
      space_id: string | null;
      spaces: {
        slug: string;
        name: string;
        cover_url: string | null;
        banner_url: string | null;
      } | null;
      communities: {
        name: string;
        slug: string;
        avatar_url: string | null;
        cover_image: string | null;
      } | null;
    };

    const [{ data: rooms }, { data: spaces }] = await Promise.all([
      supabase
        .from("rooms")
        .select(
          "id, name, slug, community_id, space_id, spaces(slug, name, cover_url, banner_url), communities(name, slug, avatar_url, cover_image)"
        )
        .in("community_id", communityIds)
        .eq("room_type", "chat")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(50),
      supabase
        .from("spaces")
        .select(
          "id, name, slug, community_id, cover_url, banner_url, communities(name, slug, avatar_url, cover_image)"
        )
        .in("community_id", communityIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(50),
    ]);

    const roomRows = (rooms ?? []) as unknown as RoomRow[];
    const spaceIdsWithGroupRooms = new Set(
      roomRows.map((r) => r.space_id).filter((id): id is string => !!id)
    );

    // Primary chat rooms for spaces not already covered by the group-room list
    // (e.g. beyond the rooms limit above).
    const uncoveredSpaceIds = (spaces ?? [])
      .map((s) => s.id)
      .filter((id) => !spaceIdsWithGroupRooms.has(id));
    const primaryRoomBySpace = new Map<string, RoomRow>();
    if (uncoveredSpaceIds.length > 0) {
      const { data: spaceRooms } = await supabase
        .from("rooms")
        .select(
          "id, name, slug, community_id, space_id, spaces(slug, name, cover_url, banner_url), communities(name, slug, avatar_url, cover_image)"
        )
        .in("space_id", uncoveredSpaceIds)
        .eq("room_type", "chat")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      for (const room of (spaceRooms ?? []) as unknown as RoomRow[]) {
        if (!room.space_id || primaryRoomBySpace.has(room.space_id)) continue;
        primaryRoomBySpace.set(room.space_id, room);
      }
    }

    const roomsForLastMsg: RoomRow[] = [...roomRows];
    const roomIdsSeenForLastMsg = new Set(roomRows.map((r) => r.id));
    for (const room of primaryRoomBySpace.values()) {
      if (roomIdsSeenForLastMsg.has(room.id)) continue;
      roomsForLastMsg.push(room);
      roomIdsSeenForLastMsg.add(room.id);
    }

    const roomIds = roomsForLastMsg.map((r) => r.id);
    const roomLastMsg = await loadRoomLastMessages(roomIds);

    const pushGroupRoomThread = (room: RoomRow) => {
      const community = room.communities;
      const space = room.spaces;
      const last = roomLastMsg.get(room.id);
      const communityImage = resolveEntityAvatar(
        community?.avatar_url,
        community?.cover_image
      );
      const spaceImage = resolveEntityAvatar(
        space?.cover_url,
        space?.banner_url
      );
      threads.push({
        id: `room:${room.id}`,
        kind: "group",
        name: space?.name?.trim() || room.name,
        avatarUrl: resolveEntityAvatar(spaceImage, communityImage),
        subtitle: community?.name ?? null,
        lastMessage: last
          ? previewChatMessage(last.body, last.message_type)
          : "No messages yet",
        lastMessageTime: last?.created_at ?? new Date().toISOString(),
        unreadCount: unreadFromLast(last, userId, readCursors.get(`room:${room.id}`)),
        isOnline: false,
        communityId: room.community_id,
        communityName: community?.name ?? "Community",
        communitySlug: community?.slug ?? "",
        peerId: null,
        roomId: room.id,
        href:
          community && space?.slug && room.slug
            ? `/communities/${community.slug}/spaces/${room.slug}`
            : community
              ? `/communities/${community.slug}/chats`
              : null,
      });
    };

    const pushedRoomIds = new Set<string>();
    for (const room of roomRows) {
      pushGroupRoomThread(room);
      pushedRoomIds.add(room.id);
    }

    for (const space of spaces ?? []) {
      // Already represented by a group room thread — avoid duplicate stubs.
      if (spaceIdsWithGroupRooms.has(space.id)) continue;

      const community = space.communities as {
        name: string;
        slug: string;
        avatar_url: string | null;
        cover_image: string | null;
      } | null;
      const primaryRoom = primaryRoomBySpace.get(space.id);
      const spaceHref = community
        ? `/communities/${community.slug}/spaces/${space.slug}`
        : null;
      const communityImage = resolveEntityAvatar(
        community?.avatar_url,
        community?.cover_image
      );
      const spaceImage = resolveEntityAvatar(
        (space as { cover_url?: string | null }).cover_url,
        (space as { banner_url?: string | null }).banner_url
      );

      if (primaryRoom) {
        // Attach primary chat room so selecting opens real messages.
        if (!pushedRoomIds.has(primaryRoom.id)) {
          pushGroupRoomThread(primaryRoom);
          pushedRoomIds.add(primaryRoom.id);
        }
        continue;
      }

      threads.push({
        id: `space:${space.id}`,
        kind: "space",
        name: space.name,
        avatarUrl: resolveEntityAvatar(spaceImage, communityImage),
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
        href: spaceHref,
      });
    }
  }

  {
    const inboxIds = threads.filter((t) => t.kind === "direct").map((t) => t.id);
    const unreadRoomIds = threads
      .filter((t) => t.kind === "group" && t.roomId)
      .map((t) => t.roomId as string);
    const unreadMap = await loadUnreadCounts(userId, inboxIds, unreadRoomIds);
    if (unreadMap.size > 0) {
      for (const thread of threads) {
        const key =
          thread.kind === "direct"
            ? `inbox:${thread.id}`
            : thread.roomId
              ? `room:${thread.roomId}`
              : null;
        if (!key) continue;
        if (unreadMap.has(key)) {
          thread.unreadCount = unreadMap.get(key) ?? 0;
        }
      }
    }
  }

  threads.sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );

  const unread = threads.filter((t) => t.unreadCount > 0).length;
  const groups = threads.filter((t) => t.kind === "group").length;
  const spaceCount = threads.filter((t) => t.kind === "space").length;
  const direct = threads.filter((t) => t.kind === "direct").length;
  const marketplace = threads.filter((t) => t.kind === "marketplace").length;

  return {
    threads,
    tabCounts: {
      all: threads.length,
      unread,
      direct,
      groups,
      spaces: spaceCount,
      marketplace,
    },
  };
}

export async function getHubDirectMessages(userId: string, conversationId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: conv } = await supabase
    .from("community_inbox_conversations")
    .select("id, user_low, user_high, community_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv || (conv.user_low !== userId && conv.user_high !== userId)) {
    return null;
  }

  let rows: Array<{
    id: string;
    body: string;
    sender_id: string;
    created_at: string | null;
    message_type: string | null;
    attachments: unknown;
    reactions: unknown;
  }> | null = null;

  {
    const primary = await db
      .from("community_inbox_messages")
      .select(
        "id, body, sender_id, created_at, message_type, attachments, reactions, reply_to_id, reply_to_body, reply_to_sender, is_edited"
      )
      .eq("conversation_id", conversationId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(200);
    if (primary.error) {
      const fallback = await supabase
        .from("community_inbox_messages")
        .select("id, body, sender_id, created_at, message_type, attachments, reactions")
        .eq("conversation_id", conversationId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(200);
      rows = fallback.data;
    } else {
      rows = primary.data;
    }
  }

  const peerId = conv.user_low === userId ? conv.user_high : conv.user_low;
  let peerLastReadAt: string | null = null;
  try {
    const { data: peerRead } = await db
      .from("messaging_conversation_reads")
      .select("last_read_at")
      .eq("user_id", peerId)
      .eq("conversation_key", `inbox:${conversationId}`)
      .maybeSingle();
    peerLastReadAt = peerRead?.last_read_at ?? null;
  } catch {
    peerLastReadAt = null;
  }

  const senderIds = [...new Set((rows ?? []).map((r) => r.sender_id))];
  const { data: profs } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", senderIds)
    : { data: [] as never[] };

  const profileMap = new Map((profs ?? []).map((p) => [p.id, p]));

  const messages: HubMessageItem[] = (rows ?? [])
    .filter((r) => !isCallSignalingMessage(r.message_type, r.body))
    .map((r) => {
      const profile = profileMap.get(r.sender_id);
      const attachments = Array.isArray(r.attachments)
        ? (r.attachments as HubMessageItem["attachments"])
        : [];
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

  return {
    conversationId,
    messages,
    pinnedMessage: null as string | null,
    peerLastReadAt,
  };
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

  const messages: HubMessageItem[] = (rows ?? [])
    .filter((r) => !isCallSignalingMessage(r.message_type, r.body))
    .map((r) => {
      const profile = profileMap.get(r.sender_id);
      const attachments = Array.isArray(r.attachments)
        ? (r.attachments as HubMessageItem["attachments"])
        : [];
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

  const [{ data: profile }, { data: pointsRows }, { data: myCommunities }, { data: peerCommunities }, verifiedUserIds] =
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
      loadVerifiedUserIds(createServiceRoleClient(), [peerId]),
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
        ? { id: c.id, name: c.name, slug: c.slug, href: `/communities/${c.slug}` }
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
    isVerified: verifiedUserIds.has(peerId),
    isCreator: points.level >= 5,
    topPercentLabel:
      points.level >= 20
        ? "Top 5% Creators"
        : points.level >= 12
          ? "Top 15% Creators"
          : points.level >= 6
            ? "Rising Creator"
            : null,
    sharedCommunities,
  } satisfies HubMessagePeer;
}

export async function sendHubDirectMessage(
  userId: string,
  conversationId: string,
  body: string,
  attachments: unknown[] = [],
  messageType?: string
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

  const attachmentList = Array.isArray(attachments) ? attachments : [];
  const trimmed = body.trim();
  if (!trimmed && attachmentList.length === 0) return { error: "Message cannot be empty" };

  let resolvedType = messageType ?? "text";
  if (attachmentList.length > 0 && !trimmed) {
    const mimes = attachmentList.map((a) =>
      typeof a === "object" && a && "mime" in a && typeof (a as { mime?: string }).mime === "string"
        ? (a as { mime: string }).mime
        : ""
    );
    const allImages = mimes.length > 0 && mimes.every((m) => m.startsWith("image/"));
    const allAudio = mimes.length > 0 && mimes.every((m) => m.startsWith("audio/"));
    if (allImages) resolvedType = "image";
    else if (allAudio) resolvedType = "audio";
    else resolvedType = "file";
  }

  const { data, error } = await supabase
    .from("community_inbox_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: trimmed,
      message_type: resolvedType,
      reactions: {},
      attachments: attachmentList as Json[],
    })
    .select("id, body, sender_id, created_at, message_type, attachments, reactions")
    .single();

  if (error) return { error: error.message };

  await supabase
    .from("community_inbox_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  // Tell the other person (only them) that they have a new message.
  try {
    const recipientId = conv.user_low === userId ? conv.user_high : conv.user_low;
    if (recipientId && recipientId !== userId) {
      const { data: me } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      const name = (me as { full_name?: string | null } | null)?.full_name || "Someone";
      const preview =
        resolvedType === "image" ? "Sent a photo" : resolvedType === "audio" ? "Sent a voice message" : resolvedType === "file" ? "Sent a file" : trimmed.slice(0, 120);
      await notifyUser(supabase as never, {
        userId: recipientId,
        type: "message",
        category: "new_message",
        title: `New message from ${name}`,
        message: preview || "Sent a message",
        actionUrl: `/messages?thread=${conversationId}`,
        data: { event: "community_direct_message", conversation_id: conversationId, source: "community" },
        groupKey: `dm:${conversationId}`,
        actorId: userId,
      });
    }
  } catch (e) {
    console.warn("[hub-messages] notify failed", e);
  }

  return { message: data };
}
