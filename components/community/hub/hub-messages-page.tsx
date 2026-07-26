"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, X } from "lucide-react";
import { toast } from "sonner";
import { cn, deriveMessageType, pickMime } from "@/lib/utils";
import { isCallSignalingMessage } from "@/lib/community/message-signaling";
import {
  uploadCommunityChatFile,
  type ChatAttachmentPayload,
} from "@/lib/community-chat-upload";
import { createClient } from "@/lib/supabase/client";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import type { ConversationTarget } from "@/lib/community/chat/conversation-messages";
import type { Msg } from "@/types";
import { MAX_ATTACH, MAX_FILE_BYTES } from "@/types/chat";
import { useAIStore } from "@/lib/store/use-ai-store";
import { ChatEmojiPickerDialog } from "@/components/community/chat/chat-emoji-picker-dialog";
import { HubLinkButton } from "./hub-ui";
import {
  ChatDetailsAside,
  ChatHeader,
  conversationKey,
  loadPinnedThreadIds,
  MediaLightbox,
  MessagesComposer,
  MessageTimeline,
  msgToHubMessage,
  NewMessageDialog,
  savePinnedThreadIds,
  ShareActionSheet,
  ThreadSidebar,
  useHubChatPresence,
  type HubChatMessage,
  type HubPeerInfo,
  type HubThread,
  type MediaTabId,
  type MessagesTabId,
  type QuickActionId,
  type SharePayload,
} from "./messages";

