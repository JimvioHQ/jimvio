"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MessageCircle, Phone, Video, Info, Mic, Paperclip, Smile, Send,
  FileText, Search, Filter, Plus, Pin, Bell, Download, X, Monitor,
  Share2, MoreHorizontal, Heart, Flame, Bot, GraduationCap, Scissors,
  Users, Link2, Volume2, Image as ImageIcon, Loader2,
} from "lucide-react";
import { cn, deriveMessageType, pickMime } from "@/lib/utils";
import { isCallSignalingMessage } from "@/lib/community/message-signaling";
import { uploadCommunityChatFile, type ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { createClient } from "@/lib/supabase/client";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import type { ConversationTarget } from "@/lib/community/chat/conversation-messages";
import type { Msg } from "@/types";
import { HubAvatar, HubBadge, HubLinkButton, HubSectionTitle } from "./hub-ui";
import { ChatInputZone } from "@/components/community/chat/ChatInputZone";
import { MAX_ATTACH, MAX_FILE_BYTES } from "@/types/chat";
import { useAIStore } from "@/lib/store/use-ai-store";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

type ThreadKind = "direct" | "group" | "space";

type Thread = {
  id: string;
  kind: ThreadKind;
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

type MessageItem = {
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

type PeerInfo = {
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

const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Spaces" },
  { id: "spaces", label: "Spaces" },
] as const;

const QUICK_ACTIONS = [
  { label: "AI Assistant", icon: Bot, accent: true },
  { label: "Send Course", icon: GraduationCap },
  { label: "Share Clip", icon: Scissors },
  { label: "Invite to Space", icon: Users },
  { label: "Share Signal", icon: Share2 },
  { label: "More", icon: MoreHorizontal },
];

const MEDIA_TABS = ["Media", "Files", "Links", "Voice"] as const;

function formatShortTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return formatDistanceToNow(new Date(iso), { addSuffix: false });
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function HubMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [tabCounts, setTabCounts] = useState({ all: 0, unread: 0, groups: 0, spaces: 0 });
  const [loading, setLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null);
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingMain, setPendingMain] = useState<ChatAttachmentPayload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceMime, setVoiceMime] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [search, setSearch] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const [mediaTab, setMediaTab] = useState<(typeof MEDIA_TABS)[number]>("Media");
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [showPinned, setShowPinned] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { openAssistant } = useAIStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const dmTarget = useMemo((): ConversationTarget | null => {
    if (!activeThread || activeThread.kind !== "direct") return null;
    if (!activeThread.communitySlug) return null;
    return {
      kind: "inbox",
      slug: activeThread.communitySlug,
      conversationId: activeThread.id,
    };
  }, [activeThread]);

  const dmEngine = useConversationMessages({
    target: dmTarget,
    enabled: !!dmTarget,
    realtimeEnabled: !!dmTarget,
    userId: currentUserId,
  });

  const engineMessages = useMemo((): MessageItem[] => {
    if (!dmTarget) return [];
    return dmEngine.messages.map((m: Msg) => ({
      id: m.id,
      body: m.body,
      sender_id: m.sender_id,
      sender_name: m.profiles?.full_name || m.profiles?.username || "Member",
      sender_avatar: m.profiles?.avatar_url ?? null,
      created_at: m.created_at,
      message_type: m.message_type,
      attachments: Array.isArray(m.attachments)
        ? (m.attachments as MessageItem["attachments"])
        : [],
      reactions:
        m.reactions && typeof m.reactions === "object"
          ? (m.reactions as Record<string, number>)
          : {},
    }));
  }, [dmTarget, dmEngine.messages]);

  const visibleMessages = useMemo(() => {
    const source = dmTarget ? engineMessages : messages;
    return source.filter((m) => !isCallSignalingMessage(m.message_type, m.body));
  }, [dmTarget, engineMessages, messages]);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/c/messages");
      if (!res.ok) return;
      const data = (await res.json()) as { threads: Thread[]; tabCounts: typeof tabCounts };
      setThreads(data.threads ?? []);
      setTabCounts(data.tabCounts ?? { all: 0, unread: 0, groups: 0, spaces: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    void createClient().auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!activeThreadId || !activeThread) {
      setMessages([]);
      setPeer(null);
      setPinnedMessage(null);
      return;
    }

    if (activeThread.kind === "space" || activeThread.kind === "direct") {
      // Direct DMs are owned by useConversationMessages (shared engine).
      setMessages([]);
      if (activeThread.kind === "space") {
        setPeer(null);
        setPinnedMessage(null);
      }
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingMsgs(true);
      try {
        const peerQ = activeThread.peerId ? `&peerId=${activeThread.peerId}` : "";
        const res = await fetch(`/api/c/messages/${encodeURIComponent(activeThreadId)}?kind=${activeThread.kind}${peerQ}`);
        if (!res.ok) {
          toast.error("Failed to load conversation");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setMessages(data.messages ?? []);
        setPinnedMessage(data.pinnedMessage ?? null);
        setPeer(data.peer ?? null);
      } finally {
        if (!cancelled) setLoadingMsgs(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeThreadId, activeThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages]);

  useEffect(() => {
    return () => {
      voiceStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !activeThread) return;
    setUploading(true);
    try {
      const roomKey = activeThread.roomId ?? activeThread.id;
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`${file.name} is too large (max 15 MB)`);
          continue;
        }
        const up = await uploadCommunityChatFile(activeThread.communityId, roomKey, file);
        setPendingMain((p) => (p.length >= MAX_ATTACH ? p : [...p, up]));
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  async function startVoiceRecording() {
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
      voiceTimerRef.current = setInterval(() => setVoiceSeconds((s) => s + 1), 1000);
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
    } catch {
      toast.error("Microphone access is required for voice messages.");
    }
  }

  function stopVoiceRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") mr.stop();
    else {
      setVoiceRecording(false);
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
    }
  }

  async function sendVoiceBlob() {
    if (!voiceBlob || !activeThread || sending) return;
    setSending(true);
    try {
      const ext = voiceMime.includes("mp4") ? "m4a" : "webm";
      const file = new File([voiceBlob], `voice-${Date.now()}.${ext}`, {
        type: voiceBlob.type || voiceMime,
      });
      setUploading(true);
      const up = await uploadCommunityChatFile(
        activeThread.communityId,
        activeThread.roomId ?? activeThread.id,
        file
      );
      setUploading(false);
      await postMessage("", [up], "audio");
      setVoiceBlob(null);
      setVoiceMime("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send voice message");
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  async function postMessage(body: string, attachments: ChatAttachmentPayload[], messageType?: string) {
    if (!activeThreadId || !activeThread) return;
    if (!navigator.onLine) {
      toast.error("You're offline — reconnect to send.");
      return;
    }

    let res: Response;
    if (activeThread.kind === "direct" && activeThread.communitySlug) {
      res = await fetch(
        `/api/communities/${activeThread.communitySlug}/inbox/${activeThreadId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body,
            attachments,
            message_type: messageType ?? deriveMessageType(attachments, body),
          }),
        }
      );
    } else if (activeThread.kind === "group" && activeThread.roomId) {
      res = await fetch(`/api/messages/${activeThread.roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          attachments,
          message_type: messageType ?? deriveMessageType(attachments, body),
        }),
      });
    } else {
      res = await fetch(`/api/c/messages/${encodeURIComponent(activeThreadId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          attachments,
          message_type: messageType ?? deriveMessageType(attachments, body),
        }),
      });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to send message");
    }
    const data = await res.json();
    const msg = data.message ?? data.row;
    if (msg) {
      if (dmTarget) {
        dmEngine.upsertMessage(msg as Msg);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: msg.id,
            body: msg.body ?? "",
            sender_id: msg.sender_id,
            sender_name: msg.profiles?.full_name ?? msg.profiles?.username ?? "You",
            sender_avatar: msg.profiles?.avatar_url ?? null,
            created_at: msg.created_at ?? new Date().toISOString(),
            message_type: msg.message_type ?? "text",
            attachments: Array.isArray(msg.attachments) ? msg.attachments : attachments,
            reactions: {},
          },
        ]);
      }
      setDraft("");
      setPendingMain([]);
      void loadThreads();
    }
  }

  async function sendMessage() {
    const body = draft.trim();
    if ((!body && pendingMain.length === 0) || !activeThreadId || !activeThread) return;
    if (activeThread.kind === "space") return;

    setSending(true);
    try {
      await postMessage(body, pendingMain);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      if (activeTab === "unread" && t.unreadCount === 0) return false;
      if (activeTab === "groups" && t.kind !== "group") return false;
      if (activeTab === "spaces" && t.kind !== "space") return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
          !t.lastMessage.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [threads, activeTab, search]);

  const mediaItems = useMemo(() => {
    return messages.flatMap((m) =>
      (m.attachments ?? []).map((a, i) => ({ ...a, messageId: m.id, key: `${m.id}-${i}` }))
    );
  }, [messages]);

  const fileItems = useMemo(() => {
    return mediaItems.filter((a) => a.mime && !a.mime.startsWith("image/") && !a.mime.startsWith("video/"));
  }, [mediaItems]);

  const imageItems = useMemo(() => {
    return mediaItems.filter((a) => a.mime?.startsWith("image/") || a.mime?.startsWith("video/"));
  }, [mediaItems]);

  const tabCount = (id: (typeof TABS)[number]["id"]) => {
    if (id === "all") return tabCounts.all;
    if (id === "unread") return tabCounts.unread;
    if (id === "groups") return tabCounts.groups;
    return tabCounts.spaces;
  };

  return (
    <div className="flex h-full min-h-0 bg-[var(--color-bg,#f4f4f5)]">
      {/* ── Thread list ── */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-[15px] font-black">
              <MessageCircle className="h-4 w-4 text-[#fd5000]" />
              Messages
            </h1>
            <div className="flex gap-1">
              <button type="button" className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]" aria-label="New message">
                <Plus className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]" aria-label="Filter">
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary,#fafafa)] py-2 pl-9 pr-3 text-[12px] focus:border-[#fd5000]/40 focus:outline-none"
            />
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  activeTab === id
                    ? "bg-[#fd5000] text-white"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
                )}
              >
                {label} ({tabCount(id)})
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-[var(--color-surface-secondary)]" />
              ))}
            </div>
          ) : filteredThreads.length === 0 ? (
            <p className="p-6 text-center text-[12px] text-[var(--color-text-muted)]">No conversations yet</p>
          ) : (
            filteredThreads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setActiveThreadId(thread.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-secondary)]",
                  activeThreadId === thread.id && "bg-[#fd5000]/5"
                )}
              >
                <div className="relative">
                  {thread.kind === "group" ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
                      <Users className="h-4 w-4" />
                    </div>
                  ) : thread.kind === "space" ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-600">
                      <Monitor className="h-4 w-4" />
                    </div>
                  ) : (
                    <HubAvatar name={thread.name} src={thread.avatarUrl} size={40} live={thread.isOnline} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-bold">{thread.name}</span>
                    <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">
                      {formatShortTime(thread.lastMessageTime)}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                    {thread.lastMessage}
                  </p>
                  {thread.subtitle && (
                    <p className="truncate text-[10px] text-[var(--color-text-muted)]/80">{thread.subtitle}</p>
                  )}
                </div>
                {thread.unreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#fd5000] px-1.5 text-[10px] font-bold text-white">
                    {thread.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat window ── */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-surface)]">
        {activeThread ? (
          activeThread.kind === "space" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <Monitor className="h-12 w-12 text-zinc-300" />
              <p className="text-[15px] font-bold">{activeThread.name}</p>
              <p className="max-w-sm text-[12px] text-[var(--color-text-muted)]">
                Open this space in its community to view channels and discussions.
              </p>
              {activeThread.href && (
                <HubLinkButton href={activeThread.href}>Open space</HubLinkButton>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <HubAvatar
                    name={activeThread.name}
                    src={activeThread.avatarUrl}
                    size={40}
                    live={activeThread.isOnline}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[14px] font-black">{activeThread.name}</p>
                      <HubBadge variant="orange">Creator</HubBadge>
                    </div>
                    <p className={cn("text-[11px] font-semibold", activeThread.isOnline ? "text-emerald-600" : "text-[var(--color-text-muted)]")}>
                      {activeThread.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <IconBtn icon={Phone} label="Audio call" />
                  <IconBtn icon={Video} label="Video call" />
                  <IconBtn icon={Monitor} label="Screen share" />
                  <IconBtn icon={MoreHorizontal} label="More" />
                  {activeThread.kind === "group" && activeThread.href ? (
                    <HubLinkButton href={activeThread.href} className="ml-1 !px-3 !py-1.5 !text-[11px]">
                      <Mic className="mr-1 inline h-3.5 w-3.5" />Open Room
                    </HubLinkButton>
                  ) : (
                    <HubLinkButton href="/communities/live" className="ml-1 !px-3 !py-1.5 !text-[11px]">
                      <Mic className="mr-1 inline h-3.5 w-3.5" />Start Voice Room
                    </HubLinkButton>
                  )}
                </div>
              </div>

              {showPinned && pinnedMessage && (
                <div className="flex items-center justify-between gap-2 border-b border-[#fd5000]/20 bg-[#fd5000]/5 px-4 py-2">
                  <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#fd5000]">
                    <Pin className="h-3 w-3 shrink-0" />
                    <span className="truncate">Pinned: {pinnedMessage}</span>
                  </p>
                  <div className="flex shrink-0 gap-2 text-[10px] font-semibold">
                    <button type="button" className="text-[#fd5000]">View</button>
                    <button type="button" onClick={() => setShowPinned(false)} className="text-[var(--color-text-muted)]">Close</button>
                  </div>
                </div>
              )}

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingMsgs || (dmTarget && dmEngine.loading) ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                  </div>
                ) : visibleMessages.length === 0 ? (
                  <p className="py-10 text-center text-[12px] text-[var(--color-text-muted)]">
                    {activeThread.kind === "group" ? "No messages in this room yet." : "Say hello to start the conversation."}
                  </p>
                ) : (
                  visibleMessages.map((msg, idx) => {
                    const mine = currentUserId ? msg.sender_id === currentUserId : false;
                    const showAvatar = !mine && (idx === 0 || visibleMessages[idx - 1]?.sender_id !== msg.sender_id);
                    return (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        mine={mine}
                        peerName={activeThread.name}
                        peerAvatar={activeThread.avatarUrl}
                        showAvatar={showAvatar}
                      />
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {activeThread.kind === "direct" || activeThread.kind === "group" ? (
                <>
                  <ChatInputZone
                    text={draft}
                    setText={setDraft}
                    pendingMain={pendingMain}
                    setPendingMain={setPendingMain}
                    replyingTo={null}
                    onCancelReply={() => {}}
                    voiceBlob={voiceBlob}
                    voiceRecording={voiceRecording}
                    voiceSeconds={voiceSeconds}
                    sending={sending}
                    uploading={uploading}
                    onSend={() => void sendMessage()}
                    onStartVoice={startVoiceRecording}
                    onStopVoice={stopVoiceRecording}
                    onSendVoice={() => void sendVoiceBlob()}
                    onDiscardVoice={() => {
                      setVoiceBlob(null);
                      setVoiceMime("");
                    }}
                    onOpenEmojiPicker={() => {}}
                    onAttachImage={handleFiles}
                    onAttachFile={handleFiles}
                  />
                  {/* Quick actions row — matches mockup composer footer */}
                  <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-[var(--color-border)] px-4 py-2 scrollbar-hide">
                    {QUICK_ACTIONS.map(({ label, icon: Icon, accent }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={label === "AI Assistant" ? () => openAssistant() : undefined}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                          accent
                            ? "bg-[#fd5000] text-white hover:bg-[#e04800]"
                            : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="shrink-0 border-t border-[var(--color-border)] p-4 text-center">
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    Open this space in the community to participate.
                  </p>
                  {activeThread.href && (
                    <HubLinkButton href={activeThread.href} className="mt-2">Open space</HubLinkButton>
                  )}
                </div>
              )}
            </>
          )
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
            <MessageCircle className="h-12 w-12 opacity-25" />
            <p className="text-[14px] font-bold">Select a conversation</p>
            <p className="text-[12px]">Choose a chat from the list to start messaging</p>
          </div>
        )}
      </div>

      {/* ── Details panel ── */}
      {showDetails && activeThread && activeThread.kind !== "space" && (
        <aside className="hidden w-[300px] shrink-0 flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] xl:flex">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
            <h2 className="text-[13px] font-black">About this chat</h2>
            <button type="button" onClick={() => setShowDetails(false)} className="rounded-lg p-1 hover:bg-[var(--color-surface-secondary)]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 text-center">
            <HubAvatar name={activeThread.name} src={activeThread.avatarUrl} size={72} live={activeThread.isOnline} className="mx-auto" />
            <p className="mt-3 text-[15px] font-black">{activeThread.name}</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <HubBadge variant="orange">Creator</HubBadge>
              <span className={cn("text-[11px] font-semibold", activeThread.isOnline ? "text-emerald-600" : "text-[var(--color-text-muted)]")}>
                {activeThread.isOnline ? "Online" : "Offline"}
              </span>
            </div>
            {peer?.bio && (
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{peer.bio}</p>
            )}
          </div>

          {peer && (
            <div className="mx-4 grid grid-cols-3 gap-2 rounded-md bg-[var(--color-surface-secondary)] p-3 text-center">
              <div>
                <p className="text-[13px] font-black">Level {peer.level}</p>
                <p className="text-[9px] text-[var(--color-text-muted)]">Level</p>
              </div>
              <div>
                <p className="text-[13px] font-black">{peer.streakDays} 🔥</p>
                <p className="text-[9px] text-[var(--color-text-muted)]">Streak</p>
              </div>
              <div>
                <p className="text-[13px] font-black">Top</p>
                <p className="text-[9px] text-[var(--color-text-muted)]">Creator</p>
              </div>
            </div>
          )}

          <div className="mx-4 mt-4 grid grid-cols-5 gap-1">
            {[Phone, Video, Info, Bell, MoreHorizontal].map((Icon, i) => (
              <button key={i} type="button" className="flex flex-col items-center gap-1 rounded-md border border-[var(--color-border)] p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]">
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3 px-4">
            <ToggleRow label="Notifications" on={notificationsOn} onChange={setNotificationsOn} />
            <ToggleRow label="Mute chat" on={muted} onChange={setMuted} />
            {pinnedMessage && (
              <button type="button" className="flex w-full items-center justify-between text-[12px] font-semibold text-[#fd5000]">
                Pinned messages (1) <ChevronRight />
              </button>
            )}
          </div>

          {peer && peer.sharedCommunities.length > 0 && (
            <div className="mt-5 px-4">
              <HubSectionTitle title="Shared in this Chat" />
              {peer.sharedCommunities.slice(0, 4).map((c) => (
                <Link key={c.id} href={c.href} className="flex items-center justify-between border-t border-[var(--color-border)] py-2.5 first:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold">{c.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Community</p>
                  </div>
                  <Link2 className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                </Link>
              ))}
            </div>
          )}

          <div className="mt-5 px-4 pb-4">
            <HubSectionTitle title="Media gallery" />
            <div className="mb-3 flex gap-1 overflow-x-auto scrollbar-hide">
              {MEDIA_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMediaTab(tab)}
                  className={cn(
                    "shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold",
                    mediaTab === tab ? "bg-[#fd5000]/10 text-[#fd5000]" : "text-[var(--color-text-muted)]"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {mediaTab === "Media" && (
              imageItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {imageItems.slice(0, 6).map((item) => (
                    <div key={item.key} className="relative aspect-square overflow-hidden rounded-lg bg-[var(--color-surface-secondary)]">
                      {item.url ? (
                        <img src={item.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><ImageIcon className="h-5 w-5 text-zinc-300" /></div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-[11px] text-[var(--color-text-muted)]">No shared media yet</p>
              )
            )}

            {mediaTab === "Files" && (
              fileItems.length > 0 ? (
                fileItems.slice(0, 5).map((f) => (
                  <div key={f.key} className="mb-2 flex items-center gap-2 rounded-md border border-[var(--color-border)] p-2">
                    <FileText className="h-4 w-4 shrink-0 text-[#fd5000]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold">{f.name ?? "File"}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{formatFileSize(f.size)}</p>
                    </div>
                    {f.url && (
                      <a href={f.url} download className="text-[var(--color-text-muted)] hover:text-[#fd5000]">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                messages.filter((m) => m.message_type === "file").slice(0, 3).map((m) => (
                  <div key={m.id} className="mb-2 flex items-center gap-2 rounded-md border border-[var(--color-border)] p-2">
                    <FileText className="h-4 w-4 shrink-0 text-[#fd5000]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold">{m.body || "Attachment"}</p>
                    </div>
                    <Download className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  </div>
                ))
              )
            )}

            {(mediaTab === "Links" || mediaTab === "Voice") && (
              <p className="py-4 text-center text-[11px] text-[var(--color-text-muted)]">
                No {mediaTab.toLowerCase()} shared yet
              </p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function IconBtn({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button type="button" aria-label={label} className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]">
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>;
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{label}</span>
      <Switch checked={on} onCheckedChange={onChange} />
    </div>
  );
}

function MessageBubble({
  msg,
  mine,
  peerName,
  peerAvatar,
  showAvatar,
}: {
  msg: MessageItem;
  mine: boolean;
  peerName: string;
  peerAvatar: string | null;
  showAvatar: boolean;
}) {
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const reactionEntries = Object.entries(msg.reactions);

  return (
    <div className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && showAvatar ? (
        <HubAvatar name={peerName} src={peerAvatar} size={28} className="mt-1 shrink-0" />
      ) : !mine ? (
        <div className="w-7 shrink-0" />
      ) : null}

      <div className={cn("max-w-[72%]", mine ? "items-end" : "items-start")}>
        {msg.message_type === "audio" ? (
          <div className={cn("rounded-md px-3 py-2", mine ? "bg-emerald-100" : "bg-[var(--color-surface-secondary)]")}>
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-[#fd5000]" />
              <div className="flex h-6 flex-1 items-center gap-0.5">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="w-0.5 rounded-full bg-[#fd5000]/50" style={{ height: `${8 + (i % 4) * 4}px` }} />
                ))}
              </div>
              <span className="text-[10px] text-[var(--color-text-muted)]">0:24</span>
            </div>
          </div>
        ) : msg.message_type === "file" || (msg.attachments.length > 0 && msg.attachments[0]?.name) ? (
          <div className={cn("rounded-md border px-3 py-2", mine ? "border-emerald-200 bg-emerald-50" : "border-[var(--color-border)] bg-[var(--color-surface-secondary)]")}>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#fd5000]" />
              <div>
                <p className="text-[12px] font-bold">{msg.attachments[0]?.name ?? msg.body}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{formatFileSize(msg.attachments[0]?.size)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={cn(
            "rounded-md px-3 py-2 text-[13px] leading-relaxed",
            mine ? "bg-emerald-100 text-zinc-900" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
          )}>
            {msg.body}
          </div>
        )}

        <div className={cn("mt-1 flex items-center gap-2", mine ? "justify-end" : "justify-start")}>
          <span className="text-[10px] text-[var(--color-text-muted)]">{time}</span>
          {reactionEntries.length > 0 && (
            <div className="flex items-center gap-1">
              {reactionEntries.map(([emoji, count]) => (
                <span key={emoji} className="inline-flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] shadow-sm">
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}
          {!mine && reactionEntries.some(([e]) => e === "❤️") && (
            <Heart className="h-3 w-3 fill-red-400 text-red-400" />
          )}
          {reactionEntries.some(([e]) => e === "🔥") && (
            <Flame className="h-3 w-3 text-orange-400" />
          )}
        </div>
      </div>
    </div>
  );
}
