import { Button } from "@/components/ui/button";
import { DialogHeader } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useChatRoom } from "@/hooks/useChatRoom";
import { cn } from "@/lib/utils";
import { Msg } from "@/types";
import { Dialog, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { format, isSameDay } from "date-fns";
import { Loader2, ChevronDown } from "lucide-react";
import { useMemo } from "react";
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

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  communityId: string;
  slug: string;
  hideHeader?: boolean;
}

export function ChatRoom({ roomId, roomName, communityId, slug, hideHeader }: ChatRoomProps) {
  const hook = useChatRoom({ roomId, roomName, communityId, slug });
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

  // ── WebRTC ─────────────────────────────────────────────────────────────────
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
        message_type: type === "call_signal" ? "call_signal" : "call_start",
      }),
    });
  }

  async function initWebRTC(type: "audio" | "video", isInitiator: boolean) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video",
    });
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.ontrack = (ev) => { void ev.streams[0]; };
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

  // ── Grouped messages ────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const rows: { day: Date; items: Msg[] }[] = [];
    for (const m of hook.filteredMessages) {
      const d = new Date(m.created_at);
      const last = rows[rows.length - 1];
      if (!last || !isSameDay(last.day, d)) rows.push({ day: d, items: [m] });
      else last.items.push(m);
    }
    return rows;
  }, [hook.filteredMessages]);

  return (
    // ❶ Outer wrapper: fill whatever height the parent gives, no min-h-screen
    <div className="flex h-full w-full overflow-hidden font-sans">
      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={!!hook.confirmDelete}
        title="Delete message"
        description="This message will be permanently deleted for everyone."
        onConfirm={hook.confirmDeleteAction}
        onCancel={() => hook.setConfirmDelete(null)}
      />

      {/* Edit dialog */}
      <Dialog open={!!hook.editingMsg} onOpenChange={(o) => !o && hook.setEditingMsg(null)}>
        <DialogContent className="z-[10051] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Edit message</DialogTitle>
          </DialogHeader>
          <Textarea
            value={hook.editBody}
            onChange={(e) => hook.setEditBody(e.target.value)}
            rows={4}
            className="mt-2 rounded-sm"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" className="rounded-sm" onClick={() => hook.setEditingMsg(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-sm font-semibold text-white bg-[#00a884] hover:bg-[#009070]"
              disabled={hook.editSaving || !hook.editBody.trim()}
              onClick={() => void hook.saveEdit()}
            >
              {hook.editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Emoji picker */}
      <ChatEmojiPickerDialog
        open={hook.emojiOpen}
        onOpenChange={hook.setEmojiOpen}
        onSelect={(n) =>
          hook.threadOpen && hook.threadRoot
            ? hook.setThreadReplyText((hook.threadReplyText || "") + n)
            : hook.setText((hook.text || "") + n)
        }
      />

      {/* Active call overlay */}
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

      {/* Sidebar */}
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
          hook.setActiveConvPeer({ name: conv.peerName, avatar: conv.peerAvatar });
          hook.setForceShowList(false);
        }}
        onOpenDm={hook.openDmWith}
      />

      {/* ❷ Main panel: fixed column, never grows beyond viewport */}
      <div
        className={cn(
          "flex flex-col min-w-0 flex-1 h-full overflow-hidden bg-[#efeae2]",
          hook.isChatting ? "flex" : "hidden md:flex"
        )}
      >
        {/* Header — shrinks to its natural height */}
        <ChatHeader
          roomName={roomName}
          activeConvId={hook.activeConvId}
          activeConvPeer={hook.activeConvPeer}
          isChatting={hook.isChatting}
          hideHeader={hideHeader}
          searchOpen={hook.searchOpen}
          searchQuery={hook.searchQuery}
          chatFilter={hook.chatFilter}
          onToggleSearch={() => hook.setSearchOpen((s) => !s)}
          onSearchChange={hook.setSearchQuery}
          onCancelSearch={() => { hook.setSearchOpen(false); hook.setSearchQuery(""); }}
          onSetChatFilter={hook.setChatFilter}
          onStartAudioCall={() => void startNativeCall("audio")}
          onStartVideoCall={() => void startNativeCall("video")}
          onBack={() => hook.setForceShowList(true)}
        />

        {/* ❸ Messages: flex-1 + min-h-0 so it fills remaining space and scrolls internally */}
        <div
          ref={hook.scrollRef}
          onScroll={hook.onScrollMain}
          role="log"
          aria-live="polite"
          aria-label="Messages"
          className={cn(
            "flex-1 min-h-0 overflow-y-auto",
            "bg-[#efeae2] px-[5%] py-3 pb-5",
            "flex flex-col",
            "scrollbar-thin scrollbar-thumb-[#c1c9cd]",
            hook.loading && "overflow-hidden"
          )}
        >
          {hook.loading ? (
            <ChatSkeleton />
          ) : hook.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center">
              <p className="text-sm font-semibold text-[#111b21]">Start the conversation</p>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#667781]">
                Type a message below.
              </p>
            </div>
          ) : hook.filteredMessages.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#667781]">
              No messages match your search.
            </p>
          ) : (
            grouped.map((g) => (
              <div key={g.day.toISOString()}>
                <div className="flex justify-center my-2 mb-4">
                  <span className="bg-white text-[#3b4a54] px-3 py-[5px] rounded-md text-[12px] font-medium shadow-sm">
                    {format(g.day, "MMM d, yyyy")}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {g.items.map((m) =>
                    m.message_type === "system" ? (
                      <p key={m.id} className="py-1 text-center text-xs text-[#667781]">
                        {m.body}
                      </p>
                    ) : (
                      <MessageRow
                        key={m.id}
                        m={m}
                        isOwn={!!hook.userId && m.sender_id === hook.userId}
                        userId={hook.userId}
                        isDM={!!hook.activeConvId}
                        onOpenThread={() => hook.openThread(m)}
                        onToggleReaction={hook.toggleReaction}
                        onDelete={hook.deleteMessage}
                        onEdit={(msg) => { hook.setEditingMsg(msg); hook.setEditBody(msg.body); }}
                        onReply={(msg) => hook.setReplyingTo(msg)}
                      />
                    )
                  )}
                </div>
              </div>
            ))
          )}

          {!hook.atBottom && !hook.loading && hook.messages.length > 0 && (
            <div className="pointer-events-none sticky bottom-2 z-10 flex justify-center">
              <button
                type="button"
                aria-label="Scroll to latest message"
                onClick={() => hook.scrollToBottom()}
                className="pointer-events-auto h-10 w-10 flex items-center justify-center rounded-full shadow-sm bg-[#f0f2f5] text-[#00a884] border border-[#d1d7db]"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          )}
          <div ref={hook.bottomRef} />
        </div>

        {/* Input zone — shrinks to its natural height, never scrolls */}
        <ChatInputZone
          text={hook.text}
          setText={hook.setText}
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
          onDiscardVoice={() => { hook.setVoiceBlob(null); hook.setVoiceMime(""); }}
          onOpenEmojiPicker={() => hook.setEmojiOpen(true)}
          onAttachImage={(files) => hook.handleFiles(files, "main")}
          onAttachFile={(files) => hook.handleFiles(files, "main")}
        />
      </div>

      {/* Thread panel */}
      {hook.threadOpen && hook.threadRoot && (
        <ThreadPanel
          threadRoot={hook.threadRoot}
          threadReplies={hook.threadReplies}
          threadBottomRef={hook.threadBottomRef}
          userId={hook.userId}
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
          onEdit={(msg) => { hook.setEditingMsg(msg); hook.setEditBody(msg.body); }}
          onReply={(msg) => hook.setReplyingTo(msg)}
          onOpenEmojiPicker={() => hook.setEmojiOpen(true)}
          onAttachFile={(files) => hook.handleFiles(files, "thread")}
        />
      )}

      {/* Incoming call modal */}
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