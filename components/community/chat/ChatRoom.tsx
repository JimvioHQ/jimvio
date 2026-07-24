"use client";

import { Button } from "@/components/ui/button";
import { DialogHeader } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useChatRoom } from "@/hooks/useChatRoom";
import { cn } from "@/lib/utils";
import type { MessageSearchScope } from "@/lib/community/chat/message-experience";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import {
  searchKnowledge,
  useCollaborationStore,
  type AnswerPick,
} from "@/lib/community/knowledge";
import { ConvertToKnowledgeDialog } from "@/components/community/knowledge/ConvertToKnowledgeDialog";
import { ConvertToTaskDialog } from "@/components/community/os/ConvertToTaskDialog";
import { AttachCommerceDialog } from "@/components/community/commerce/AttachCommerceDialog";
import {
  createBookingDraft,
  filterMessagesByCommerceKind,
  useCreatorCommerceStore,
} from "@/lib/community/commerce";
import { Msg } from "@/types";
import { Dialog, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { Loader2, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCall } from "../call-context";
import { CallOverlay } from "./CallOverlay";
import { ChatEmojiPickerDialog } from "./chat-emoji-picker-dialog";
import { ChatHeader } from "./ChatHeader";
import { ChatInputZone } from "./ChatInputZone";
import { ChatSidebar } from "./ChatSidebar";
import { ChatSkeleton } from "./ChatSkeleton";
import { ConfirmDialog } from "./ConfirmDialog";
import { IncomingCallModal } from "./IncomingCallModal";
import { MessageRow } from "./MessageRow";
import { ThreadPanel } from "./ThreadPanel";
import {
  MessageAiPanel,
  MessageSearchBar,
  VirtualMessageList,
} from "./message-engine";

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  communityId: string;
  slug: string;
  hideHeader?: boolean;
}

