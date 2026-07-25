// "use client";

// /**
//  * All ChatRoom sub-components in one file.
//  *
//  * Sections (Ctrl+F to jump):
//  *  1. SkeletonBubble & ChatSkeleton
//  *  2. WaAudioPlayer
//  *  3. VoicePreview
//  *  4. WaIconBtn
//  *  5. ReplyQuote
//  *  6. ReplyBar
//  *  7. ConfirmDialog
//  *  8. MessageRow
//  *  9. ThreadPanel
//  * 10. CallOverlay
//  * 11. IncomingCallModal
//  * 12. ChatSidebar
//  * 13. ChatHeader
//  * 14. ChatInputZone
//  * 15. ChatRoom (root orchestrator)
//  */

// import React, {
//   useCallback,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";
// import Image from "next/image";
// import { format, isSameDay } from "date-fns";
// import {
//   ChevronDown,
//   ChevronLeft,
//   Check,
//   CheckCheck,
//   Copy,
//   FileIcon,
//   ImageIcon,
//   Loader2,
//   Mic,
//   MoreHorizontal,
//   MoreVertical,
//   Paperclip,
//   Pause,
//   Pencil,
//   Phone,
//   Play,
//   Reply,
//   Search,
//   Send,
//   Smile,
//   StopCircle,
//   Trash2,
//   Video,
//   X,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { cn } from "@/lib/utils";
// import { ChatEmojiPickerDialog } from "@/components/community/chat/chat-emoji-picker-dialog";
// import { useCall } from "@/components/community/call-context";
// import { formatDuration, parseAttachments } from "@/lib/utils";
// import { useChatRoom } from "@/hooks/useChatRoom";
// import type {
//   ActiveConvPeer,
//   Attachment,
//   ChatFilter,
//   InboxConversation,
//   Msg,
//   Profile,
//   SidebarFilter,
//   SidebarMember,
// } from "@/types";
// import { QUICK_REACTIONS } from "@/types";
// import type { ChatAttachmentPayload } from "@/lib/community-chat-upload";
// import { IncomingCallModal } from "./IncomingCallModal";


// // ─────────────────────────────────────────────────────────────────────────────
// // 13. ChatHeader
// // ─────────────────────────────────────────────────────────────────────────────



// // ─────────────────────────────────────────────────────────────────────────────
// // 14. ChatInputZone
// // ─────────────────────────────────────────────────────────────────────────────

// interface ChatInputZoneProps {
//   text: string;
//   setText: (v: string) => void;
//   pendingMain: ChatAttachmentPayload[];
//   setPendingMain: React.Dispatch<React.SetStateAction<ChatAttachmentPayload[]>>;
//   replyingTo: Msg | null;
//   onCancelReply: () => void;
//   voiceBlob: Blob | null;
//   voiceRecording: boolean;
//   voiceSeconds: number;
//   sending: boolean;
//   uploading: boolean;
//   onSend: () => void;
//   onStartVoice: () => void;
//   onStopVoice: () => void;
//   onSendVoice: () => void;
//   onDiscardVoice: () => void;
//   onOpenEmojiPicker: () => void;
//   onAttachImage: (files: FileList | null) => void;
//   onAttachFile: (files: FileList | null) => void;
// }

// export function ChatInputZone({
//   text,
//   setText,
//   pendingMain,
//   setPendingMain,
//   replyingTo,
//   onCancelReply,
//   voiceBlob,
//   voiceRecording,
//   voiceSeconds,
//   sending,
//   uploading,
//   onSend,
//   onStartVoice,
//   onStopVoice,
//   onSendVoice,
//   onDiscardVoice,
//   onOpenEmojiPicker,
//   onAttachImage,
//   onAttachFile,
// }: ChatInputZoneProps) {
//   return (
//     <div className="flex flex-col shrink-0 bg-[#f0f2f5] border-t border-[#d1d7db]">
//       {replyingTo && <ReplyBar msg={replyingTo} onClose={onCancelReply} />}

//       {voiceBlob && !voiceRecording && (
//         <div className="px-3 pt-2 pb-1">
//           <VoicePreview
//             blob={voiceBlob}
//             onSend={onSendVoice}
//             onDiscard={onDiscardVoice}
//             sending={sending}
//           />
//         </div>
//       )}