export function HubMessagesPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<HubThread[]>([]);
  const [tabCounts, setTabCounts] = useState({
    all: 0,
    unread: 0,
    groups: 0,
    spaces: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [peer, setPeer] = useState<HubPeerInfo | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [pendingMain, setPendingMain] = useState<ChatAttachmentPayload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceMime, setVoiceMime] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<MessagesTabId>("all");
  const [search, setSearch] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const [mobileDetails, setMobileDetails] = useState(false);
  const [mediaTab, setMediaTab] = useState<MediaTabId>("Media");
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [showPinnedBanner, setShowPinnedBanner] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("Member");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<HubChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [shareAction, setShareAction] = useState<Exclude<
    QuickActionId,
    "ai" | "more"
  > | null>(null);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{
    url: string;
    kind: "image" | "video";
  } | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadPinnedThreadIds()
  );
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [showChatSearch, setShowChatSearch] = useState(false);
  const { openAssistant } = useAIStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const conversationTarget = useMemo((): ConversationTarget | null => {
    if (!activeThread) return null;
    if (activeThread.kind === "direct" && activeThread.communitySlug) {
      return {
        kind: "inbox",
        slug: activeThread.communitySlug,
        conversationId: activeThread.id,
      };
    }
    if (activeThread.kind === "group" && activeThread.roomId) {
      return { kind: "room", roomId: activeThread.roomId };
    }
    return null;
  }, [activeThread]);

  const engine = useConversationMessages({
    target: conversationTarget,
    enabled: !!conversationTarget,
    realtimeEnabled: !!conversationTarget,
    userId: currentUserId,
  });

  const presenceKey = useMemo(() => {
    if (!activeThread) return null;
    return conversationKey(
      activeThread.kind,
      activeThread.id,
      activeThread.roomId
    );
  }, [activeThread]);

  const presence = useHubChatPresence({
    channelKey: presenceKey,
    userId: currentUserId,
    displayName,
    avatarUrl,
    enabled: !!presenceKey && activeThread?.kind !== "space",
  });

  const visibleMessages = useMemo((): HubChatMessage[] => {
    const mapped = engine.messages
      .filter((m) => !isCallSignalingMessage(m.message_type, m.body))
      .map((m) =>
        msgToHubMessage(
          m,
          // No peer read-receipt data in hub messages — show sent, not fake seen.
          m.sender_id === currentUserId ? "sent" : undefined
        )
      );
    if (!chatSearch.trim()) return mapped;
    const q = chatSearch.toLowerCase();
    return mapped.filter((m) => m.body.toLowerCase().includes(q));
  }, [engine.messages, currentUserId, chatSearch]);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/c/messages");
      if (!res.ok) return;
      const data = (await res.json()) as {
        threads: HubThread[];
        tabCounts: typeof tabCounts;
      };
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
    void createClient()
      .auth.getUser()
      .then(async ({ data: { user } }: { data: { user: { id: string } | null } }) => {
        if (!user) return;
        setCurrentUserId(user.id);
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        setDisplayName(profile?.full_name || profile?.username || "Member");
        setAvatarUrl(profile?.avatar_url ?? null);
      });
  }, []);

  useEffect(() => {
    if (!activeThread || activeThread.kind === "space") {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const peerQ = activeThread.peerId
          ? `&peerId=${activeThread.peerId}`
          : "";
        const res = await fetch(
          `/api/c/messages/${encodeURIComponent(activeThread.id)}?kind=${activeThread.kind}${peerQ}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.peer) {
          setPeer({
            ...data.peer,
            isCreator: data.peer.isCreator ?? true,
            topPercentLabel: data.peer.topPercentLabel ?? null,
          });
        } else {
          setPeer(null);
        }
        setPinnedMessage(data.pinnedMessage ?? null);
        setPinnedCount(data.pinnedMessage ? 1 : 0);
        setShowPinnedBanner(!!data.pinnedMessage);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeThread]);

  useEffect(() => {
    if (!activeThread || !visibleMessages.length) return;
    const key = conversationKey(
      activeThread.kind,
      activeThread.id,
      activeThread.roomId
    );
    const lastId = visibleMessages[visibleMessages.length - 1]?.id;
    void fetch("/api/c/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationKey: key,
        lastReadMessageId: lastId,
      }),
    }).then(() => {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id ? { ...t, unreadCount: 0 } : t
        )
      );
    });
  }, [activeThread?.id, visibleMessages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      voiceStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, []);

  const { setTypingState, typing, isPeerOnline } = presence;

  useEffect(() => {
    setTypingState(draft.trim().length > 0);
  }, [draft, setTypingState]);

  const filteredThreads = useMemo(() => {
    const pinned = new Set(pinnedIds);
    let list = threads.map((t) => ({
      ...t,
      isPinned: pinned.has(t.id),
      isTyping:
        !!activeThread &&
        t.id === activeThread.id &&
        typing.length > 0,
      isOnline:
        t.kind === "direct"
          ? isPeerOnline(t.peerId) || t.isOnline
          : t.isOnline,
    }));

    list = list.filter((t) => {
      if (activeTab === "unread" && t.unreadCount === 0) return false;
      if (activeTab === "groups" && t.kind !== "group") return false;
      if (activeTab === "spaces" && t.kind !== "space") return false;
      if (
        search &&
        !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.lastMessage.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime()
      );
    });
    return list;
  }, [
    threads,
    pinnedIds,
    activeTab,
    search,
    activeThread,
    typing.length,
    isPeerOnline,
  ]);

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
        const up = await uploadCommunityChatFile(
          activeThread.communityId,
          roomKey,
          file
        );
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

  async function postMessage(
    body: string,
    attachments: ChatAttachmentPayload[],
    messageType?: string,
    replyTo?: HubChatMessage | null
  ) {
    if (!activeThreadId || !activeThread) return;
    if (!navigator.onLine) {
      toast.error("You're offline — reconnect to send.");
      return;
    }

    const payload = {
      body,
      attachments,
      message_type: messageType ?? deriveMessageType(attachments, body),
      reply_to_id: replyTo?.id ?? null,
    };

    let res: Response;
    if (activeThread.kind === "direct" && activeThread.communitySlug) {
      res = await fetch(
        `/api/communities/${activeThread.communitySlug}/inbox/${activeThreadId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    } else if (activeThread.kind === "group" && activeThread.roomId) {
      res = await fetch(`/api/messages/${activeThread.roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      throw new Error("Cannot send in this conversation");
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        (data as { error?: string }).error ?? "Failed to send message"
      );
    }
    const data = await res.json();
    const msg = data.message ?? data.row;
    if (msg) {
      engine.upsertMessage(msg as Msg);
      setDraft("");
      setPendingMain([]);
      setReplyingTo(null);
      setTypingState(false);
      void loadThreads();
    }
  }

  async function sendMessage() {
    const body = draft.trim();
    if ((!body && pendingMain.length === 0) || !activeThread) return;
    if (activeThread.kind === "space") return;
    setSending(true);
    try {
      await postMessage(body, pendingMain, undefined, replyingTo);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
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
      toast.error(
        e instanceof Error ? e.message : "Failed to send voice message"
      );
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  async function handleReact(msg: HubChatMessage, emoji: string) {
    if (!activeThread) return;
    try {
      let res: Response;
      if (activeThread.kind === "direct" && activeThread.communitySlug) {
        res = await fetch(
          `/api/communities/${activeThread.communitySlug}/inbox/${activeThread.id}/messages/${msg.id}/react`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji }),
          }
        );
      } else if (activeThread.roomId) {
        res = await fetch(
          `/api/messages/${activeThread.roomId}/${msg.id}/react`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji }),
          }
        );
      } else {
        return;
      }
      if (!res.ok) throw new Error("Failed to react");
      const data = await res.json();
      engine.patchMessage(msg.id, { reactions: data.reactions });
    } catch {
      toast.error("Could not update reaction");
    }
  }

  async function handleShare(payload: SharePayload) {
    setShareAction(null);
    setSending(true);
    try {
      await postMessage(payload.body, [], "text");
      toast.success("Shared");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to share");
    } finally {
      setSending(false);
    }
  }

  function handleQuickAction(id: QuickActionId) {
    if (id === "ai") {
      openAssistant();
      return;
    }
    if (id === "more") {
      setShowDetails(true);
      setMobileDetails(true);
      return;
    }
    setShareAction(id);
  }

  function togglePin(id: string) {
    setPinnedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [id, ...prev];
      savePinnedThreadIds(next);
      toast.success(
        prev.includes(id) ? "Conversation unpinned" : "Conversation pinned"
      );
      return next;
    });
  }

  const online =
    (activeThread?.peerId
      ? isPeerOnline(activeThread.peerId)
      : false) ||
    peer?.isOnline ||
    activeThread?.isOnline ||
    false;

  const typingName = typing[0]?.name ?? null;

  const voiceRoomHref =
    activeThread?.kind === "group" && activeThread.href
      ? activeThread.href
      : "/communities/live";

  return (
    <div className="flex h-full min-h-0 bg-[var(--color-bg,#f4f4f5)]">
      <ThreadSidebar
        threads={filteredThreads}
        loading={loading}
        activeThreadId={activeThreadId}
        activeTab={activeTab}
        tabCounts={tabCounts}
        search={search}
        onSearchChange={setSearch}
        onTabChange={setActiveTab}
        onSelectThread={(id) => {
          const thread = threads.find((t) => t.id === id);
          // Space stubs without a chat room: navigate instead of empty chat.
          if (thread?.kind === "space" && !thread.roomId && thread.href) {
            router.push(thread.href);
            return;
          }
          setActiveThreadId(id);
          setMobileShowChat(true);
          setReplyingTo(null);
          setShowChatSearch(false);
          setChatSearch("");
          setPeer(null);
          setPinnedMessage(null);
          setPinnedCount(0);
        }}
        onNewMessage={() => setNewMessageOpen(true)}
        onTogglePin={togglePin}
        onOpenFilter={() =>
          toast.message("Filters", {
            description: "Use the All / Unread / Groups / Spaces tabs.",
          })
        }
        className={cn(mobileShowChat && "hidden lg:flex")}
      />

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-surface)]",
          !mobileShowChat && "hidden lg:flex"
        )}
      >
        {activeThread ? (
          activeThread.kind === "space" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-[15px] font-bold">{activeThread.name}</p>
              <p className="max-w-sm text-[12px] text-[var(--color-text-muted)]">
                Open this space in its community to view channels and
                discussions.
              </p>
              {activeThread.href && (
                <HubLinkButton href={activeThread.href}>Open space</HubLinkButton>
              )}
            </div>
          ) : (
            <>
              <ChatHeader
                thread={activeThread}
                peer={peer}
                online={online}
                onBack={() => setMobileShowChat(false)}
                onAudioCall={() =>
                  toast.message("Audio call", {
                    description: "Starting voice room…",
                  })
                }
                onVideoCall={() =>
                  toast.message("Video call", {
                    description: "Open Live to start a video session.",
                  })
                }
                onSearch={() => setShowChatSearch((v) => !v)}
                onMore={() => {
                  setShowDetails(true);
                  setMobileDetails(true);
                }}
                onToggleDetails={() => {
                  setShowDetails(true);
                  setMobileDetails(true);
                }}
                voiceRoomHref={voiceRoomHref}
              />

              {showChatSearch && (
                <div className="border-b border-[var(--color-border)] px-4 py-2">
                  <input
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    placeholder="Search in conversation…"
                    className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 text-[12px] outline-none"
                    autoFocus
                  />
                </div>
              )}

              {showPinnedBanner && pinnedMessage && (
                <div className="flex items-center justify-between gap-2 border-b border-[var(--color-accent,#fd5000)]/20 bg-[var(--color-accent,#fd5000)]/5 px-4 py-2">
                  <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[var(--color-accent,#fd5000)]">
                    <Pin className="h-3 w-3 shrink-0" />
                    <span className="truncate">Pinned: {pinnedMessage}</span>
                  </p>
                  <div className="flex shrink-0 items-center gap-2 text-[10px] font-semibold">
                    <button
                      type="button"
                      className="text-[var(--color-accent,#fd5000)]"
                      onClick={() => setShowDetails(true)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPinnedBanner(false)}
                      className="rounded p-0.5 text-[var(--color-text-muted)]"
                      aria-label="Dismiss pinned banner"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <MessageTimeline
                messages={visibleMessages}
                loading={engine.loading}
                currentUserId={currentUserId}
                peerName={activeThread.name}
                peerAvatar={activeThread.avatarUrl}
                typingName={typingName}
                hasMore={engine.hasMore}
                loadingOlder={engine.loadingOlder}
                onLoadOlder={() => void engine.loadOlder()}
                onReply={setReplyingTo}
                onReact={(msg, emoji) => void handleReact(msg, emoji)}
                onOpenThread={(msg) => {
                  // Hub messages has no ThreadPanel wiring; use reply-to instead.
                  setReplyingTo(msg);
                }}
                onOpenMedia={(url, kind) => setLightbox({ url, kind })}
              />

              <MessagesComposer
                text={draft}
                setText={setDraft}
                pending={pendingMain}
                setPending={setPendingMain}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                voiceBlob={voiceBlob}
                voiceRecording={voiceRecording}
                voiceSeconds={voiceSeconds}
                sending={sending}
                uploading={uploading}
                onSend={() => void sendMessage()}
                onStartVoice={() => void startVoiceRecording()}
                onStopVoice={stopVoiceRecording}
                onSendVoice={() => void sendVoiceBlob()}
                onDiscardVoice={() => {
                  setVoiceBlob(null);
                  setVoiceMime("");
                }}
                onOpenEmoji={() => {
                  setEmojiOpen(true);
                }}
                onOpenGif={() => {
                  setEmojiOpen(true);
                }}
                onAttachFiles={(files) => void handleFiles(files)}
                onMention={() => setDraft((d) => `${d}@`)}
                onQuickAction={handleQuickAction}
              />
            </>
          )
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-[var(--color-text-muted)]">
            <p className="text-[14px] font-bold text-[var(--color-text-primary)]">
              Select a conversation
            </p>
            <p className="text-[12px]">
              Choose a chat from the list to start messaging
            </p>
          </div>
        )}
      </div>

      {showDetails && activeThread && activeThread.kind !== "space" && (
        <ChatDetailsAside
          thread={activeThread}
          peer={peer}
          online={online}
          messages={visibleMessages}
          pinnedCount={pinnedCount}
          mediaTab={mediaTab}
          onMediaTabChange={setMediaTab}
          notificationsOn={notificationsOn}
          onNotificationsChange={setNotificationsOn}
          muted={muted}
          onMutedChange={setMuted}
          onClose={() => setShowDetails(false)}
          onAudio={() => toast.message("Audio call")}
          onVideo={() => toast.message("Video call")}
          onProfile={() => {
            if (activeThread.href) window.location.href = activeThread.href;
          }}
          onMute={() => setMuted((v) => !v)}
          onMore={() => toast.message("More options")}
          onOpenPinned={() =>
            pinnedMessage
              ? toast.message("Pinned", { description: pinnedMessage })
              : toast.message("No pinned messages")
          }
          onOpenMedia={(url, kind) => setLightbox({ url, kind })}
          className="hidden xl:flex"
        />
      )}

      {/* Mobile details drawer */}
      {mobileDetails && activeThread && activeThread.kind !== "space" && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close details overlay"
            onClick={() => setMobileDetails(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[min(100%,340px)] bg-[var(--color-surface)] shadow-xl">
            <ChatDetailsAside
              thread={activeThread}
              peer={peer}
              online={online}
              messages={visibleMessages}
              pinnedCount={pinnedCount}
              mediaTab={mediaTab}
              onMediaTabChange={setMediaTab}
              notificationsOn={notificationsOn}
              onNotificationsChange={setNotificationsOn}
              muted={muted}
              onMutedChange={setMuted}
              onClose={() => setMobileDetails(false)}
              onAudio={() => toast.message("Audio call")}
              onVideo={() => toast.message("Video call")}
              onProfile={() => {
                if (activeThread.href) window.location.href = activeThread.href;
              }}
              onMute={() => setMuted((v) => !v)}
              onMore={() => toast.message("More options")}
              onOpenPinned={() =>
                pinnedMessage
                  ? toast.message("Pinned", { description: pinnedMessage })
                  : toast.message("No pinned messages")
              }
              onOpenMedia={(url, kind) => setLightbox({ url, kind })}
            />
          </div>
        </div>
      )}

      <ChatEmojiPickerDialog
        open={emojiOpen}
        onOpenChange={setEmojiOpen}
        onSelect={(native) => setDraft((d) => d + native)}
        onSelectGif={async (gif) => {
          setEmojiOpen(false);
          setSending(true);
          try {
            await postMessage(gif.url || gif.title || "GIF", [], "gif");
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to send GIF");
          } finally {
            setSending(false);
          }
        }}
      />

      <ShareActionSheet
        open={!!shareAction}
        action={shareAction}
        onOpenChange={(v) => {
          if (!v) setShareAction(null);
        }}
        onShare={(payload) => void handleShare(payload)}
      />

      <NewMessageDialog
        open={newMessageOpen}
        onOpenChange={setNewMessageOpen}
        threads={threads}
        onSelect={(id) => {
          setActiveThreadId(id);
          setMobileShowChat(true);
        }}
      />

      {lightbox && (
        <MediaLightbox
          url={lightbox.url}
          kind={lightbox.kind}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
