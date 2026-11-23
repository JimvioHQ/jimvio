"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { uploadCommunityChatFile } from "@/lib/community-chat-upload";
import type { ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { useCall } from "@/components/community/call-context";
import { useWorkspace } from "@/components/community/workspace-context";
import { useRouter } from "next/navigation";
import { deriveMessageType, parseAttachments, pickMime } from "@/lib/utils";
import { toast } from "sonner";
import {
  communityChannelHref,
  resolveSpaceAndRoom,
} from "@/lib/community/workspace";
import { setActiveChatTarget } from "@/lib/community/chat/active-chat-target";
import type { ConversationTarget } from "@/lib/community/chat/conversation-messages";
import { newOutboxClientId } from "@/lib/community/chat/message-outbox";
import {
    replyAuthorLabel,
} from "@/lib/community/chat/message-experience";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import { isCallSignalingMessage } from "@/lib/community/message-signaling";
import type {
    ActiveConvPeer,
    ChatFilter,
    InboxConversation,
    IncomingCall,
    Msg,
    Profile,
    SidebarFilter,
    SidebarMember,
} from "@/types";
import { MAX_ATTACH, MAX_FILE_BYTES } from "../types";

// ─── Local row types ───────────────────────────────────────────────────────────

type InboxConvRow = {
    id: string;
    user_low: string;
    user_high: string;
    community_id: string;
    updated_at: string;
    user_low_profile: {
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
    } | null;
    user_high_profile: {
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
    } | null;
};

type TypingBroadcastPayload = {
    user_id: string;
    name: string;
    typing: boolean;
};

export type TypingUser = { id: string; name: string };

// ─── Hook ──────────────────────────────────────────────────────────────────────

export interface UseChatRoomOptions {
    roomId: string;
    roomName: string;
    communityId: string;
    slug: string;
}

export function useChatRoom({
    roomId,
    communityId,
    slug,
}: UseChatRoomOptions) {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    // ── Auth ────────────────────────────────────────────────────────────────────
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) =>
            setUserId(user?.id ?? null)
        );
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            setUserId(session?.user?.id ?? null);
        });
        return () => subscription.unsubscribe();
    }, [supabase]);

    // ── Conversation / inbox ────────────────────────────────────────────────────
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [activeConvPeer, setActiveConvPeer] = useState<ActiveConvPeer | null>(null);
    const [forceShowList, setForceShowList] = useState(false);

    const { setIncomingCall } = useCall();
    const isChatting = !forceShowList && (!!roomId || !!activeConvId);

    const conversationTarget = useMemo((): ConversationTarget | null => {
        if (activeConvId) {
            return { kind: "inbox", slug, conversationId: activeConvId };
        }
        if (roomId) return { kind: "room", roomId };
        return null;
    }, [activeConvId, roomId, slug]);

    // ── Thread ──────────────────────────────────────────────────────────────────
    const [threadRoot, setThreadRoot] = useState<Msg | null>(null);
    const [threadReplies, setThreadReplies] = useState<Msg[]>([]);
    const [threadOpen, setThreadOpen] = useState(false);
    const threadRootRef = useRef<Msg | null>(null);
    const threadOpenRef = useRef(false);

    useEffect(() => { threadRootRef.current = threadRoot; }, [threadRoot]);
    useEffect(() => { threadOpenRef.current = threadOpen; }, [threadOpen]);

    const loadThread = useCallback(async (rootId: string) => {
        const sb = createClient();
        const { data } = await sb
            .from("community_messages")
            .select(
                "*, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)"
            )
            .eq("thread_id", rootId)
            .eq("is_deleted", false)
            .order("created_at", { ascending: true });
        setThreadReplies((data as Msg[]) ?? []);
    }, []);

    const openThread = useCallback(
        async (m: Msg) => {
            setThreadRoot(m);
            setThreadOpen(true);
            await loadThread(m.id);
        },
        [loadThread]
    );

    const handleThreadReply = useCallback(
        (threadId: string) => {
            if (threadOpenRef.current && threadRootRef.current?.id === threadId) {
                void loadThread(threadId);
            }
        },
        [loadThread]
    );

    const {
        messages,
        loading,
        loadingOlder,
        hasMore,
        error: messagesError,
        upsertMessage,
        patchMessage: patchConversationMessage,
        removeMessage: removeConversationMessage,
        loadOlder,
    } = useConversationMessages({
        target: conversationTarget,
        enabled: !!conversationTarget,
        realtimeEnabled: isChatting,
        userId,
        onIncomingCall: (payload) => {
            if (!payload) return;
            const sender = payload.sender;
            setIncomingCall({
                type: payload.type,
                roomId: payload.roomId,
                convId: payload.convId,
                sender: sender
                    ? {
                          name: sender.full_name || sender.username || "Someone",
                          avatar: sender.avatar_url,
                          username: sender.username ?? undefined,
                          full_name: sender.full_name ?? undefined,
                          avatar_url: sender.avatar_url ?? undefined,
                      }
                    : null,
            });
        },
        onThreadReply: handleThreadReply,
    });

    useEffect(() => {
        if (messagesError) toast.error(messagesError);
    }, [messagesError]);

    const patchMessage = useCallback(
        (id: string, patch: Partial<Msg>) => {
            patchConversationMessage(id, patch);
            setThreadReplies((prev) =>
                prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
            );
            setThreadRoot((r) => (r && r.id === id ? { ...r, ...patch } : r));
        },
        [patchConversationMessage]
    );

    const removeMessage = useCallback(
        (id: string) => {
            removeConversationMessage(id);
            setThreadReplies((prev) => prev.filter((m) => m.id !== id));
            setThreadRoot((r) => {
                if (r?.id === id) {
                    setThreadOpen(false);
                    return null;
                }
                return r;
            });
        },
        [removeConversationMessage]
    );

    // ── Sidebar ─────────────────────────────────────────────────────────────────
    const [sidebarMembers, setSidebarMembers] = useState<SidebarMember[]>([]);
    const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("all");

    const { spacesWithRooms } = useWorkspace();
    const allChatRooms = useMemo(
        () =>
            spacesWithRooms.flatMap(
                (s: {
                    id: string;
                    rooms: { room_type: string; id: string; name: string }[];
                }) =>
                    s.rooms
                        .filter((r) => r.room_type === "chat")
                        .map((r) => ({ spaceId: s.id, ...r }))
            ),
        [spacesWithRooms]
    );

    // Unread counts from localStorage
    useEffect(() => {
        const read = () => {
            const uc: Record<string, number> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k?.startsWith("workspace-unread:"))
                    uc[k.replace("workspace-unread:", "")] = parseInt(
                        localStorage.getItem(k) ?? "0",
                        10
                    );
            }
            setUnreadCounts(uc);
        };
        read();
        window.addEventListener("storage", read);
        return () => window.removeEventListener("storage", read);
    }, []);

    // Clear unread on open + register active chat target for shell unread sync
    useEffect(() => {
        const chatting = !forceShowList && (!!roomId || !!activeConvId);
        if (chatting) {
            setActiveChatTarget({
                roomId: activeConvId ? null : roomId || null,
                convId: activeConvId || null,
            });
        } else {
            setActiveChatTarget({ roomId: null, convId: null });
        }
        return () => setActiveChatTarget({ roomId: null, convId: null });
    }, [roomId, activeConvId, forceShowList]);

    useEffect(() => {
        if (!roomId && !activeConvId) return;
        const key = `workspace-unread:${activeConvId ?? roomId}`;
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            window.dispatchEvent(new Event("storage"));
        }
    }, [roomId, activeConvId]);

    // Persist read cursor so Hub unread counts + peer read receipts stay accurate.
    useEffect(() => {
        if (!userId || !isChatting) return;
        const last = messages[messages.length - 1];
        if (!last?.id || last.id.startsWith("opt:")) return;

        const conversationKey = activeConvId
            ? `inbox:${activeConvId}`
            : roomId
              ? `room:${roomId}`
              : null;
        if (!conversationKey) return;

        void fetch("/api/c/messages/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                conversationKey,
                lastReadMessageId: last.id,
            }),
        }).catch(() => {
            /* non-fatal */
        });
    }, [
        userId,
        isChatting,
        activeConvId,
        roomId,
        messages.length,
        messages[messages.length - 1]?.id,
    ]);

    // Fetch sidebar members (inbox is loaded + subscribed below, scoped to community)
    useEffect(() => {
        const controller = new AbortController();
        async function fetchMembers() {
            try {
                const mr = await fetch(`/api/communities/${slug}/members`, {
                    signal: controller.signal,
                });
                if (mr.ok) setSidebarMembers((await mr.json()).members ?? []);
            } catch (e: unknown) {
                if (e instanceof Error && e.name !== "AbortError") console.error(e);
            }
        }
        fetchMembers();
        return () => {
            controller.abort();
        };
    }, [slug]);

    // Fetch inbox conversations for current user
    useEffect(() => {
        if (!userId || !communityId) return;
        const controller = new AbortController();

        const fetchInboxes = async () => {
            const { data } = await supabase
                .from("community_inbox_conversations")
                .select(
                    "*, user_low_profile:profiles!community_inbox_conversations_user_low_fkey(full_name, avatar_url, username), user_high_profile:profiles!community_inbox_conversations_user_high_fkey(full_name, avatar_url, username)"
                )
                .eq("community_id", communityId)
                .or(`user_low.eq.${userId},user_high.eq.${userId}`)
                .order("updated_at", { ascending: false })
                .abortSignal(controller.signal);

            if (data) {
                setInboxConversations(
                    (data as InboxConvRow[]).map((conv: InboxConvRow) => {
                        const isLow = conv.user_low === userId;
                        const peer = isLow ? conv.user_high_profile : conv.user_low_profile;
                 return {
                     id: conv.id,
                     peerId: isLow ? conv.user_high : conv.user_low,
                     peerName: peer?.full_name ?? peer?.username ?? "Member",
                     peerAvatar: peer?.avatar_url ?? null,
                 };
                    })
                );
            }
        };

        fetchInboxes();
        const ch = supabase
            .channel(`inbox_list_${communityId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "community_inbox_conversations",
                    filter: `community_id=eq.${communityId}`,
                },
                fetchInboxes
            )
            .subscribe();
        return () => {
            controller.abort();
            supabase.removeChannel(ch);
        };
    }, [userId, communityId, supabase]);

    // ── Presence (online members) + typing broadcast ────────────────────────────
    const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const typingSelfRef = useRef<{ active: boolean; lastSentAt: number }>({
        active: false,
        lastSentAt: 0,
    });
    const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Presence only applies to the group room stack, not 1:1 DMs.
        if (!roomId || !userId || activeConvId) {
            setOnlineUserIds([]);
            setTypingUsers([]);
            return;
        }

        const channel = supabase.channel(`presence:room:${roomId}`, {
            config: { presence: { key: userId } },
        });

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState() as Record<string, unknown[]>;
                setOnlineUserIds(Object.keys(state));
            })
            .on(
                "broadcast",
                { event: "typing" },
                ({ payload }: { payload: TypingBroadcastPayload }) => {
                    if (!payload || payload.user_id === userId) return;
                    const { user_id, name, typing } = payload;

                    if (typingTimeoutsRef.current[user_id]) {
                        clearTimeout(typingTimeoutsRef.current[user_id]);
                        delete typingTimeoutsRef.current[user_id];
                    }

                    setTypingUsers((prev) => {
                        const rest = prev.filter((t) => t.id !== user_id);
                        return typing ? [...rest, { id: user_id, name }] : rest;
                    });

                    if (typing) {
                        typingTimeoutsRef.current[user_id] = setTimeout(() => {
                            setTypingUsers((prev) => prev.filter((t) => t.id !== user_id));
                        }, 4000);
                    }
                }
            )
            .subscribe((status: string) => {
                if (status === "SUBSCRIBED") {
                    void channel.track({ online_at: new Date().toISOString() });
                }
            });

        presenceChannelRef.current = channel;

        return () => {
            Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
            typingTimeoutsRef.current = {};
            if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
            typingSelfRef.current = { active: false, lastSentAt: 0 };
            setOnlineUserIds([]);
            setTypingUsers([]);
            supabase.removeChannel(channel);
            presenceChannelRef.current = null;
        };
    }, [roomId, userId, activeConvId, supabase]);

    const sendTypingBroadcast = useCallback(
        (isTyping: boolean) => {
            const channel = presenceChannelRef.current;
            if (!channel || !userId) return;
            const me = sidebarMembers.find((m) => m.user_id === userId);
            const name = me?.profile?.full_name || me?.profile?.username || "Someone";
            typingSelfRef.current = { active: isTyping, lastSentAt: Date.now() };
            void channel.send({
                type: "broadcast",
                event: "typing",
                payload: { user_id: userId, name, typing: isTyping },
            });
        },
        [userId, sidebarMembers]
    );

    const setTyping = useCallback(
        (isTyping: boolean) => {
            if (typingStopTimerRef.current) {
                clearTimeout(typingStopTimerRef.current);
                typingStopTimerRef.current = null;
            }

            const shouldSend =
                isTyping !== typingSelfRef.current.active ||
                Date.now() - typingSelfRef.current.lastSentAt > 2000;

            if (shouldSend) sendTypingBroadcast(isTyping);

            if (isTyping) {
                typingStopTimerRef.current = setTimeout(() => sendTypingBroadcast(false), 3000);
            }
        },
        [sendTypingBroadcast]
    );

    // ── Input state ──────────────────────────────────────────────────────────────
    const [text, setText] = useState("");
    const [threadReplyText, setThreadReplyText] = useState("");
    const [pendingMain, setPendingMain] = useState<ChatAttachmentPayload[]>([]);
    const [pendingThread, setPendingThread] = useState<ChatAttachmentPayload[]>([]);
    const [replyingTo, setReplyingTo] = useState<Msg | null>(null);
    const [forwardingTo, setForwardingTo] = useState<Msg | null>(null);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);

    const beginReply = useCallback((msg: Msg) => {
        setForwardingTo(null);
        setReplyingTo(msg);
    }, []);

    const beginForward = useCallback((msg: Msg) => {
        setReplyingTo(null);
        setForwardingTo(msg);
    }, []);

    const cancelReplyOrForward = useCallback(() => {
        setReplyingTo(null);
        setForwardingTo(null);
    }, []);

    // ── File upload ──────────────────────────────────────────────────────────────
    const handleFiles = useCallback(
        async (files: FileList | null, target: "main" | "thread") => {
            if (!files?.length) return;
            if (!navigator.onLine) {
                toast.error("You're offline — reconnect to upload files.");
                return;
            }
            setUploading(true);
            try {
                for (const file of Array.from(files)) {
                    if (file.size > MAX_FILE_BYTES) {
                        toast.error(`${file.name} is too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB)`);
                        continue;
                    }
                    const up = await uploadCommunityChatFile(communityId, roomId, file);
                    if (target === "main")
                        setPendingMain((p) => {
                            if (p.length >= MAX_ATTACH) {
                                toast.error(`At most ${MAX_ATTACH} attachments allowed`);
                                return p;
                            }
                            return [...p, up];
                        });
                    else
                        setPendingThread((p) => {
                            if (p.length >= MAX_ATTACH) {
                                toast.error(`At most ${MAX_ATTACH} attachments allowed`);
                                return p;
                            }
                            return [...p, up];
                        });
                }
            } catch (e: unknown) {
                console.error(e);
                toast.error(e instanceof Error ? e.message : "Failed to upload file");
            } finally {
                setUploading(false);
            }
        },
        [communityId, roomId]
    );

    // ── Link previews ────────────────────────────────────────────────────────────
    const fetchLinkPreview = useCallback(async (body: string) => {
        const match = body.match(/https?:\/\/[^\s]+/i);
        if (!match) return undefined;
        try {
            const res = await fetch(`/api/c/chat/link-preview?url=${encodeURIComponent(match[0])}`);
            if (!res.ok) return undefined;
            const data = await res.json();
            return data?.preview ? { link_preview: data.preview } : undefined;
        } catch {
            return undefined;
        }
    }, []);

    // ── Send ─────────────────────────────────────────────────────────────────────
    const sendMessage = useCallback(
        async (threadId?: string | null) => {
            const isThread = !!threadId;
            const t = (isThread ? threadReplyText : text).trim();
            const queue = isThread ? pendingThread : pendingMain;
            if ((!t && queue.length === 0 && !forwardingTo) || sending) return;
            if (!navigator.onLine) {
                toast.error("You're offline — reconnect to send.");
                return;
            }
            setSending(true);
            if (!isThread) setTyping(false);

            const replyTarget = !isThread ? replyingTo : null;
            const forwardTarget = !isThread ? forwardingTo : null;
            const bodyText =
                t ||
                (forwardTarget
                    ? (forwardTarget.body || "").trim() || "Forwarded message"
                    : "");
            const replySender = replyTarget
                ? replyAuthorLabel(null, replyTarget)
                : null;
            const forwardMeta = forwardTarget
                ? {
                      forwarded_from: {
                          id: forwardTarget.id,
                          body: (forwardTarget.body || "").slice(0, 200),
                          sender: replyAuthorLabel(null, forwardTarget),
                      },
                  }
                : null;

            const clientId = !isThread ? newOutboxClientId() : null;
            const createdAt = new Date().toISOString();

            if (!isThread && clientId && userId) {
                const optimistic: Msg = {
                    id: clientId,
                    body: bodyText,
                    sender_id: userId,
                    created_at: createdAt,
                    message_type: deriveMessageType(queue, bodyText),
                    thread_id: null,
                    attachments: queue,
                    reactions: {},
                    profiles: null,
                    reply_to_id: replyTarget?.id ?? null,
                    reply_to_body: replyTarget?.body?.slice(0, 200) ?? null,
                    reply_to_sender: replySender,
                    metadata: forwardMeta,
                    is_edited: false,
                    reply_count: 0,
                };
                upsertMessage(optimistic);
                setText("");
                setPendingMain([]);
                setReplyingTo(null);
                setForwardingTo(null);
                setAtBottom(true);
                requestAnimationFrame(() =>
                    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
                );
            }

            try {
                const linkMeta =
                    queue.length === 0 && bodyText
                        ? await fetchLinkPreview(bodyText)
                        : undefined;
                const metadata = {
                    ...(linkMeta ?? {}),
                    ...(forwardMeta ?? {}),
                };
                const ep = activeConvId
                    ? `/api/communities/${slug}/inbox/${activeConvId}/messages`
                    : `/api/messages/${roomId}`;
                const res = await fetch(ep, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        body: bodyText,
                        threadId: threadId ?? null,
                        attachments: queue,
                        message_type: deriveMessageType(queue, bodyText),
                        reply_to_id: replyTarget ? replyTarget.id : null,
                        reply_to_body: replyTarget
                            ? replyTarget.body?.slice(0, 200)
                            : null,
                        reply_to_sender: replySender,
                        metadata:
                            Object.keys(metadata).length > 0 ? metadata : undefined,
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                const msg = (data.message ?? data.row) as Msg;
                if (msg.thread_id) {
                    setThreadReplies((p) =>
                        p.some((m) => m.id === msg.id)
                            ? p
                            : [...p, msg].sort(
                                  (a, b) =>
                                      new Date(a.created_at).getTime() -
                                      new Date(b.created_at).getTime()
                              )
                    );
                    setThreadReplyText("");
                    setPendingThread([]);
                } else {
                    upsertMessage(msg);
                    if (!clientId) {
                        setText("");
                        setPendingMain([]);
                        setReplyingTo(null);
                        setForwardingTo(null);
                        setAtBottom(true);
                        requestAnimationFrame(() =>
                            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
                        );
                    }
                }
            } catch (e: unknown) {
                console.error(e);
                if (clientId) removeConversationMessage(clientId);
                toast.error(e instanceof Error ? e.message : "Failed to send message");
            } finally {
                setSending(false);
            }
        },
        [
            threadReplyText,
            text,
            pendingThread,
            pendingMain,
            sending,
            activeConvId,
            slug,
            roomId,
            replyingTo,
            forwardingTo,
            userId,
            upsertMessage,
            removeConversationMessage,
            setTyping,
            fetchLinkPreview,
        ]
    );

    // ── GIFs (GIPHY) ──────────────────────────────────────────────────────────────
    const [sendingGif, setSendingGif] = useState(false);

    const sendGif = useCallback(
        async (gif: { url: string; title?: string }) => {
            if (sending || sendingGif) return;
            setSendingGif(true);
            try {
                const ep = activeConvId
                    ? `/api/communities/${slug}/inbox/${activeConvId}/messages`
                    : `/api/messages/${roomId}`;
                const res = await fetch(ep, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        body: "",
                        threadId: null,
                        attachments: [
                            {
                                url: gif.url,
                                name: gif.title || "GIF",
                                mime: "image/gif",
                                size: 0,
                            },
                        ],
                        message_type: "image",
                        metadata: { gif: true },
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                upsertMessage((data.message ?? data.row) as Msg);
                setAtBottom(true);
                requestAnimationFrame(() =>
                    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
                );
            } catch (e: unknown) {
                console.error(e);
                toast.error(e instanceof Error ? e.message : "Failed to send GIF");
            } finally {
                setSendingGif(false);
            }
        },
        [sending, sendingGif, activeConvId, slug, roomId, upsertMessage]
    );

    const sendCommerceMessage = useCallback(
        async (embed: import("@/lib/community/commerce").CommerceEmbed, body = "") => {
            if (sending) return;
            setSending(true);
            try {
                const ep = activeConvId
                    ? `/api/communities/${slug}/inbox/${activeConvId}/messages`
                    : `/api/messages/${roomId}`;
                const messageType =
                    embed.kind === "product" || embed.kind === "marketplace_item"
                        ? "product"
                        : embed.kind === "course"
                          ? "course"
                          : "commerce";
                const res = await fetch(ep, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        body:
                            body ||
                            `Shared a ${embed.kind.replace(/_/g, " ")}: ${embed.title}`,
                        threadId: null,
                        attachments: [],
                        message_type: messageType,
                        metadata: {
                            commerce: embed,
                            product_id:
                                embed.kind === "product" ||
                                embed.kind === "marketplace_item"
                                    ? embed.id
                                    : undefined,
                            slug: embed.href?.split("/").pop(),
                            name: embed.title,
                            price: embed.price,
                            image: embed.imageUrl,
                            course_id: embed.kind === "course" ? embed.id : undefined,
                        },
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                upsertMessage((data.message ?? data.row) as Msg);
                setAtBottom(true);
                requestAnimationFrame(() =>
                    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
                );
                toast.success("Commerce offer shared");
            } catch (e: unknown) {
                console.error(e);
                toast.error(
                    e instanceof Error ? e.message : "Failed to share commerce offer"
                );
            } finally {
                setSending(false);
            }
        },
        [sending, activeConvId, slug, roomId, upsertMessage]
    );

    // ── Voice recording ──────────────────────────────────────────────────────────
    const [voiceRecording, setVoiceRecording] = useState(false);
    const [voiceSeconds, setVoiceSeconds] = useState(0);
    const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
    const [voiceMime, setVoiceMime] = useState("");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const voiceChunksRef = useRef<Blob[]>([]);
    const voiceStreamRef = useRef<MediaStream | null>(null);
    const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            voiceStreamRef.current?.getTracks().forEach((t) => t.stop());
            if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
        };
    }, []);

    const startVoiceRecording = useCallback(async () => {
        if (voiceRecording || sending || uploading) return;
        const mime = pickMime();
        if (!mime) {
            toast.error("Voice recording is not supported in this browser.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            voiceStreamRef.current = stream;
            voiceChunksRef.current = [];
            setVoiceSeconds(0);
            voiceTimerRef.current = setInterval(
                () => setVoiceSeconds((s) => s + 1),
                1000
            );
            const mr = new MediaRecorder(stream, { mimeType: mime });
            mediaRecorderRef.current = mr;
            mr.ondataavailable = (e) => {
                if (e.data.size) voiceChunksRef.current.push(e.data);
            };
            mr.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                voiceStreamRef.current = null;
                mediaRecorderRef.current = null;
                if (voiceTimerRef.current) {
                    clearInterval(voiceTimerRef.current);
                    voiceTimerRef.current = null;
                }
                const blob = new Blob(voiceChunksRef.current, { type: mime });
                voiceChunksRef.current = [];
                setVoiceRecording(false);
                if (blob.size >= 100) {
                    setVoiceBlob(blob);
                    setVoiceMime(mime);
                }
            };
            mr.start();
            setVoiceRecording(true);
        } catch (e: unknown) {
            console.error("Microphone access denied.", e);
            toast.error("Microphone access is required for voice messages.");
        }
    }, [voiceRecording, sending, uploading]);

    const stopVoiceRecording = useCallback(() => {
        const mr = mediaRecorderRef.current;
        if (mr && mr.state === "recording") mr.stop();
        else {
            setVoiceRecording(false);
            if (voiceTimerRef.current) {
                clearInterval(voiceTimerRef.current);
                voiceTimerRef.current = null;
            }
        }
    }, []);

    const sendVoiceBlob = useCallback(async () => {
        if (!voiceBlob || sending) return;
        setSending(true);
        try {
            const ext = voiceMime.includes("mp4") ? "m4a" : "webm";
            const file = new File([voiceBlob], `voice-${Date.now()}.${ext}`, {
                type: voiceBlob.type || voiceMime,
            });
            setUploading(true);
            const up = await uploadCommunityChatFile(communityId, roomId, file);
            setUploading(false);
            const ep = activeConvId
                ? `/api/communities/${slug}/inbox/${activeConvId}/messages`
                : `/api/messages/${roomId}`;
            const res = await fetch(ep, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    body: "",
                    threadId: null,
                    attachments: [up],
                    message_type: "audio",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            upsertMessage((data.message ?? data.row) as Msg);
            setVoiceBlob(null);
            setVoiceMime("");
            setAtBottom(true);
            setTimeout(() => scrollToBottom(), 50);
        } catch (e: unknown) {
            console.error("Voice send failed:", e);
            toast.error(e instanceof Error ? e.message : "Failed to send voice message");
        } finally {
            setSending(false);
        }
    }, [voiceBlob, sending, voiceMime, communityId, roomId, activeConvId, slug, upsertMessage]);

    // ── Scroll ───────────────────────────────────────────────────────────────────
    const bottomRef = useRef<HTMLDivElement>(null);
    const threadBottomRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [atBottom, setAtBottom] = useState(true);

    const scrollToBottom = useCallback((smooth = true) => {
        bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }, []);

    const onScrollMain = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 100);
    }, []);

    useEffect(() => {
        if (atBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, atBottom]);

    useEffect(() => {
        threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [threadReplies]);

    // ── Reactions ────────────────────────────────────────────────────────────────
    const toggleReaction = useCallback(
        async (messageId: string, emoji: string) => {
            if (!navigator.onLine) {
                toast.error("You're offline — reconnect to react.");
                return;
            }
            try {
                const ep = activeConvId
                    ? `/api/communities/${slug}/inbox/${activeConvId}/messages/${messageId}/react`
                    : `/api/messages/${roomId}/${messageId}/react`;
                const res = await fetch(ep, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ emoji }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to update reaction");
                patchMessage(messageId, { reactions: data.reactions });
            } catch (e: unknown) {
                console.error(e);
                toast.error(e instanceof Error ? e.message : "Failed to update reaction");
            }
        },
        [roomId, activeConvId, slug, patchMessage]
    );

    // ── Staff role (pin gating) ──────────────────────────────────────────────────
    const [isStaff, setIsStaff] = useState(false);

    useEffect(() => {
        if (!userId || !communityId) {
            setIsStaff(false);
            return;
        }
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from("community_memberships")
                .select("role")
                .eq("community_id", communityId)
                .eq("user_id", userId)
                .eq("status", "active")
                .maybeSingle();
            if (!cancelled) {
                setIsStaff(["owner", "admin", "moderator"].includes(data?.role ?? ""));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [userId, communityId, supabase]);

    // ── Pin / Report (staff pin, anyone can report) ─────────────────────────────
    const togglePin = useCallback(
        async (messageId: string, pin: boolean) => {
            if (activeConvId) return; // pin only applies to room messages
            try {
                const res = await fetch(`/api/messages/${roomId}/${messageId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pin }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                patchMessage(messageId, data.message as Msg);
                toast.success(pin ? "Message pinned" : "Message unpinned");
            } catch (e: unknown) {
                console.error(e);
                toast.error(e instanceof Error ? e.message : "Failed to update pin");
            }
        },
        [roomId, activeConvId, patchMessage]
    );

    const reportMessage = useCallback(
        async (messageId: string, reason?: string) => {
            if (activeConvId) return;
            try {
                const res = await fetch(`/api/messages/${roomId}/${messageId}/report`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: reason ?? "other" }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                toast.success("Message reported to moderators.");
            } catch (e: unknown) {
                console.error(e);
                toast.error(e instanceof Error ? e.message : "Failed to report message");
            }
        },
        [roomId, activeConvId]
    );

    // ── Delete ───────────────────────────────────────────────────────────────────
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const deleteMessage = useCallback((messageId: string) => {
        setConfirmDelete(messageId);
    }, []);

    const confirmDeleteAction = useCallback(async () => {
        if (!confirmDelete) return;
        const messageId = confirmDelete;
        setConfirmDelete(null);
        if (!navigator.onLine) {
            toast.error("You're offline — reconnect to delete.");
            return;
        }
        try {
            const ep = activeConvId
                ? `/api/communities/${slug}/inbox/${activeConvId}/messages/${messageId}`
                : `/api/messages/${roomId}/${messageId}`;
            const res = await fetch(ep, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ delete: true }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to delete");
            removeMessage(messageId);
            toast.success("Message removed");
        } catch (e: unknown) {
            console.error(e);
            toast.error(e instanceof Error ? e.message : "Failed to delete message");
        }
    }, [confirmDelete, roomId, activeConvId, slug, removeMessage]);

    // ── Edit ─────────────────────────────────────────────────────────────────────
    const [editingMsg, setEditingMsg] = useState<Msg | null>(null);
    const [editBody, setEditBody] = useState("");
    const [editSaving, setEditSaving] = useState(false);

    const saveEdit = useCallback(async () => {
        if (!editingMsg) return;
        const t = editBody.trim();
        if (!t) return;
        if (!navigator.onLine) {
            toast.error("You're offline — reconnect to edit.");
            return;
        }
        setEditSaving(true);
        try {
            const ep = activeConvId
                ? `/api/communities/${slug}/inbox/${activeConvId}/messages/${editingMsg.id}`
                : `/api/messages/${roomId}/${editingMsg.id}`;
            const res = await fetch(ep, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: t }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save edit");
            patchMessage(editingMsg.id, data.message as Msg);
            setEditingMsg(null);
            toast.success("Message updated");
        } catch (e: unknown) {
            console.error(e);
            toast.error(e instanceof Error ? e.message : "Failed to save edit");
        } finally {
            setEditSaving(false);
        }
    }, [editingMsg, editBody, roomId, activeConvId, slug, patchMessage]);

    // ── Search / filter ──────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [chatFilter, setChatFilter] = useState<ChatFilter>("all");
    const [emojiOpen, setEmojiOpen] = useState(false);

    // Server-backed search (full room history, not just the loaded window).
    const [serverSearchResults, setServerSearchResults] = useState<Msg[] | null>(null);
    const [serverSearching, setServerSearching] = useState(false);

    useEffect(() => {
        const q = searchQuery.trim();
        if (activeConvId || !roomId || !searchOpen || q.length < 2) {
            setServerSearchResults(null);
            setServerSearching(false);
            return;
        }
        const controller = new AbortController();
        setServerSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/api/messages/${roomId}/search?q=${encodeURIComponent(q)}`,
                    { signal: controller.signal }
                );
                const data = await res.json();
                if (res.ok) setServerSearchResults((data.messages ?? []) as Msg[]);
            } catch (e: unknown) {
                if (e instanceof Error && e.name !== "AbortError") console.error(e);
            } finally {
                setServerSearching(false);
            }
        }, 300);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [searchQuery, searchOpen, roomId, activeConvId]);

    // ── Derived ──────────────────────────────────────────────────────────────────
    const filteredMessages = useMemo(() => {
        const base = serverSearchResults ?? messages;
        let list = base.filter(
            (m) => !isCallSignalingMessage(m.message_type, m.body)
        );
        if (chatFilter === "media") {
            list = list.filter(
                (m) =>
                    parseAttachments(m.attachments).some((a) =>
                        (a.mime ?? "").startsWith("image/") ||
                        (a.mime ?? "").startsWith("video/") ||
                        (a.mime ?? "").startsWith("audio/") ||
                        /\.(png|jpe?g|gif|webp|mp4|webm|mp3|wav)(\?|$)/i.test(a.url)
                    ) || ["image", "audio", "video"].includes(m.message_type)
            );
        } else if (chatFilter === "files") {
            list = list.filter((m) => parseAttachments(m.attachments).length > 0);
        } else if (chatFilter === "pinned") {
            list = list.filter((m) => !!m.is_pinned);
        } else if (chatFilter === "threads") {
            list = list.filter((m) => !m.thread_id && (m.reply_count ?? 0) > 0);
        }
        if (serverSearchResults) return list;
        const q = searchQuery.trim().toLowerCase();
        if (!q) return list;
        return list.filter(
            (m) =>
                (m.body ?? "").toLowerCase().includes(q) ||
                (m.profiles?.full_name ?? "").toLowerCase().includes(q) ||
                (m.profiles?.username ?? "").toLowerCase().includes(q) ||
                parseAttachments(m.attachments).some((a) =>
                    (a.name ?? "").toLowerCase().includes(q)
                )
        );
    }, [messages, searchQuery, chatFilter, serverSearchResults]);

    // ── DM inbox creation ────────────────────────────────────────────────────────
    const openDmWith = useCallback(
        async (member: SidebarMember) => {
            if (member.user_id === userId) return;
            const name = member.profile?.full_name ?? member.profile?.username ?? "Member";
            const av = member.profile?.avatar_url ?? null;
            try {
                const res = await fetch(`/api/communities/${slug}/inbox`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ peerUserId: member.user_id }),
                });
                const data = await res.json();
                if (res.ok && data.conversationId) {
                    setActiveConvId(data.conversationId);
                    setActiveConvPeer({ name, avatar: av });
                    setForceShowList(false);
                    setSidebarFilter("all");
                }
            } catch (e: unknown) {
                console.error(e);
            }
        },
        [userId, slug]
    );

    const navigateToRoom = useCallback(
        (spaceId: string, rId: string) => {
            setActiveConvId(null);
            setActiveConvPeer(null);
            setForceShowList(false);
            const hit = resolveSpaceAndRoom(spacesWithRooms, spaceId, rId);
            if (hit) {
                router.push(
                    communityChannelHref(slug, hit.room.slug)
                );
                return;
            }
            router.push(`/communities/${slug}`);
        },
        [router, slug, spacesWithRooms]
    );

    return {
        userId,
        messages,
        filteredMessages,
        loading,
        loadingOlder,
        hasMore,
        loadOlder,
        upsertMessage,
        patchMessage,
        removeMessage,
        threadRoot,
        threadReplies,
        threadOpen,
        setThreadOpen,
        threadBottomRef,
        openThread,
        activeConvId,
        setActiveConvId,
        activeConvPeer,
        setActiveConvPeer,
        isChatting,
        allChatRooms,
        sidebarMembers,
        inboxConversations,
        unreadCounts,
        sidebarFilter,
        setSidebarFilter,
        forceShowList,
        setForceShowList,
        openDmWith,
        navigateToRoom,
        text,
        setText,
        threadReplyText,
        setThreadReplyText,
        pendingMain,
        setPendingMain,
        pendingThread,
        setPendingThread,
        replyingTo,
        setReplyingTo,
        forwardingTo,
        beginReply,
        beginForward,
        cancelReplyOrForward,
        uploading,
        sending,
        handleFiles,
        sendMessage,
        voiceRecording,
        voiceSeconds,
        voiceBlob,
        setVoiceBlob,
        setVoiceMime,
        startVoiceRecording,
        stopVoiceRecording,
        sendVoiceBlob,
        bottomRef,
        scrollRef,
        atBottom,
        setAtBottom,
        scrollToBottom,
        onScrollMain,
        toggleReaction,
        isStaff,
        togglePin,
        reportMessage,
        confirmDelete,
        setConfirmDelete,
        deleteMessage,
        confirmDeleteAction,
        editingMsg,
        setEditingMsg,
        editBody,
        setEditBody,
        editSaving,
        saveEdit,
        searchQuery,
        setSearchQuery,
        searchOpen,
        setSearchOpen,
        serverSearching,
        chatFilter,
        setChatFilter,
        emojiOpen,
        setEmojiOpen,
        onlineUserIds,
        typingUsers,
        setTyping,
        sendGif,
        sendCommerceMessage,
        sendingGif,
    };
}