//       {/* Recording indicator */}
//       {voiceRecording && (
//         <div className="flex items-center gap-3 px-4 py-3">
//           <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
//             <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-75" />
//             <Mic className="h-5 w-5 relative z-10 text-red-500" />
//           </div>
//           <div className="flex flex-1 items-center gap-2 overflow-hidden">
//             <span className="text-sm font-bold tabular-nums shrink-0 text-red-500 min-w-[36px]">
//               {formatDuration(voiceSeconds)}
//             </span>
//             <div className="flex items-end gap-[2px] h-6 flex-1 overflow-hidden">
//               {[...Array(22)].map((_, i) => (
//                 <div
//                   key={i}
//                   className="shrink-0 w-[3px] rounded-full bg-red-400"
//                   style={{
//                     height: `${28 +
//                       Math.sin((i + voiceSeconds * 3) * 0.7) * 22 +
//                       Math.cos((i * 1.3 + voiceSeconds) * 0.9) * 12}%`,
//                     opacity: 0.55 + (i % 4) * 0.1,
//                     transition: "height 0.15s ease",
//                   }}
//                 />
//               ))}
//             </div>
//             <span className="text-[11px] shrink-0 ml-1 text-[#667781]">Recording…</span>
//           </div>
//           <button
//             type="button"
//             onClick={onStopVoice}
//             aria-label="Stop recording"
//             className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow"
//           >
//             <StopCircle className="h-5 w-5" />
//           </button>
//         </div>
//       )}

//       {/* Normal input */}
//       {!voiceRecording && !voiceBlob && (
//         <div className="flex items-end gap-1 px-3 py-[9px] min-h-[62px] pb-[max(9px,env(safe-area-inset-bottom,0px))]">
//           <WaIconBtn aria-label="Emoji picker" onClick={onOpenEmojiPicker}>
//             <Smile className="h-6 w-6" />
//           </WaIconBtn>

//           <div className="flex items-center gap-0.5">
//             <label
//               htmlFor="wa-img-input"
//               className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-sm hover:bg-black/5"
//               aria-label="Attach image"
//             >
//               <ImageIcon className="h-5 w-5 text-[#667781]" />
//             </label>
//             <input
//               id="wa-img-input"
//               type="file"
//               accept="image/*"
//               className="hidden"
//               onChange={(e) => onAttachImage(e.target.files)}
//             />
//             <label
//               htmlFor="wa-file-input"
//               className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-sm hover:bg-black/5"
//               aria-label="Attach file"
//             >
//               <FileIcon className="h-5 w-5 text-[#667781]" />
//             </label>
//             <input
//               id="wa-file-input"
//               type="file"
//               className="hidden"
//               onChange={(e) => onAttachFile(e.target.files)}
//             />
//           </div>

//           <div className="flex flex-col flex-1 min-w-0">
//             {pendingMain.length > 0 && (
//               <div className="flex flex-wrap gap-1.5 px-1 py-1.5 mb-1 rounded-sm bg-black/[0.04]">
//                 {pendingMain.map((a, i) => (
//                   <div
//                     key={a.url}
//                     className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-sm text-[11px] font-medium border border-[#d1d7db]"
//                   >
//                     <FileIcon size={11} className="text-[#00a884]" />
//                     <span className="truncate max-w-[90px]">{a.name}</span>
//                     <button
//                       type="button"
//                       aria-label={`Remove ${a.name}`}
//                       onClick={() => setPendingMain((p) => p.filter((_, j) => j !== i))}
//                     >
//                       <X size={12} className="hover:text-red-500" />
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//             <div className="flex items-center bg-white rounded-lg px-3 py-2.5">
//               <Textarea
//                 value={text}
//                 onChange={(e) => setText(e.target.value)}
//                 placeholder="Type a message"
//                 rows={1}
//                 className="max-h-32 min-h-[24px] w-full resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 text-[#111b21]"
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter" && !e.shiftKey) {
//                     e.preventDefault();
//                     onSend();
//                   }
//                 }}
//               />
//             </div>
//           </div>

//           {text.trim() || pendingMain.length > 0 ? (
//             <button
//               type="button"
//               disabled={sending}
//               aria-label="Send message"
//               onClick={onSend}
//               className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
//             </button>
//           ) : (
//             <button
//               type="button"
//               disabled={sending || uploading}
//               aria-label="Record voice message"
//               onClick={() => void onStartVoice()}
//               className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               <Mic className="h-6 w-6" />
//             </button>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // 15. ChatRoom — root orchestrator
// // ─────────────────────────────────────────────────────────────────────────────

