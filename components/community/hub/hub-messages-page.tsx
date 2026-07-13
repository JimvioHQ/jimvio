"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MessageCircle, MessageSquare, Phone, Video, Info, Mic, Paperclip, Smile, Send,
  FileText, Search, Filter, Plus, Pin, Bell, Download, X, Monitor,
  Share2, MoreHorizontal, Heart, Flame, Bot, GraduationCap, Scissors,
  Users, Link2, Volume2, Image as ImageIcon, Loader2, CheckCheck,
  Play, Pause, ChevronRight, User, Layers, BarChart3, Clock, ShieldClose, Flag,
  Copy, Sticker,
} from "lucide-react";
import { cn, deriveMessageType, pickMime } from "@/lib/utils";
import type { Msg } from "@/types/chat";
import { isCallSignalingMessage } from "@/lib/community/message-signaling";
import { uploadCommunityChatFile, type ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { createClient } from "@/lib/supabase/client";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { HubAvatar, HubBadge, HubLinkButton, HubSectionTitle } from "./hub-ui";

const STICKERS = [
  { id: "thumbsup", src: "👍", label: "Thumbs Up" },
  { id: "fire", src: "🔥", label: "Fire" },
  { id: "heart", src: "❤️", label: "Heart" },
  { id: "rocket", src: "🚀", label: "Rocket" },
  { id: "clap", src: "👏", label: "Clap" },
  { id: "party", src: "🎉", label: "Party" },
  { id: "ok", src: "👌", label: "OK" },
  { id: "wave", src: "👋", label: "Wave" },
  { id: "cry", src: "😂", label: "Laugh" },
  { id: "star", src: "⭐", label: "Star" },
  { id: "muscle", src: "💪", label: "Muscle" },
  { id: "pray", src: "🙏", label: "Pray" },
  { id: "wink", src: "😉", label: "Wink" },
  { id: "cool", src: "😎", label: "Cool" },
  { id: "thinking", src: "🤔", label: "Thinking" },
  { id: "ghost", src: "👻", label: "Ghost" },
];
import { useCall } from "@/components/community/call-context";
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
  thread_id?: string | null;
  attachments: Array<{ url?: string; name?: string; mime?: string; size?: number }>;
  reactions: Record<string, number>;
  reply_to_data?: { id: string; body: string; sender_name: string } | null;
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
  { id: "groups", label: "Groups" },
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
  const { startCall } = useCall();
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
  const [showDetails, setShowDetails] = useState(false);
  const [mediaTab, setMediaTab] = useState<(typeof MEDIA_TABS)[number]>("Media");
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [showPinned, setShowPinned] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showMoreQuick, setShowMoreQuick] = useState(false);
  const [showMorePanel, setShowMorePanel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTab, setEmojiTab] = useState<"emoji" | "stickers">("emoji");
  const [replyingTo, setReplyingTo] = useState<Msg | null>(null);
  const { openAssistant } = useAIStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!showMoreQuick && !showMorePanel && !showEmojiPicker) return;
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key === "Escape") { setShowMoreQuick(false); setShowMorePanel(false); setShowEmojiPicker(false); return; }
      const target = e.target as HTMLElement;
      if (!target.closest('[data-more-dropdown="quick"]') && !target.closest('[data-more-btn="quick"]')) setShowMoreQuick(false);
      if (!target.closest('[data-more-dropdown="panel"]') && !target.closest('[data-more-btn="panel"]')) setShowMorePanel(false);
      if (!target.closest('[data-more-dropdown="emoji"]') && !target.closest('[data-composer]')) setShowEmojiPicker(false);
    }
    document.addEventListener("click", handle, true);
    document.addEventListener("keydown", handle, true);
    return () => { document.removeEventListener("click", handle, true); document.removeEventListener("keydown", handle, true); };
  }, [showMoreQuick, showMorePanel, showEmojiPicker]);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const visibleMessages = useMemo(
    () => messages.filter((m) => !isCallSignalingMessage(m.message_type, m.body)),
    [messages]
  );

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
    void createClient().auth.getUser().then(({ data: { user } }: { data: { user: { id?: string } | null } }) => {
      // make explicit that undefined becomes null to satisfy setCurrentUserId type
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!activeThreadId || !activeThread) {
      setMessages([]);
      setPeer(null);
      setPinnedMessage(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingMsgs(true);
      try {
        const peerQ = activeThread.peerId ? `&peerId=${activeThread.peerId}` : "";
        const res = await fetch(`/api/c/messages/${encodeURIComponent(activeThreadId)}?kind=${activeThread.kind}${peerQ}`);
        if (!res.ok) return;
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
    const payload: Record<string, unknown> = {
      body,
      attachments,
      message_type: messageType ?? deriveMessageType(attachments, body),
    };
    if (replyingTo) {
      payload.reply_to_id = replyingTo.id;
    }
    const endpoint = (activeThread.kind === "group" || activeThread.kind === "space") && activeThread.roomId
        ? `/api/messages/${activeThread.roomId}`
        : `/api/c/messages/${encodeURIComponent(activeThreadId)}`;
    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to send message");
    }
    const data = await res.json();
    const msg = data.message ?? data.row;
    if (msg) {
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
          thread_id: msg.thread_id ?? null,
          reply_to_data: replyingTo
            ? { id: replyingTo.id, body: replyingTo.body ?? "", sender_name: "" }
            : (msg.reply_to_data ?? null),
        },
      ]);
      setDraft("");
      setPendingMain([]);
      void loadThreads();
    }
  }

  async function sendMessage() {
    const body = draft.trim();
    if ((!body && pendingMain.length === 0) || !activeThreadId || !activeThread) return;

    setSending(true);
    try {
      await postMessage(body, pendingMain);
      setReplyingTo(null);
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
    <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-12">
      {/* ── Thread list ── */}
      <div className="flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] md:col-span-4 lg:col-span-3 min-h-0">
        <div className="shrink-0 p-2.5 space-y-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[var(--color-text)]">
              Direct Messages
            </h2>
            {tabCounts.unread > 0 && (
              <HubBadge variant="count">{tabCounts.unread} New</HubBadge>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages or spaces..."
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] pl-8 pr-3 py-1.5 font-body text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold transition",
                  activeTab === id
                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]/50 no-scrollbar min-h-0">
          {loading ? (
            <div className="divide-y divide-[var(--color-border)]/50">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 animate-pulse">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--color-surface-secondary)]" />
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-28 rounded bg-[var(--color-surface-secondary)]" />
                      <div className="h-2.5 w-10 rounded bg-[var(--color-surface-secondary)]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-44 rounded bg-[var(--color-surface-secondary)]" />
                      <div className="h-5 w-5 rounded-full bg-[var(--color-surface-secondary)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredThreads.length === 0 ? (
            <p className="p-6 text-center text-[12px] text-[var(--color-text-muted)]">No conversations yet</p>
          ) : (
            filteredThreads.map((thread) => {
              const isSelected = activeThreadId === thread.id;
              return (
                <div
                  key={thread.id}
                  onClick={() => {
                    setActiveThreadId(thread.id);
                    setShowPinned(true);
                  }}
                  className={cn(
                    "flex items-start gap-3 p-2.5 cursor-pointer transition relative",
                    isSelected
                      ? "bg-[var(--color-accent)]/10 font-medium"
                      : "hover:bg-[var(--color-surface-hover)]"
                  )}
                >
                  {isSelected && (
                    <span className="absolute left-0 inset-y-0 w-1 bg-[var(--color-accent)]" />
                  )}

                  <div className="relative shrink-0">
                    {thread.kind === "group" ? (
                      <>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] text-white shadow ring-1 ring-[var(--color-card)]" title="Group">
                          <Users className="h-2.5 w-2.5" />
                        </span>
                      </>
                    ) : thread.kind === "space" ? (
                      <>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-600">
                          <Monitor className="h-4 w-4" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] text-white shadow ring-1 ring-[var(--color-card)]" title="Space">
                          <Layers className="h-2.5 w-2.5" />
                        </span>
                      </>
                    ) : (
                      <>
                        <HubAvatar
                          name={thread.name}
                          src={thread.avatarUrl}
                          size={40}
                          live={thread.isOnline}
                          className={thread.isOnline ? "ring-2 ring-blue-500 rounded-full" : ""}
                        />
                        {thread.isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[var(--color-surface)]" />
                        )}
                      </>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={cn("font-display text-xs sm:text-sm truncate", isSelected ? "font-bold text-[var(--color-text)]" : "font-semibold text-[var(--color-text)]")}>
                        {thread.kind === "space" ? `#${thread.name}` : thread.name}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--color-text-secondary)] shrink-0">
                        {formatShortTime(thread.lastMessageTime)}
                      </span>
                    </div>
                    <p className="font-body text-xs text-[var(--color-text-secondary)] line-clamp-1">
                      {thread.lastMessage}
                    </p>
                  </div>

                  {thread.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 font-mono text-[10px] font-bold text-white shadow">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat window ── */}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-surface)] overflow-hidden", showDetails ? "md:col-span-8 lg:col-span-6" : "md:col-span-8 lg:col-span-9")}>
        {activeThread ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] p-2.5">
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
                      <span className={cn("font-mono text-[10px] font-semibold", activeThread.isOnline ? "text-emerald-500" : "text-[var(--color-text-muted)]")}>
                        {activeThread.isOnline ? "Online now" : "Offline"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      {activeThread.subtitle ?? "Direct Message"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative group/voice">
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeThread) return;
                        if (activeThread.kind === "direct") {
                          void startCall('audio', undefined, activeThread.id, activeThread.communitySlug);
                        } else if (activeThread.kind === "group" && activeThread.roomId) {
                          void startCall('audio', activeThread.roomId, undefined, activeThread.communitySlug);
                        }
                      }}
                      className="flex items-center justify-center h-9 w-9 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow transition"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--color-text-primary)] px-2 py-1 text-[11px] font-semibold text-[var(--color-bg)] opacity-0 group-hover/voice:opacity-100 transition-opacity pointer-events-none shadow-lg">
                      Start Voice Room
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeThread) return;
                      if (activeThread.kind === "direct") {
                        void startCall('audio', undefined, activeThread.id, activeThread.communitySlug);
                      } else if (activeThread.kind === "group" && activeThread.roomId) {
                        void startCall('audio', activeThread.roomId, undefined, activeThread.communitySlug);
                      }
                    }}
                    className="flex items-center justify-center h-8 w-8 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
                    title="Call"
                  >
                    <Phone className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeThread) return;
                      if (activeThread.kind === "direct") {
                        void startCall('video', undefined, activeThread.id, activeThread.communitySlug);
                      } else if (activeThread.kind === "group" && activeThread.roomId) {
                        void startCall('video', activeThread.roomId, undefined, activeThread.communitySlug);
                      }
                    }}
                    className="flex items-center justify-center h-8 w-8 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
                    title="Video Call"
                  >
                    <Video className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetails(!showDetails)}
                    className={cn(
                      "flex items-center justify-center h-8 w-8 transition",
                      showDetails
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    )}
                    title="Toggle About Panel"
                  >
                    <Info className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>

              {/* Pinned banner */}
              {showPinned && pinnedMessage && (
                <div className="flex items-center justify-between gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-200">
                  <p className="flex min-w-0 items-center gap-1.5">
                    <Pin className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 fill-amber-500" />
                    <span className="truncate font-medium">{pinnedMessage}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPinned(false)}
                    className="h-6 w-6 rounded hover:bg-amber-500/20 flex items-center justify-center shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-3">
                {loadingMsgs ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                  </div>
                ) : visibleMessages.length === 0 ? (
                  <p className="py-10 text-center text-[12px] text-[var(--color-text-muted)]">
                    {activeThread.kind === "group" ? "No messages in this room yet." : "Say hello to start the conversation."}
                  </p>
                ) : (
                  <>
                    <div className="text-center my-2">
                      <span className="rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                        {activeThread.kind === "group" ? "Room messages" : "Direct conversation"}
                      </span>
                    </div>
                    {visibleMessages.map((msg, idx) => {
                      const mine = currentUserId ? msg.sender_id === currentUserId : false;
                      const prevSender = idx > 0 ? visibleMessages[idx - 1]?.sender_id : null;
                      const showAvatar = !mine && (idx === 0 || prevSender !== msg.sender_id);
                      const isGroup = activeThread.kind === "group";
                      return (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          mine={mine}
                          peerName={activeThread.name}
                          peerAvatar={activeThread.avatarUrl}
                          showAvatar={showAvatar}
                          currentUserId={currentUserId}
                          isGroup={isGroup}
                          onReply={() => setReplyingTo({
                            id: msg.id,
                            body: msg.body ?? "",
                            sender_id: msg.sender_id,
                            created_at: msg.created_at,
                            message_type: msg.message_type,
                            thread_id: null,
                            reactions: msg.reactions,
                            reply_to_body: null,
                            reply_to_sender: null,
                            reply_to_id: null,
                          })}
                          onDelete={async () => {
                            if (!activeThread) return;
                            try {
                              const endpoint = activeThread.roomId
                                ? `/api/messages/${encodeURIComponent(activeThread.roomId)}`
                                : `/api/c/messages/${encodeURIComponent(activeThreadId ?? msg.id)}`;
                              const res = await fetch(endpoint, {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ messageId: msg.id }),
                              });
                              if (!res.ok) throw new Error("Failed to delete");
                              setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                            } catch {
                              toast.error("Could not delete message");
                            }
                          }}
                        />
                      );
                    })}
                  </>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Composer area */}
              {true ? (
                <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]" data-composer>
                  <ChatInputZone
                    text={draft}
                    setText={setDraft}
                    pendingMain={pendingMain}
                    setPendingMain={setPendingMain}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
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
                    onOpenEmojiPicker={() => setShowEmojiPicker((v) => !v)}
                    onAttachImage={handleFiles}
                    onAttachFile={handleFiles}
                  />
                  {/* Emoji & Stickers panel */}
                  {showEmojiPicker && (
                    <div className="relative">
                      <div className="absolute bottom-full right-0 z-20 w-[320px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg" data-more-dropdown="emoji">
                        <div className="flex items-center border-b border-[var(--color-border)]">
                          {(["emoji", "stickers"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setEmojiTab(t)}
                              className={cn(
                                "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition",
                                emojiTab === t
                                  ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]"
                                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                              )}
                            >
                              {t === "emoji" ? <Smile className="h-3.5 w-3.5" /> : <Sticker className="h-3.5 w-3.5" />}
                              {t === "emoji" ? "Emoji" : "Stickers"}
                            </button>
                          ))}
                        </div>
                        {emojiTab === "emoji" ? (
                          <div className="[&_.emoji-mart]:!border-0 [&_.emoji-mart]:!shadow-none [&_.emoji-mart-bar]:!hidden [&_.emoji-mart-search]:!mb-1 [&_.emoji-mart-search_input]:!rounded-lg [&_.emoji-mart-search_input]:!bg-[var(--color-surface)] [&_.emoji-mart-search_input]:!border [&_.emoji-mart-search_input]:!border-[var(--color-border)] [&_.emoji-mart-search_input]:!text-[13px] [&_.emoji-mart-search_input]:!text-[var(--color-text-primary)] [&_.emoji-mart-search_input]:!outline-none [&_.emoji-mart-scroll]:!h-[260px] [&_.emoji-mart-category-label]:!bg-[var(--color-card)] [&_.emoji-mart-category-label_span]:!bg-[var(--color-card)] [&_.emoji-mart-category-label_span]:!text-[11px] [&_.emoji-mart-category-label_span]:!font-semibold [&_.emoji-mart-category-label_span]:!text-[var(--color-text-secondary)] [&_.emoji-mart-emoji]:!cursor-pointer [&_.emoji-mart-emoji:hover]:!scale-110 [&_.emoji-mart-emoji]:!transition-transform">
                            <Picker
                              data={data}
                              theme="light"
                              perLine={8}
                              emojiSize={22}
                              onEmojiSelect={(emoji: { native: string }) => {
                                setDraft((prev) => prev + emoji.native);
                                setShowEmojiPicker(false);
                              }}
                              previewPosition="none"
                              skin="1"
                              set="native"
                              autoFocus={false}
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-2 p-3 max-h-[300px] overflow-y-auto">
                            {STICKERS.map((sticker) => (
                              <button
                                key={sticker.id}
                                type="button"
                                onClick={() => {
                                  setDraft((prev) => prev + sticker.src);
                                  setShowEmojiPicker(false);
                                }}
                                className="flex aspect-square items-center justify-center rounded-xl bg-[var(--color-surface)] text-2xl hover:bg-[var(--color-surface-secondary)] hover:scale-105 transition-all"
                                title={sticker.label}
                              >
                                {sticker.src}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Quick actions row */}
                  <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-[var(--color-border)] px-4 py-2 scrollbar-hide">
                    {QUICK_ACTIONS.filter(a => a.label !== "More").map(({ label, icon: Icon, accent }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={label === "AI Assistant" ? () => openAssistant() : undefined}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold transition",
                          accent
                            ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
                            : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text)]"
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    ))}
                    {/* More button with dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        data-more-btn="quick"
                        onClick={() => setShowMoreQuick((v) => !v)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold transition border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text)]"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                        More
                      </button>
                      {showMoreQuick && (
                        <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-lg" data-more-dropdown="quick">
                          {[
                            { label: "Share to Feed", icon: Share2 },
                            { label: "Create Poll", icon: BarChart3 },
                            { label: "Schedule Message", icon: Clock },
                            { label: "Add to Story", icon: Layers },
                          ].map(({ label, icon: Icon }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => { setShowMoreQuick(false); toast(label); }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text)] transition"
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="shrink-0 border-t border-[var(--color-border)] p-4 text-center">
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    Open this space in the community to participate.
                  </p>
                  {activeThread.href && (
                    <HubLinkButton href={activeThread.href!} className="mt-2">Open space</HubLinkButton>
                  )}
                </div>
              )}
            </>
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
        <aside className="hidden lg:flex lg:col-span-3 flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-5">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            About This Chat
          </div>

          {/* Profile card */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center space-y-2.5 shadow-sm">
            <HubAvatar name={activeThread.name} src={activeThread.avatarUrl} size={72} live={activeThread.isOnline} className="mx-auto" />
            <div>
              <p className="text-[15px] font-black">{activeThread.name}</p>
              <p className="mt-0.5 font-mono text-xs text-[var(--color-accent)] font-semibold">
                {peer?.username ? `@${peer.username}` : "Creator"}
              </p>
              <div className="flex items-center justify-center gap-1.5 font-mono text-xs text-[var(--color-text-secondary)] mt-1">
                {peer && (
                  <>
                    <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>{peer.streakDays} Day Streak</span>
                    <span>•</span>
                  </>
                )}
                <HubBadge variant="orange">Top Creator</HubBadge>
              </div>
            </div>

            {peer?.bio && (
              <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)] px-1">{peer.bio}</p>
            )}

            {/* Quick actions grid */}
            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[var(--color-border)]/60 font-mono text-[10.5px]">
              <button
                type="button"
                onClick={() => {
                  if (!activeThread) return;
                  if (activeThread.kind === "direct") {
                    void startCall('audio', undefined, activeThread.id, activeThread.communitySlug);
                  } else if (activeThread.kind === "group" && activeThread.roomId) {
                    void startCall('audio', activeThread.roomId, undefined, activeThread.communitySlug);
                  }
                }}
                className="flex flex-col items-center gap-1 rounded-xl bg-[var(--color-surface)] p-2 hover:bg-[var(--color-surface-secondary)] transition"
              >
                <Phone className="h-4 w-4 text-[var(--color-accent)]" />
                <span>Audio</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!activeThread) return;
                  if (activeThread.kind === "direct") {
                    void startCall('video', undefined, activeThread.id, activeThread.communitySlug);
                  } else if (activeThread.kind === "group" && activeThread.roomId) {
                    void startCall('video', activeThread.roomId, undefined, activeThread.communitySlug);
                  }
                }}
                className="flex flex-col items-center gap-1 rounded-xl bg-[var(--color-surface)] p-2 hover:bg-[var(--color-surface-secondary)] transition"
              >
                <Video className="h-4 w-4 text-blue-500" />
                <span>Video</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-xl bg-[var(--color-surface)] p-2 hover:bg-[var(--color-surface-secondary)] transition"
              >
                <User className="h-4 w-4 text-indigo-500" />
                <span>Profile</span>
              </button>
              <div className="relative">
                <button
                  type="button"
                  data-more-btn="panel"
                  onClick={() => setShowMorePanel((v) => !v)}
                  className="flex flex-col items-center gap-1 rounded-xl bg-[var(--color-surface)] p-2 hover:bg-[var(--color-surface-secondary)] transition"
                >
                  <MoreHorizontal className="h-4 w-4 text-slate-400" />
                  <span>More</span>
                </button>
                {showMorePanel && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-lg" data-more-dropdown="panel">
                    {[
                      { label: "Share Contact", icon: Share2 },
                      { label: "View Profile", icon: User },
                      { label: "Block User", icon: ShieldClose },
                      { label: "Report", icon: Flag },
                    ].map(({ label, icon: Icon }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => { setShowMorePanel(false); toast(label); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text)] transition"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Settings */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3 shadow-sm text-xs">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
              Chat Settings
            </div>
            <ToggleRow label="Notifications" icon={Bell} iconColor="text-emerald-500" on={notificationsOn} onChange={setNotificationsOn} />
            <ToggleRow label="Mute chat alerts" icon={Share2} iconColor="text-amber-500" on={muted} onChange={setMuted} />
            {pinnedMessage && (
              <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]/60 font-mono text-[11px] text-[var(--color-text-secondary)]">
                <span>Pinned messages count:</span>
                <span className="font-bold text-[var(--color-text)]">1 pinned</span>
              </div>
            )}
          </div>

          {/* Shared Communities */}
          {peer && peer.sharedCommunities.length > 0 && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2.5 shadow-sm">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Shared Communities
              </div>
              {peer.sharedCommunities.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  href={c.href}
                  className="flex items-center justify-between rounded-xl bg-[var(--color-surface)] p-2.5 hover:bg-[var(--color-surface-secondary)] transition"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--color-text)] truncate">{c.name}</div>
                    <div className="font-mono text-[10px] text-emerald-500">Community</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)] shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {/* Media / Files / Links / Voice */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Shared Media & Files
              </div>
              <button
                type="button"
                className="font-mono text-[10px] text-[var(--color-accent)] font-semibold hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-lg bg-[var(--color-surface)] p-1 font-mono text-[10px] text-center">
              {["Files", "Links", "Voice"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMediaTab(t as typeof mediaTab)}
                  className={cn(
                    "rounded-md py-1 font-bold transition",
                    mediaTab === t
                      ? "bg-[var(--color-card)] text-[var(--color-accent)] shadow-sm"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="space-y-2 font-mono text-xs">
              {mediaTab === "Files" && (
                fileItems.length > 0 ? (
                  fileItems.slice(0, 5).map((f) => (
                    <div key={f.key} className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] transition cursor-pointer">
                      <span className="truncate">{f.name ?? "File"}</span>
                      <span className="text-[10px] text-[var(--color-text-secondary)]">{formatFileSize(f.size)}</span>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-[11px] text-[var(--color-text-muted)]">No files shared yet</p>
                )
              )}
              {mediaTab === "Links" && (
                <p className="py-4 text-center text-[11px] text-[var(--color-text-muted)]">No links shared yet</p>
              )}
              {mediaTab === "Voice" && (
                <p className="py-4 text-center text-[11px] text-[var(--color-text-muted)]">No voice messages yet</p>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

function ChevronRightIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>;
}

function ToggleRow({ label, icon: Icon, iconColor, on, onChange }: { label: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-xs font-medium text-[var(--color-text)]">
        {Icon && <Icon className={cn("h-4 w-4", iconColor)} />}
        {label}
      </span>
      <Switch checked={on} onCheckedChange={onChange} />
    </div>
  );
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s<]+[^\s<.])/g;
  const phoneRegex = /(\+?\d[\d\s\-().]{6,}\d)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;

  const combined: { index: number; type: "url" | "phone"; match: string }[] = [];
  let m;
  while ((m = urlRegex.exec(text)) !== null) {
    combined.push({ index: m.index, type: "url", match: m[0] });
  }
  while ((m = phoneRegex.exec(text)) !== null) {
    combined.push({ index: m.index, type: "phone", match: m[0] });
  }
  combined.sort((a, b) => a.index - b.index);

  for (const item of combined) {
    if (item.index > lastIndex) {
      parts.push(text.slice(lastIndex, item.index));
    }
    const clean = item.match.replace(/[\s\-()]/g, "");
    if (item.type === "url") {
      parts.push(<a key={`u-${item.index}`} href={item.match} target="_blank" rel="noreferrer" className="underline underline-offset-2 decoration-1 hover:opacity-80">{item.match}</a>);
    } else {
      parts.push(
        <a
          key={`p-${item.index}`}
          href={`tel:${clean}`}
          className="underline underline-offset-2 decoration-dotted decoration-1 text-[var(--color-accent)] hover:opacity-80 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            navigator.clipboard.writeText(item.match).then(() => toast.success("Phone number copied")).catch(() => {});
          }}
        >
          {item.match}
        </a>
      );
    }
    lastIndex = item.index + item.match.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  if (parts.length === 0) return text;
  return parts;
}

function MessageBubble({
  msg,
  mine,
  peerName,
  peerAvatar,
  showAvatar,
  currentUserId,
  isGroup,
  onReply,
  onDelete,
}: {
  msg: MessageItem;
  mine: boolean;
  peerName: string;
  peerAvatar: string | null;
  showAvatar: boolean;
  currentUserId: string | null;
  isGroup?: boolean;
  onReply?: () => void;
  onDelete?: () => void;
}) {
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const reactionEntries = Object.entries(msg.reactions);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);

  const handleAudioToggle = () => {
    if (audioPlaying) {
      setAudioPlaying(false);
    } else {
      setAudioPlaying(true);
      setAudioProgress(0);
      const timer = setInterval(() => {
        setAudioProgress((p) => {
          if (p >= 100) {
            clearInterval(timer);
            setAudioPlaying(false);
            return 0;
          }
          return p + 10;
        });
      }, 500);
    }
  };

  return (
    <div className={cn("flex gap-2", mine ? "flex-row-reverse" : "flex-row")}>
      {/* Sender avatar (group only) */}
      {!mine && isGroup && showAvatar && (
        <div className="shrink-0 w-7 pt-3.5">
          {msg.sender_avatar ? (
            <img src={msg.sender_avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center text-[11px] font-semibold text-[var(--color-text-muted)]">
              {msg.sender_name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      )}
      {!mine && isGroup && !showAvatar && (
        <div className="w-7 shrink-0" />
      )}

      <div className={cn("flex flex-col gap-0.5 min-w-0 group/bubble", mine ? "items-end" : "items-start")}>
        {/* Sender name (group only) */}
        {!mine && isGroup && showAvatar && (
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] ml-1">
            {msg.sender_name}
          </span>
        )}

        <div className={cn(
          "font-mono text-[10px] text-[var(--color-text-secondary)]",
          isGroup ? "ml-1" : "flex items-center gap-2 px-1"
        )}>
          {!mine && !isGroup && (
            showAvatar ? (
              <HubAvatar name={peerName} src={peerAvatar} size={20} className="shrink-0" />
            ) : (
              <span className="w-5" />
            )
          )}
          {!mine && !isGroup && <span>{msg.sender_name}</span>}
          {mine && <span>{msg.sender_name}</span>}
          <span>•</span>
          <span>{time}</span>
        </div>

      <div className={cn(
          "rounded-2xl p-3 shadow-sm font-body text-sm leading-relaxed whitespace-pre-line break-words max-w-[92%] sm:max-w-[80%]",
        mine
          ? "bg-[var(--color-accent)] text-white rounded-br-xs"
          : "bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] rounded-bl-xs"
      )}>
        {/* Quoted reply */}
        {msg.reply_to_data && (
          <div className={cn(
            "mb-2 rounded-lg p-2.5 border-l-4 text-xs",
            mine
              ? "bg-white/10 border-white/30"
              : "bg-[var(--color-surface)] border-[var(--color-accent)]"
          )}>
            <span className="font-semibold text-[11px]">{msg.reply_to_data.sender_name}</span>
            <p className="line-clamp-1 text-[var(--color-text-secondary)]">{msg.reply_to_data.body}</p>
          </div>
        )}
        {/* Text body */}
        {msg.body && <p className={cn(msg.attachments.length > 0 || msg.message_type !== "text" ? "mb-2" : "")}>{linkify(msg.body)}</p>}

        {/* PDF attachment */}
        {msg.message_type === "file" && msg.attachments.length > 0 && (
          <div className={cn(
            "flex items-center justify-between gap-3 rounded-xl p-3 mt-2 border transition",
            mine
              ? "bg-black/20 border-white/20"
              : "bg-[var(--color-surface)] border-[var(--color-border)]"
          )}>
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="h-5 w-5 text-red-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-xs font-bold truncate">{msg.attachments[0]?.name ?? "Document"}</div>
                <div className="font-mono text-[10px] opacity-80">{formatFileSize(msg.attachments[0]?.size)}</div>
              </div>
            </div>
            {msg.attachments[0]?.url && (
              <a
                href={msg.attachments[0].url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                  mine ? "bg-white/20 hover:bg-white/30" : "bg-[var(--color-surface-secondary)] hover:bg-[var(--color-accent)] hover:text-white"
                )}
              >
                <Download className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        {/* Audio attachment */}
        {msg.message_type === "audio" && (
          <div className={cn(
            "flex items-center gap-3 rounded-xl p-3 mt-2 border",
            mine ? "bg-black/20 border-white/20" : "bg-[var(--color-surface)] border-[var(--color-border)]"
          )}>
            <button
              type="button"
              onClick={handleAudioToggle}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow transition",
                mine ? "bg-white text-[var(--color-accent)]" : "bg-[var(--color-accent)] text-white"
              )}
            >
              {audioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] opacity-90">
                <span>Audio Note</span>
                <span>{audioPlaying ? `${audioProgress}%` : "0:00"}</span>
              </div>
              <div className="flex items-center gap-1 h-5 overflow-hidden">
                {[6, 12, 18, 10, 15, 20, 14, 22, 16, 12, 18, 8, 14, 20, 16, 12, 8].map((h, i) => (
                  <div
                    key={i}
                    className={cn("w-1 rounded-full transition-all", mine ? "bg-white" : "bg-[var(--color-accent)]")}
                    style={{ height: `${h}px`, opacity: i / 17 <= audioProgress / 100 ? 1 : 0.4 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Image / video attachment */}
        {msg.attachments.length > 0 && msg.attachments[0]?.mime?.startsWith("image/") && (
          <div className="mt-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-black/5 cursor-pointer"
            onClick={() => setLightboxSrc(msg.attachments[0].url)}
          >
            <img
              src={msg.attachments[0].url}
              alt={msg.attachments[0]?.name ?? "Image"}
              className="w-full max-h-80 object-contain hover:opacity-95 transition"
            />
          </div>
        )}
        {msg.attachments.length > 0 && msg.attachments[0]?.mime?.startsWith("video/") && (
          <div className="mt-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-black/5">
            <video src={msg.attachments[0].url} controls className="w-full max-h-80" preload="metadata">
              <p className="p-4 text-[12px] text-[var(--color-text-muted)]">Your browser does not support video playback.</p>
            </video>
          </div>
        )}
        {lightboxSrc && (
          <ImageLightbox src={lightboxSrc} alt={msg.attachments[0]?.name ?? "Image"} onClose={() => setLightboxSrc(null)} />
        )}

        {/* Actions footer (Reply, Like, Copy, Delete) + Reactions & read receipt */}
        <div className="flex items-center gap-0.5 mt-1.5 pt-1.5 border-t text-[10.5px] font-mono opacity-0 group-hover/bubble:opacity-100 transition-opacity"
          style={{ borderColor: mine ? "rgba(255,255,255,0.2)" : "var(--color-border)" }}
        >
          {/* Reply */}
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] transition cursor-pointer"
            >
              <MessageSquare className="h-3 w-3" />
              <span>Reply</span>
            </button>
          )}
          {/* Like */}
          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 transition cursor-pointer",
              liked
                ? "text-red-500 bg-red-500/10"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)]"
            )}
          >
            <Heart className={cn("h-3 w-3", liked && "fill-current")} />
            <span>Like</span>
          </button>
          {/* Copy */}
          {msg.body && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(msg.body).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
              }}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] transition cursor-pointer"
            >
              {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          )}
          {/* Delete (owner only) */}
          {mine && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Delete</span>
            </button>
          )}
        </div>

        {(reactionEntries.length > 0 || mine) && (
          <div className={cn(
            "flex items-center justify-between pt-1.5 mt-1 border-t text-[10.5px] font-mono",
            mine ? "border-white/20" : "border-[var(--color-border)]/60"
          )}>
            <div className="flex items-center gap-1 flex-wrap">
              {reactionEntries.map(([emoji]) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 font-bold text-[var(--color-text-secondary)] hover:bg-black/20 dark:hover:bg-white/20 transition cursor-pointer text-[11px]"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {mine && (
              <span className="flex items-center gap-1 text-white/80 shrink-0">
                <CheckCheck className="h-3.5 w-3.5 text-emerald-300" />
                <span>Read {time}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
