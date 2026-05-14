"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { uploadCommunityChatFile } from "@/lib/community-chat-upload";
import type { ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { useCall } from "@/components/community/call-context";
import { useWorkspace } from "@/components/community/workspace-context";
import { useRouter } from "next/navigation";
import {
    deriveMessageType,
    parseAttachments,
    pickMime,
} from "@/lib/utils";
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

type RealtimePayload = {
    new: Record<string, unknown>;
};

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

    // ── Messages ────────────────────────────────────────────────────────────────
    const [messages, setMessages] = useState<Msg[]>([]);
    const [loading, setLoading] = useState(true);

    const upsertMessage = useCallback((msg: Msg) => {
        setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            map.set(msg.id, msg);
            return [...map.values()].sort(
                (a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
        });
    }, []);

    const patchMessage = useCallback((id: string, patch: Partial<Msg>) => {
        setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
        );
        setThreadReplies((prev) =>
            prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
        );
        setThreadRoot((r) => (r && r.id === id ? { ...r, ...patch } : r));
    }, []);

    const removeMessage = useCallback((id: string) => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setThreadReplies((prev) => prev.filter((m) => m.id !== id));
        setThreadRoot((r) => {
            if (r?.id === id) {
                setThreadOpen(false);
                return null;
            }
            return r;
        });
    }, []);

    // ── Conversation / inbox ────────────────────────────────────────────────────
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [activeConvPeer, setActiveConvPeer] = useState<ActiveConvPeer | null>(null);

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

    // ── Sidebar ─────────────────────────────────────────────────────────────────
    const [sidebarMembers, setSidebarMembers] = useState<SidebarMember[]>([]);
    const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("all");
    const [forceShowList, setForceShowList] = useState(false);

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

    // Clear unread on open
    useEffect(() => {
        if (!roomId && !activeConvId) return;
        const key = `workspace-unread:${activeConvId ?? roomId}`;
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            window.dispatchEvent(new Event("storage"));
        }
    }, [roomId, activeConvId]);

    // Fetch sidebar members + inbox
    useEffect(() => {
        const controller = new AbortController();
        async function fetchSidebar() {
            try {
                const [mr, cr] = await Promise.all([
                    fetch(`/api/communities/${slug}/members`, { signal: controller.signal }),
                    fetch(`/api/communities/${slug}/inbox`, { signal: controller.signal }),
                ]);
                if (mr.ok) setSidebarMembers((await mr.json()).members ?? []);
                if (cr.ok) setInboxConversations((await cr.json()).conversations ?? []);
            } catch (e: unknown) {
                if (e instanceof Error && e.name !== "AbortError") console.error(e);
            }
        }
        fetchSidebar();
        const sub = supabase
            .channel("inbox_updates")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "community_inbox_conversations" },
                fetchSidebar
            )
            .subscribe();
        return () => {
            controller.abort();
            supabase.removeChannel(sub);
        };
    }, [slug, supabase]);

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

    // ── Load messages ───────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        const controller = new AbortController();
        try {
            if (activeConvId) {
                const res = await fetch(
                    `/api/communities/${slug}/inbox/${activeConvId}/messages`,
                    { signal: controller.signal }
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setMessages(data.messages ?? []);
            } else if (roomId) {
                const res = await fetch(`/api/messages/${roomId}?limit=100`, {
                    signal: controller.signal,
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setMessages(data.messages ?? []);
            }
        } catch (e: unknown) {
            if (e instanceof Error && e.name !== "AbortError") setMessages([]);
        } finally {
            setLoading(false);
        }
        return () => controller.abort();
    }, [roomId, activeConvId, slug]);

    useEffect(() => { load(); }, [load]);

    // ── Realtime subscriptions ──────────────────────────────────────────────────
    const { setIncomingCall } = useCall();
    const isChatting = !forceShowList && (!!roomId || !!activeConvId);

    useEffect(() => {
        if (!isChatting) return;

        async function enrich(id: string): Promise<Profile | null> {
            const { data } = await supabase
                .from("profiles")
                .select("full_name, avatar_url, username")
                .eq("id", id)
                .maybeSingle();
            return data as Profile | null;
        }

        if (activeConvId) {
            const ch = supabase
                .channel(`inbox_messages:${activeConvId}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "community_inbox_messages",
                        filter: `conversation_id=eq.${activeConvId}`,
                    },
                    async (raw: RealtimePayload) => {
                        const p = raw.new;
                        if (p.message_type === "call_start" && p.sender_id !== userId) {
                            setIncomingCall({
                                type: p.body === "video" ? "video" : "audio",
                                sender: p.profiles as Profile,
                                roomId: String(p.room_id ?? ""),
                                convId: String(p.conversation_id ?? ""),
                            } as IncomingCall);
                        } else if (p.message_type === "call_signal" && p.sender_id !== userId) {
                            // Signal handled externally via call context
                        } else {
                            const prof = await enrich(String(p.sender_id));
                            upsertMessage({
                                id: String(p.id),
                                body: String(p.body ?? ""),
                                sender_id: String(p.sender_id),
                                created_at: String(p.created_at),
                                message_type: String(p.message_type ?? "text"),
                                thread_id: null,
                                reactions: (p.reactions as Record<string, unknown>) ?? {},
                                attachments: (p.attachments as ChatAttachmentPayload[]) ?? [],
                                profiles: prof,
                            });
                        }
                    }
                )
                .subscribe();

            const gi = supabase
                .channel(`inbox_unread_${communityId}`)
                .on(
                    "postgres_changes",
                    { event: "INSERT", schema: "public", table: "community_inbox_messages" },
                    (p: RealtimePayload) => {
                        const r = p.new;
                        if (r.sender_id !== userId && r.conversation_id !== activeConvId) {
                            const k = `workspace-unread:${String(r.conversation_id)}`;
                            localStorage.setItem(
                                k,
                                String(parseInt(localStorage.getItem(k) ?? "0", 10) + 1)
                            );
                            window.dispatchEvent(new Event("storage"));
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(ch);
                supabase.removeChannel(gi);
            };
        } else if (roomId) {
            const ch = supabase
                .channel(`community_messages:${roomId}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "community_messages",
                        filter: `room_id=eq.${roomId}`,
                    },
                    async (raw: RealtimePayload) => {
                        const row = raw.new;
                        if (row.message_type === "call_start" && row.sender_id !== userId) {
                            setIncomingCall({
                                type: row.body === "video" ? "video" : "audio",
                                sender: await enrich(String(row.sender_id)),
                                roomId: String(row.room_id),
                            } as IncomingCall);
                            return;
                        }
                        const tid = (row.thread_id as string | null) ?? null;
                        if (tid) {
                            if (threadOpenRef.current && threadRootRef.current?.id === tid)
                                await loadThread(tid);
                            return;
                        }
                        const prof = await enrich(String(row.sender_id));
                        upsertMessage({
                            id: String(row.id),
                            body: String(row.body ?? ""),
                            sender_id: String(row.sender_id),
                            created_at: String(row.created_at),
                            message_type: String(row.message_type ?? "text"),
                            thread_id: null,
                            reactions: (row.reactions as Record<string, unknown>) ?? {},
                            attachments: (row.attachments as ChatAttachmentPayload[]) ?? [],
                            profiles: prof,
                            reply_count: (row.reply_count as number) ?? 0,
                            is_edited: (row.is_edited as boolean) ?? false,
                            edited_at: (row.edited_at as string) ?? null,
                            reply_to_id: (row.reply_to_id as string) ?? null,
                            reply_to_body: (row.reply_to_body as string) ?? null,
                            reply_to_sender: (row.reply_to_sender as string) ?? null,
                        });
                    }
                )
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "community_messages",
                        filter: `room_id=eq.${roomId}`,
                    },
                    (raw: RealtimePayload) => {
                        const row = raw.new;
                        if (row.is_deleted) {
                            removeMessage(String(row.id));
                            return;
                        }
                        patchMessage(String(row.id), {
                            body: String(row.body ?? ""),
                            reactions: (row.reactions as Record<string, unknown>) ?? {},
                            is_edited: (row.is_edited as boolean) ?? false,
                            edited_at: (row.edited_at as string) ?? null,
                            reply_count: (row.reply_count as number) ?? 0,
                        });
                    }
                )
                .subscribe();

            const gr = supabase
                .channel(`rooms_unread_${communityId}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "community_messages",
                        filter: `community_id=eq.${communityId}`,
                    },
                    (p: RealtimePayload) => {
                        const r = p.new;
                        if (r.sender_id !== userId && r.room_id !== roomId) {
                            const k = `workspace-unread:${String(r.room_id)}`;
                            localStorage.setItem(
                                k,
                                String(parseInt(localStorage.getItem(k) ?? "0", 10) + 1)
                            );
                            window.dispatchEvent(new Event("storage"));
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(ch);
                supabase.removeChannel(gr);
            };
        }
    }, [
        roomId,
        activeConvId,
        isChatting,
        userId,
        communityId,
        loadThread,
        patchMessage,
        removeMessage,
        upsertMessage,
        supabase,
        setIncomingCall,
    ]);

    // ── Input state ──────────────────────────────────────────────────────────────
    const [text, setText] = useState("");
    const [threadReplyText, setThreadReplyText] = useState("");
    const [pendingMain, setPendingMain] = useState<ChatAttachmentPayload[]>([]);
    const [pendingThread, setPendingThread] = useState<ChatAttachmentPayload[]>([]);
    const [replyingTo, setReplyingTo] = useState<Msg | null>(null);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);

    // ── File upload ──────────────────────────────────────────────────────────────
    const handleFiles = useCallback(
        async (files: FileList | null, target: "main" | "thread") => {
            if (!files?.length) return;
            setUploading(true);
            try {
                for (const file of Array.from(files)) {
                    if (file.size > MAX_FILE_BYTES) continue;
                    const up = await uploadCommunityChatFile(communityId, roomId, file);
                    if (target === "main")
                        setPendingMain((p) => (p.length >= MAX_ATTACH ? p : [...p, up]));
                    else
                        setPendingThread((p) => (p.length >= MAX_ATTACH ? p : [...p, up]));
                }
            } catch (e: unknown) {
                console.error(e);
            } finally {
                setUploading(false);
            }
        },
        [communityId, roomId]
    );

    // ── Send ─────────────────────────────────────────────────────────────────────
    const sendMessage = useCallback(
        async (threadId?: string | null) => {
            const isThread = !!threadId;
            const t = (isThread ? threadReplyText : text).trim();
            const queue = isThread ? pendingThread : pendingMain;
            if ((!t && queue.length === 0) || sending) return;
            setSending(true);
            try {
                const ep = activeConvId
                    ? `/api/communities/${slug}/inbox/${activeConvId}/messages`
                    : `/api/messages/${roomId}`;
                const res = await fetch(ep, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        body: t,
                        threadId: threadId ?? null,
                        attachments: queue,
                        message_type: deriveMessageType(queue, t),
                        reply_to_id: !isThread && replyingTo ? replyingTo.id : null,
                        reply_to_body: !isThread && replyingTo ? replyingTo.body?.slice(0, 200) : null,
                        reply_to_sender: !isThread && replyingTo
                            ? (replyingTo.profiles?.full_name ?? replyingTo.profiles?.username ?? "Member")
                            : null,
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
                    setText("");
                    setPendingMain([]);
                    setReplyingTo(null);
                    setAtBottom(true);
                    requestAnimationFrame(() =>
                        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
                    );
                }
            } catch (e: unknown) {
                console.error(e);
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
            upsertMessage,
        ]
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
            console.error("Voice recording not supported in this browser.");
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
            upsertMessage(data.message as Msg);
            setVoiceBlob(null);
            setVoiceMime("");
            setAtBottom(true);
            setTimeout(() => scrollToBottom(), 50);
        } catch (e: unknown) {
            console.error("Voice send failed:", e);
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
                if (!res.ok) throw new Error(data.error);
                patchMessage(messageId, { reactions: data.reactions });
            } catch (e: unknown) {
                console.error(e);
            }
        },
        [roomId, activeConvId, slug, patchMessage]
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
        try {
            const ep = activeConvId
                ? `/api/communities/${slug}/inbox/${activeConvId}/messages/${messageId}`
                : `/api/messages/${roomId}/${messageId}`;
            const res = await fetch(ep, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ delete: true }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            removeMessage(messageId);
        } catch (e: unknown) {
            console.error(e);
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
            if (!res.ok) throw new Error(data.error);
            patchMessage(editingMsg.id, data.message as Msg);
            setEditingMsg(null);
        } catch (e: unknown) {
            console.error(e);
        } finally {
            setEditSaving(false);
        }
    }, [editingMsg, editBody, roomId, activeConvId, slug, patchMessage]);

    // ── Search / filter ──────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [chatFilter, setChatFilter] = useState<ChatFilter>("all");
    const [emojiOpen, setEmojiOpen] = useState(false);

    // ── Derived ──────────────────────────────────────────────────────────────────
    const filteredMessages = useMemo(() => {
        let list = messages.filter(
            (m) => m.message_type !== "call_signal" && m.message_type !== "call_start"
        );
        if (chatFilter === "media")
            list = list.filter(
                (m) =>
                    parseAttachments(m.attachments).length > 0 ||
                    ["image", "file", "audio"].includes(m.message_type)
            );
        const q = searchQuery.trim().toLowerCase();
        if (!q) return list;
        return list.filter(
            (m) =>
                (m.body ?? "").toLowerCase().includes(q) ||
                (m.profiles?.full_name ?? "").toLowerCase().includes(q) ||
                (m.profiles?.username ?? "").toLowerCase().includes(q)
        );
    }, [messages, searchQuery, chatFilter]);

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
            router.push(`/c/${slug}/workspace?space=${spaceId}&room=${rId}`);
        },
        [router, slug]
    );

    return {
        userId,
        messages,
        filteredMessages,
        loading,
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
        chatFilter,
        setChatFilter,
        emojiOpen,
        setEmojiOpen,
    };
}