// interface ChatRoomProps {
//   roomId: string;
//   roomName: string;
//   communityId: string;
//   slug: string;
//   hideHeader?: boolean;
// }

// export function ChatRoom({ roomId, roomName, communityId, slug, hideHeader }: ChatRoomProps) {
//   const hook = useChatRoom({ roomId, roomName, communityId, slug });
//   const {
//     callType,
//     setCallType,
//     incomingCall,
//     setIncomingCall,
//     localStream,
//     remoteStream,
//     pcRef,
//     iceQueueRef,
//   } = useCall();

//   // ── WebRTC ─────────────────────────────────────────────────────────────────
//   async function sendCallSignal(
//     type: "audio" | "video" | "call_signal",
//     body?: unknown
//   ) {
//     const ep = hook.activeConvId
//       ? `/api/communities/${slug}/inbox/${hook.activeConvId}/messages`
//       : `/api/messages/${roomId}`;
//     await fetch(ep, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         body: typeof body === "object" ? JSON.stringify(body) : body || type,
//         message_type: type === "call_signal" ? "call_signal" : "call_start",
//       }),
//     });
//   }

//   async function initWebRTC(type: "audio" | "video", isInitiator: boolean) {
//     const stream = await navigator.mediaDevices.getUserMedia({
//       audio: true,
//       video: type === "video",
//     });
//     const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
//     pcRef.current = pc;
//     stream.getTracks().forEach((t) => pc.addTrack(t, stream));
//     pc.ontrack = (ev) => {
//       // remoteStream handled via call context
//       void ev.streams[0];
//     };
//     pc.onicecandidate = (ev) => {
//       if (ev.candidate) sendCallSignal("call_signal", { ice: ev.candidate });
//     };
//     if (isInitiator) {
//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);
//       sendCallSignal("call_signal", { sdp: offer });
//     }
//   }

//   async function startNativeCall(type: "audio" | "video") {
//     setCallType(type);
//     iceQueueRef.current = [];
//     await sendCallSignal(type);
//     await initWebRTC(type, true);
//   }

//   function handleEndCall() {
//     if (localStream) localStream.getTracks().forEach((t) => t.stop());
//     setCallType(null);
//     pcRef.current?.close();
//     pcRef.current = null;
//     iceQueueRef.current = [];
//   }

//   // ── Grouped messages ────────────────────────────────────────────────────────
//   const grouped = useMemo(() => {
//     const rows: { day: Date; items: Msg[] }[] = [];
//     for (const m of hook.filteredMessages) {
//       const d = new Date(m.created_at);
//       const last = rows[rows.length - 1];
//       if (!last || !isSameDay(last.day, d)) rows.push({ day: d, items: [m] });
//       else last.items.push(m);
//     }
//     return rows;
//   }, [hook.filteredMessages]);

//   return (
//     <div className="flex flex-1 h-full min-h-screen max-h-screen font-sans overflow-hidden">
//       {/* Confirm delete dialog */}
//       <ConfirmDialog
//         open={!!hook.confirmDelete}
//         title="Delete message"
//         description="This message will be permanently deleted for everyone."
//         onConfirm={hook.confirmDeleteAction}
//         onCancel={() => hook.setConfirmDelete(null)}
//       />

//       {/* Edit dialog */}
//       <Dialog open={!!hook.editingMsg} onOpenChange={(o) => !o && hook.setEditingMsg(null)}>
//         <DialogContent className="z-[10051] max-w-md">
//           <DialogHeader>
//             <DialogTitle className="text-base font-semibold">Edit message</DialogTitle>
//           </DialogHeader>
//           <Textarea
//             value={hook.editBody}
//             onChange={(e) => hook.setEditBody(e.target.value)}
//             rows={4}
//             className="mt-2 rounded-sm"
//           />
//           <div className="mt-4 flex justify-end gap-2">
//             <Button variant="outline" className="rounded-sm" onClick={() => hook.setEditingMsg(null)}>
//               Cancel
//             </Button>
//             <Button
//               className="rounded-sm font-semibold text-white bg-[#00a884] hover:bg-[#009070]"
//               disabled={hook.editSaving || !hook.editBody.trim()}
//               onClick={() => void hook.saveEdit()}
//             >
//               {hook.editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
//             </Button>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* Emoji picker */}
//       <ChatEmojiPickerDialog
//         open={hook.emojiOpen}
//         onOpenChange={hook.setEmojiOpen}
//         onSelect={(n) =>
//           hook.threadOpen && hook.threadRoot
//             ? hook.setThreadReplyText((hook.threadReplyText || "") + n)
//             : hook.setText((hook.text || "") + n)
//         }
//       />