export function ChatRoom({
  roomId,
  roomName,
  communityId,
  slug,
  hideHeader,
}: ChatRoomProps) {
  const hook = useChatRoom({ roomId, roomName, communityId, slug });
  const syncRoomIndex = useRoomMessageIndex((s) => s.sync);
  const openThreadRequest = useRoomMessageIndex((s) => s.openThreadRequest);
  const convertThreadRequest = useRoomMessageIndex((s) => s.convertThreadRequest);
  const searchRequestAt = useRoomMessageIndex((s) => s.searchRequestAt);
  const clearOpenThreadRequest = useRoomMessageIndex(
    (s) => s.clearOpenThreadRequest
  );
  const clearConvertThreadRequest = useRoomMessageIndex(
    (s) => s.clearConvertThreadRequest
  );
  const clearSearchRequest = useRoomMessageIndex((s) => s.clearSearchRequest);
  const markAnswer = useCollaborationStore((s) => s.markAnswer);
  const getAnswer = useCollaborationStore((s) => s.getAnswer);
  const answers = useCollaborationStore((s) => s.answers);
  const knowledgeCards = useCollaborationStore((s) => s.cards);
  const {
    callType,
    setCallType,
    incomingCall,
    setIncomingCall,
    localStream,
    remoteStream,
    pcRef,
    iceQueueRef,
  } = useCall();

  const [aiMsg, setAiMsg] = useState<Msg | null>(null);
  const [searchScope, setSearchScope] = useState<MessageSearchScope>("messages");
  const [convertMsg, setConvertMsg] = useState<Msg | null>(null);
  const [convertMode, setConvertMode] = useState<"message" | "thread" | "discussion">(
    "message"
  );
  const [taskMsg, setTaskMsg] = useState<Msg | null>(null);
  const [commerceOpen, setCommerceOpen] = useState(false);
  const addBooking = useCreatorCommerceStore((s) => s.addBooking);
  const addDonation = useCreatorCommerceStore((s) => s.addDonation);

  // Sync live messages into shared index for Files / Media / Pinned / Knowledge
  useEffect(() => {
    if (!roomId || hook.activeConvId) return;
    syncRoomIndex(roomId, hook.messages);
  }, [roomId, hook.messages, hook.activeConvId, syncRoomIndex]);

  // Threads panel → open thread in ChatRoom
  useEffect(() => {
    if (!openThreadRequest) return;
    const msg = hook.messages.find((m) => m.id === openThreadRequest);
    if (msg) void hook.openThread(msg);
    clearOpenThreadRequest();
  }, [openThreadRequest, hook, clearOpenThreadRequest]);

  // Threads panel → convert thread to knowledge
  useEffect(() => {
    if (!convertThreadRequest) return;
    const msg = hook.messages.find((m) => m.id === convertThreadRequest);
    if (msg) {
      setConvertMode("thread");
      setConvertMsg(msg);
      if (!hook.threadOpen || hook.threadRoot?.id !== msg.id) {
        void hook.openThread(msg);
      }
    }
    clearConvertThreadRequest();
  }, [convertThreadRequest, hook, clearConvertThreadRequest]);

  // Channel header search → open MessageSearchBar
  useEffect(() => {
    if (!searchRequestAt) return;
    hook.setSearchOpen(true);
    clearSearchRequest();
  }, [searchRequestAt, hook, clearSearchRequest]);

  const roleByUser = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of hook.sidebarMembers) {
      if (m.role) map[m.user_id] = m.role;
    }
    return map;
  }, [hook.sidebarMembers]);

  // Keyboard: ⌘/Ctrl+F search, Escape closes overlays
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "f") {
        e.preventDefault();
        hook.setSearchOpen(true);
      }
      if (e.key === "Escape") {
        if (aiMsg) setAiMsg(null);
        else if (hook.threadOpen) hook.setThreadOpen(false);
        else if (hook.searchOpen) {
          hook.setSearchOpen(false);
          hook.setSearchQuery("");
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aiMsg, hook]);

  const onScopeChange = useCallback(
    (scope: MessageSearchScope) => {
      setSearchScope(scope);
      if (scope === "media") hook.setChatFilter("media");
      else if (scope === "files") hook.setChatFilter("files");
      else if (scope === "pinned") hook.setChatFilter("pinned");
      else if (scope === "threads") hook.setChatFilter("threads");
      else hook.setChatFilter("all");
    },
    [hook]
  );

  const scopedMessages = useMemo(() => {
    if (searchScope === "knowledge") {
      const q = hook.searchQuery.trim();
      const matched = searchKnowledge(
        knowledgeCards.filter((c) => c.roomId === roomId),
        q
      );
      const ids = new Set(
        matched.map((c) => c.sourceMessageId).filter(Boolean) as string[]
      );
      if (!q) return hook.filteredMessages;
      return hook.filteredMessages.filter((m) => ids.has(m.id));
    }
    if (searchScope === "members") {
      const q = hook.searchQuery.trim().toLowerCase();
      if (!q) return hook.filteredMessages;
      const memberIds = new Set(
        hook.sidebarMembers
          .filter((m) => {
            const name = (
              m.profile?.full_name ||
              m.profile?.username ||
              ""
            ).toLowerCase();
            return name.includes(q);
          })
          .map((m) => m.user_id)
      );
      return hook.filteredMessages.filter((m) => memberIds.has(m.sender_id));
    }
    // Commerce-aware scopes
    if (searchScope === "products") {
      return filterMessagesByCommerceKind(
        hook.filteredMessages,
        ["product", "marketplace_item", "digital_download", "coupon", "event_ticket"],
        hook.searchQuery
      );
    }
    if (searchScope === "courses") {
      return filterMessagesByCommerceKind(
        hook.filteredMessages,
        ["course"],
        hook.searchQuery
      );
    }
    if (searchScope === "services") {
      return filterMessagesByCommerceKind(
        hook.filteredMessages,
        ["booking", "subscription"],
        hook.searchQuery
      );
    }
    if (searchScope === "affiliates") {
      return filterMessagesByCommerceKind(
        hook.filteredMessages,
        ["affiliate"],
        hook.searchQuery
      );
    }
    // groups / channels / events / creators / communities — body text
    if (
      searchScope === "groups" ||
      searchScope === "channels" ||
      searchScope === "events" ||
      searchScope === "creators" ||
      searchScope === "communities"
    ) {
      const q = hook.searchQuery.trim().toLowerCase();
      if (!q) return hook.filteredMessages;
      return hook.filteredMessages.filter((m) =>
        (m.body ?? "").toLowerCase().includes(q)
      );
    }
    return hook.filteredMessages;
  }, [
    searchScope,
    hook.filteredMessages,
    hook.searchQuery,
    hook.sidebarMembers,
    knowledgeCards,
    roomId,
  ]);

  // Force re-render badges when answers change
  void answers;

  const quoteMessage = useCallback(
    (msg: Msg) => {
      const quote = (msg.body || "")
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
      hook.setReplyingTo(msg);
      hook.setText(quote ? `${quote}\n\n` : "");
    },
    [hook]
  );

  // ── WebRTC ──────────────────────────────────────────────────────────────────
  async function sendCallSignal(
    type: "audio" | "video" | "call_signal",
    body?: unknown
  ) {
    const ep = hook.activeConvId
      ? `/api/communities/${slug}/inbox/${hook.activeConvId}/messages`
      : `/api/messages/${roomId}`;
    await fetch(ep, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: typeof body === "object" ? JSON.stringify(body) : body || type,
        message_type:
          type === "call_signal" ? "call_signal" : "call_start",
      }),
    });
  }

  async function initWebRTC(type: "audio" | "video", isInitiator: boolean) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video",
    });
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.ontrack = (ev) => {
      void ev.streams[0];
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate) sendCallSignal("call_signal", { ice: ev.candidate });
    };
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendCallSignal("call_signal", { sdp: offer });
    }
  }

  async function startNativeCall(type: "audio" | "video") {
    setCallType(type);
    iceQueueRef.current = [];
    await sendCallSignal(type);
    await initWebRTC(type, true);
  }

  function handleEndCall() {
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    setCallType(null);
    pcRef.current?.close();
    pcRef.current = null;
    iceQueueRef.current = [];
  }

  const renderMessage = useCallback(
    (m: Msg) => (
      <MessageRow
        m={m}
        isOwn={!!hook.userId && m.sender_id === hook.userId}
        userId={hook.userId}
        isDM={!!hook.activeConvId}
        isStaff={hook.isStaff}
        communityRole={roleByUser[m.sender_id] ?? null}
        onOpenThread={() => hook.openThread(m)}
        onToggleReaction={hook.toggleReaction}
        onDelete={hook.deleteMessage}
        onEdit={(msg) => {
          hook.setEditingMsg(msg);
          hook.setEditBody(msg.body);
        }}
        onReply={(msg) => hook.setReplyingTo(msg)}
        onQuote={quoteMessage}
        onTogglePin={hook.togglePin}
        onReport={hook.reportMessage}
        onOpenAi={setAiMsg}
        onConvertToKnowledge={(msg) => {
          setConvertMode(msg.thread_id ? "thread" : "message");
          setConvertMsg(msg);
        }}
        onConvertToTask={(msg) => setTaskMsg(msg)}
        onAttachCommerce={() => setCommerceOpen(true)}
        communityId={communityId}
        canManageCommerce={hook.isStaff}
        onMarkAnswer={(msg, pick: AnswerPick) => {
          markAnswer({
            messageId: msg.id,
            roomId,
            pick,
            markedBy: hook.userId,
          });
          toast.success(`Marked as ${pick} answer`);
        }}
        answerPick={getAnswer(m.id)?.pick ?? null}
      />
    ),
    [hook, roleByUser, quoteMessage, markAnswer, getAnswer, roomId]
  );

  return (
    <div className="flex h-full w-full overflow-hidden font-[family-name:var(--font-dm-sans),var(--font-sans),sans-serif]">
      <ConfirmDialog
        open={!!hook.confirmDelete}
        title="Delete message"
        description="This message will be permanently deleted for everyone."
        onConfirm={hook.confirmDeleteAction}
        onCancel={() => hook.setConfirmDelete(null)}
      />

      <Dialog
        open={!!hook.editingMsg}
        onOpenChange={(o) => !o && hook.setEditingMsg(null)}
      >
        <DialogContent className="z-[10051] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[var(--color-text-primary)]">
              Edit message
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={hook.editBody}
            onChange={(e) => hook.setEditBody(e.target.value)}
            rows={4}
            className="mt-2 rounded-sm"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-sm"
              onClick={() => hook.setEditingMsg(null)}
            >
              Cancel
            </Button>
            <Button
              className={cn(
                "rounded-sm font-semibold text-white",
                "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]"
              )}
              disabled={hook.editSaving || !hook.editBody.trim()}
              onClick={() => void hook.saveEdit()}
            >
              {hook.editSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ChatEmojiPickerDialog
        open={hook.emojiOpen}
        onOpenChange={hook.setEmojiOpen}
        onSelect={(n) =>
          hook.threadOpen && hook.threadRoot
            ? hook.setThreadReplyText((hook.threadReplyText || "") + n)
            : hook.setText((hook.text || "") + n)
        }
        onSelectGif={(gif) => void hook.sendGif(gif)}
        sendingGif={hook.sendingGif}
      />

      {callType && (
        <CallOverlay
          callType={callType}
          roomName={roomName}
          activeConvPeer={hook.activeConvPeer}
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={handleEndCall}
        />
      )}

      <ChatSidebar
        roomId={roomId}
        activeConvId={hook.activeConvId}
        isChatting={hook.isChatting}
        allChatRooms={hook.allChatRooms}
        sidebarMembers={hook.sidebarMembers}
        inboxConversations={hook.inboxConversations}
        unreadCounts={hook.unreadCounts}
        sidebarFilter={hook.sidebarFilter}
        userId={hook.userId}
        setSidebarFilter={hook.setSidebarFilter}
        onSelectRoom={hook.navigateToRoom}
        onSelectConv={(conv) => {
          hook.setActiveConvId(conv.id);
          hook.setActiveConvPeer({
            name: conv.peerName,
            avatar: conv.peerAvatar,
          });
          hook.setForceShowList(false);
        }}
        onOpenDm={hook.openDmWith}
      />

      <div
        className={cn(
          "flex h-full min-w-0 flex-1 flex-col overflow-hidden",
          "bg-[var(--color-bg)]",
          hook.isChatting ? "flex" : "hidden md:flex"
        )}
      >
        <ChatHeader
          roomName={roomName}
          activeConvId={hook.activeConvId}
          activeConvPeer={hook.activeConvPeer}
          isChatting={hook.isChatting}
          hideHeader={hideHeader}
          onlineCount={hook.onlineUserIds.length}
          searchOpen={hook.searchOpen}
          searchQuery={hook.searchQuery}
          chatFilter={hook.chatFilter}
          onToggleSearch={() => hook.setSearchOpen((s) => !s)}
          onSearchChange={hook.setSearchQuery}
          onCancelSearch={() => {
            hook.setSearchOpen(false);
            hook.setSearchQuery("");
            hook.setChatFilter("all");
            setSearchScope("messages");
          }}
          onSetChatFilter={hook.setChatFilter}
          onStartAudioCall={() => void startNativeCall("audio")}
          onStartVideoCall={() => void startNativeCall("video")}
          onBack={() => hook.setForceShowList(true)}
          hideLegacySearchBar
        />

        <MessageSearchBar
          open={hook.searchOpen}
          query={hook.searchQuery}
          scope={searchScope}
          searching={hook.serverSearching}
          onQueryChange={hook.setSearchQuery}
          onScopeChange={onScopeChange}
          onClose={() => {
            hook.setSearchOpen(false);
            hook.setSearchQuery("");
            hook.setChatFilter("all");
            setSearchScope("messages");
          }}
        />

        <div
          ref={hook.scrollRef}
          onScroll={hook.onScrollMain}
          role="log"
          aria-live="polite"
          aria-label="Messages"
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto",
            "bg-[var(--color-bg)] px-3 py-3 pb-5 sm:px-[5%]",
            "scrollbar-thin scrollbar-thumb-[var(--color-border-strong)]",
            hook.loading && "overflow-hidden"
          )}
        >
          {hook.loading ? (
            <ChatSkeleton />
          ) : hook.messages.length === 0 ? (
            <div
              className="flex flex-1 flex-col items-center justify-center px-4 py-14 text-center animate-in fade-in duration-200"
              role="status"
            >
              <p className="text-[15px] font-bold text-[var(--color-text-primary)]">
                Start the conversation
              </p>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                Share an idea, drop a file, or ask a question — this channel
                becomes knowledge as you collaborate.
              </p>
              <button
                type="button"
                onClick={() => {
                  document
                    .querySelector<HTMLTextAreaElement>(
                      '[aria-label="Message composer"]'
                    )
                    ?.focus();
                }}
                className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
              >
                Write a message
              </button>
            </div>
          ) : scopedMessages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
              <p className="text-[13px] text-[var(--color-text-muted)]">
                No messages match your search.
              </p>
              <button
                type="button"
                onClick={() => {
                  hook.setSearchOpen(false);
                  hook.setSearchQuery("");
                }}
                className="mt-3 text-[13px] font-semibold text-[var(--color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                Clear search
              </button>
            </div>
          ) : (
            <VirtualMessageList
              messages={scopedMessages}
              scrollRef={hook.scrollRef}
              renderMessage={renderMessage}
              footer={
                <>
                  {!hook.activeConvId && hook.typingUsers.length > 0 && (
                    <p
                      className="px-1 py-1.5 text-[12px] italic text-[var(--color-text-muted)] animate-in fade-in duration-150"
                      aria-live="polite"
                    >
                      {hook.typingUsers.map((t) => t.name).join(", ")}
                      {hook.typingUsers.length === 1 ? " is" : " are"} typing…
                    </p>
                  )}
                  {!hook.atBottom && !hook.loading && hook.messages.length > 0 && (
                    <div className="pointer-events-none sticky bottom-2 z-10 flex justify-center">
                      <button
                        type="button"
                        aria-label="Scroll to latest message"
                        onClick={() => hook.scrollToBottom()}
                        className={cn(
                          "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full shadow-sm",
                          "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)]",
                          "transition-all hover:scale-105"
                        )}
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  <div ref={hook.bottomRef} />
                </>
              }
            />
          )}
        </div>

        <ChatInputZone
          text={hook.text}
          setText={(v) => {
            hook.setText(v);
            hook.setTyping(v.trim().length > 0);
          }}
          pendingMain={hook.pendingMain}
          setPendingMain={hook.setPendingMain}
          replyingTo={hook.replyingTo}
          onCancelReply={() => hook.setReplyingTo(null)}
          voiceBlob={hook.voiceBlob}
          voiceRecording={hook.voiceRecording}
          voiceSeconds={hook.voiceSeconds}
          sending={hook.sending}
          uploading={hook.uploading}
          onSend={() => void hook.sendMessage()}
          onStartVoice={hook.startVoiceRecording}
          onStopVoice={hook.stopVoiceRecording}
          onSendVoice={hook.sendVoiceBlob}
          onDiscardVoice={() => {
            hook.setVoiceBlob(null);
            hook.setVoiceMime("");
          }}
          onOpenEmojiPicker={() => hook.setEmojiOpen(true)}
          onAttachImage={(files) => hook.handleFiles(files, "main")}
          onAttachFile={(files) => hook.handleFiles(files, "main")}
          onOpenAi={() => {
            const last = hook.filteredMessages[hook.filteredMessages.length - 1];
            if (last) setAiMsg(last);
          }}
          onAttachCommerce={
            hook.isStaff ? () => setCommerceOpen(true) : undefined
          }
        />
      </div>

      {hook.threadOpen && hook.threadRoot && (
        <ThreadPanel
          threadRoot={hook.threadRoot}
          threadReplies={hook.threadReplies}
          threadBottomRef={hook.threadBottomRef}
          userId={hook.userId}
          isStaff={hook.isStaff}
          threadReplyText={hook.threadReplyText}
          setThreadReplyText={hook.setThreadReplyText}
          pendingThread={hook.pendingThread}
          setPendingThread={hook.setPendingThread}
          sending={hook.sending}
          uploading={hook.uploading}
          onClose={() => hook.setThreadOpen(false)}
          onSendReply={() => void hook.sendMessage(hook.threadRoot!.id)}
          onToggleReaction={hook.toggleReaction}
          onDelete={hook.deleteMessage}
          onEdit={(msg) => {
            hook.setEditingMsg(msg);
            hook.setEditBody(msg.body);
          }}
          onReply={(msg) => hook.setReplyingTo(msg)}
          onOpenEmojiPicker={() => hook.setEmojiOpen(true)}
          onAttachFile={(files) => hook.handleFiles(files, "thread")}
          onOpenAi={setAiMsg}
          onTogglePin={hook.togglePin}
        />
      )}

      <MessageAiPanel
        open={!!aiMsg}
        message={aiMsg}
        communityId={communityId}
        onClose={() => setAiMsg(null)}
      />

      <ConvertToKnowledgeDialog
        open={!!convertMsg}
        message={convertMsg}
        threadReplies={
          convertMode === "thread" &&
          convertMsg &&
          hook.threadRoot?.id === convertMsg.id
            ? hook.threadReplies
            : convertMode === "thread" && convertMsg
              ? []
              : undefined
        }
        roomId={roomId}
        communityId={communityId}
        userId={hook.userId}
        userName={
          hook.sidebarMembers.find((m) => m.user_id === hook.userId)?.profile
            ?.full_name ?? null
        }
        mode={convertMode}
        onClose={() => setConvertMsg(null)}
      />

      <ConvertToTaskDialog
        open={!!taskMsg}
        message={taskMsg}
        roomId={roomId}
        communityId={communityId}
        userId={hook.userId}
        onClose={() => setTaskMsg(null)}
      />

      <AttachCommerceDialog
        open={commerceOpen}
        onClose={() => setCommerceOpen(false)}
        onAttach={(embed) => {
          void hook.sendCommerceMessage(embed);
          if (embed.kind === "booking") {
            addBooking(
              createBookingDraft({
                title: embed.title,
                bookingType: embed.bookingType ?? "call",
                communityId,
                roomId,
                durationMinutes: embed.durationMinutes ?? 30,
                price: embed.price,
                hostName: embed.sellerName,
                createdBy: hook.userId,
              })
            );
          }
          if (embed.kind === "donation" || embed.kind === "subscription") {
            addDonation({
              id: `don-${Date.now()}`,
              communityId,
              creatorId: embed.sellerId ?? hook.userId,
              mode: embed.donationMode ?? "support",
              amount: embed.price ?? 0,
              currency: embed.currency ?? "USD",
              note: embed.title,
              sourceMessageId: null,
              createdAt: new Date().toISOString(),
            });
          }
        }}
      />

      {incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onDecline={() => setIncomingCall(null)}
          onAccept={() => {
            setCallType(incomingCall.type);
            setIncomingCall(null);
            iceQueueRef.current = [];
            void initWebRTC(incomingCall.type, false);
          }}
        />
      )}
    </div>
  );
}