//       {/* Active call overlay */}
//       {callType && (
//         <CallOverlay
//           callType={callType}
//           roomName={roomName}
//           activeConvPeer={hook.activeConvPeer}
//           localStream={localStream}
//           remoteStream={remoteStream}
//           onEndCall={handleEndCall}
//         />
//       )}

//       {/* Sidebar */}
//       <ChatSidebar
//         roomId={roomId}
//         activeConvId={hook.activeConvId}
//         isChatting={hook.isChatting}
//         allChatRooms={hook.allChatRooms}
//         sidebarMembers={hook.sidebarMembers}
//         inboxConversations={hook.inboxConversations}
//         unreadCounts={hook.unreadCounts}
//         sidebarFilter={hook.sidebarFilter}
//         userId={hook.userId}
//         setSidebarFilter={hook.setSidebarFilter}
//         onSelectRoom={hook.navigateToRoom}
//         onSelectConv={(conv) => {
//           hook.setActiveConvId(conv.id);
//           hook.setActiveConvPeer({ name: conv.peerName, avatar: conv.peerAvatar });
//           hook.setForceShowList(false);
//         }}
//         onOpenDm={hook.openDmWith}
//       />

//       {/* Main panel */}
//       <div
//         className={cn(
//           "flex-1 flex flex-col min-w-0 relative h-full bg-[#efeae2]",
//           hook.isChatting ? "flex" : "hidden md:flex"
//         )}
//       >
//         <ChatHeader
//           roomName={roomName}
//           activeConvId={hook.activeConvId}
//           activeConvPeer={hook.activeConvPeer}
//           isChatting={hook.isChatting}
//           hideHeader={hideHeader}
//           searchOpen={hook.searchOpen}
//           searchQuery={hook.searchQuery}
//           chatFilter={hook.chatFilter}
//           onToggleSearch={() => hook.setSearchOpen((s) => !s)}
//           onSearchChange={hook.setSearchQuery}
//           onCancelSearch={() => { hook.setSearchOpen(false); hook.setSearchQuery(""); }}
//           onSetChatFilter={hook.setChatFilter}
//           onStartAudioCall={() => void startNativeCall("audio")}
//           onStartVideoCall={() => void startNativeCall("video")}
//           onBack={() => hook.setForceShowList(true)}
//         />

//         {/* Messages */}
//         <div
//           ref={hook.scrollRef}
//           onScroll={hook.onScrollMain}
//           role="log"
//           aria-live="polite"
//           aria-label="Messages"
//           className={cn(
//             "bg-[#efeae2] overflow-y-auto px-[5%] py-3 pb-5 flex-1 min-h-0 flex flex-col scrollbar-thin scrollbar-thumb-[#c1c9cd]",
//             hook.loading ? "overflow-hidden" : "overflow-auto"
//           )}
//         >
//           {hook.loading ? (
//             <ChatSkeleton />
//           ) : hook.messages.length === 0 ? (
//             <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center">
//               <p className="text-sm font-semibold text-[#111b21]">Start the conversation</p>
//               <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#667781]">
//                 Type a message below.
//               </p>
//             </div>
//           ) : hook.filteredMessages.length === 0 ? (
//             <p className="py-12 text-center text-sm text-[#667781]">
//               No messages match your search.
//             </p>
//           ) : (
//             grouped.map((g) => (
//               <div key={g.day.toISOString()}>
//                 <div className="flex justify-center my-2 mb-4">
//                   <span className="bg-white text-[#3b4a54] px-3 py-[5px] rounded-md text-[12px] font-medium shadow-sm">
//                     {format(g.day, "MMM d, yyyy")}
//                   </span>
//                 </div>
//                 <div className="space-y-0.5">
//                   {g.items.map((m) =>
//                     m.message_type === "system" ? (
//                       <p key={m.id} className="py-1 text-center text-xs text-[#667781]">
//                         {m.body}
//                       </p>
//                     ) : (
//                       <MessageRow
//                         key={m.id}
//                         m={m}
//                         isOwn={!!hook.userId && m.sender_id === hook.userId}
//                         userId={hook.userId}
//                         isDM={!!hook.activeConvId}
//                         onOpenThread={() => hook.openThread(m)}
//                         onToggleReaction={hook.toggleReaction}
//                         onDelete={hook.deleteMessage}
//                         onEdit={(msg) => { hook.setEditingMsg(msg); hook.setEditBody(msg.body); }}
//                         onReply={(msg) => hook.setReplyingTo(msg)}
//                       />
//                     )
//                   )}
//                 </div>
//               </div>
//             ))
//           )}

//           {!hook.atBottom && !hook.loading && hook.messages.length > 0 && (
//             <div className="pointer-events-none sticky bottom-2 z-10 flex justify-center">
//               <button
//                 type="button"
//                 aria-label="Scroll to latest message"
//                 onClick={() => hook.scrollToBottom()}
//                 className="pointer-events-auto h-10 w-10 flex items-center justify-center rounded-full shadow-sm bg-[#f0f2f5] text-[#00a884] border border-[#d1d7db]"
//               >
//                 <ChevronDown className="h-5 w-5" />
//               </button>
//             </div>
//           )}
//           <div ref={hook.bottomRef} />
//         </div>

//         {/* Input zone */}
//         <ChatInputZone
//           text={hook.text}
//           setText={hook.setText}
//           pendingMain={hook.pendingMain}
//           setPendingMain={hook.setPendingMain}
//           replyingTo={hook.replyingTo}
//           onCancelReply={() => hook.setReplyingTo(null)}
//           voiceBlob={hook.voiceBlob}
//           voiceRecording={hook.voiceRecording}
//           voiceSeconds={hook.voiceSeconds}
//           sending={hook.sending}
//           uploading={hook.uploading}
//           onSend={() => void hook.sendMessage()}
//           onStartVoice={hook.startVoiceRecording}
//           onStopVoice={hook.stopVoiceRecording}
//           onSendVoice={hook.sendVoiceBlob}
//           onDiscardVoice={() => { hook.setVoiceBlob(null); hook.setVoiceMime(""); }}
//           onOpenEmojiPicker={() => hook.setEmojiOpen(true)}
//           onAttachImage={(files) => hook.handleFiles(files, "main")}
//           onAttachFile={(files) => hook.handleFiles(files, "main")}
//         />
//       </div>

//       {/* Thread panel */}
//       {hook.threadOpen && hook.threadRoot && (
//         <ThreadPanel
//           threadRoot={hook.threadRoot}
//           threadReplies={hook.threadReplies}
//           threadBottomRef={hook.threadBottomRef}
//           userId={hook.userId}
//           threadReplyText={hook.threadReplyText}
//           setThreadReplyText={hook.setThreadReplyText}
//           pendingThread={hook.pendingThread}
//           setPendingThread={hook.setPendingThread}
//           sending={hook.sending}
//           uploading={hook.uploading}
//           onClose={() => hook.setThreadOpen(false)}
//           onSendReply={() => void hook.sendMessage(hook.threadRoot!.id)}
//           onToggleReaction={hook.toggleReaction}
//           onDelete={hook.deleteMessage}
//           onEdit={(msg) => { hook.setEditingMsg(msg); hook.setEditBody(msg.body); }}
//           onReply={(msg) => hook.setReplyingTo(msg)}
//           onOpenEmojiPicker={() => hook.setEmojiOpen(true)}
//           onAttachFile={(files) => hook.handleFiles(files, "thread")}
//         />
//       )}

//       {/* Incoming call modal */}
//       {incomingCall && (
//         <IncomingCallModal
//           incomingCall={incomingCall}
//           onDecline={() => setIncomingCall(null)}
//           onAccept={() => {
//             setCallType(incomingCall.type);
//             setIncomingCall(null);
//             iceQueueRef.current = [];
//             void initWebRTC(incomingCall.type, false, incomingCall.roomId, incomingCall.convId);
//           }}
//         />
//       )}
//     </div>
//   );
// }