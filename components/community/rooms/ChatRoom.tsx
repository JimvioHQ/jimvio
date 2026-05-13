// "use client";

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
//   Copy,
//   FileIcon,
//   ImageIcon,
//   Loader2,
//   Mic,
//   MoreVertical,
//   MoreHorizontal,
//   Paperclip,
//   Pencil,
//   Reply,
//   Search,
//   Send,
//   Smile,
//   StopCircle,
//   Trash2,
//   X,
//   Phone,
//   Video,
//   Check,
//   CheckCheck,
//   Play,
//   Pause,
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
// import { useWorkspace } from "@/components/community/workspace-context";
// import { useCall } from "@/components/community/call-context";
// import { cn } from "@/lib/utils";
// import { createClient } from "@/lib/supabase/client";
// import {
//   uploadCommunityChatFile,
//   type ChatAttachmentPayload,
// } from "@/lib/community-chat-upload";
// import { ChatEmojiPickerDialog } from "@/components/community/chat/chat-emoji-picker-dialog";
// import { useRouter } from "next/navigation";

// // ─── Types ─────────────────────────────────────────────────────────────────────
// type Profile = {
//   full_name: string | null;
//   avatar_url: string | null;
//   username: string | null;
// };

// type Msg = {
//   id: string;
//   body: string;
//   sender_id: string;
//   created_at: string;
//   message_type: string;
//   thread_id: string | null;
//   reactions: unknown;
//   attachments?: unknown;
//   profiles?: Profile | null;
//   reply_count?: number | null;
//   is_edited?: boolean | null;
//   edited_at?: string | null;
//   reply_to_id?: string | null;
//   reply_to_body?: string | null;
//   reply_to_sender?: string | null;
// };

// // FIX: typed instead of any[]
// type SidebarMember = {
//   user_id: string;
//   role?: string;
//   profile?: Profile;
// };

// type InboxConversation = {
//   id: string;
//   peerId: string;
//   peerName: string;
//   peerAvatar: string | null;
// };

// const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥"] as const;
// const MAX_ATTACH = 6;
// const MAX_FILE_BYTES = 15 * 1024 * 1024;

// // ─── Helpers ───────────────────────────────────────────────────────────────────
// function parseAttachments(
//   raw: unknown
// ): { url: string; name?: string; mime?: string }[] {
//   if (!raw || !Array.isArray(raw)) return [];
//   return raw.filter(
//     (
//       x
//     ): x is { url: string; name?: string; mime?: string } =>
//       typeof x === "object" &&
//       x !== null &&
//       "url" in x &&
//       typeof (x as { url: unknown }).url === "string"
//   );
// }

// function deriveMessageType(
//   atts: ChatAttachmentPayload[],
//   body: string
// ): string {
//   if (atts.length === 0) return "text";
//   const allImg = atts.every((a) => a.mime.startsWith("image/"));
//   const allAudio = atts.every((a) => a.mime.startsWith("audio/"));
//   if (body.trim()) return "text";
//   if (allImg) return "image";
//   if (allAudio) return "audio";
//   return "file";
// }

// function formatDuration(sec: number): string {
//   const m = Math.floor(sec / 60).toString().padStart(2, "0");
//   const s = Math.floor(sec % 60).toString().padStart(2, "0");
//   return `${m}:${s}`;
// }

// // ─── Skeleton ──────────────────────────────────────────────────────────────────
// function SkeletonBubble({ own, wide }: { own?: boolean; wide?: boolean }) {
//   return (
//     <div
//       className={cn(
//         "flex w-full mb-3",
//         own ? "justify-end" : "justify-start"
//       )}
//     >
//       {!own && (
//         <div className="h-8 w-8 rounded-sm shrink-0 mr-2 mt-1 animate-pulse bg-[#d1d7db]" />
//       )}
//       <div
//         className={cn(
//           "rounded-sm px-3 py-2.5 animate-pulse min-w-[80px] shadow-sm",
//           own ? "bg-[#d9fdd3] rounded-tr-sm" : "bg-white rounded-tl-sm",
//           wide ? "w-[55%]" : "w-[38%]"
//         )}
//       >
//         <div className="h-3 rounded-sm mb-2 bg-[#d1d7db] w-[70%]" />
//         <div
//           className={cn(
//             "h-3 rounded-sm mb-2 bg-[#d1d7db]",
//             wide ? "w-[90%]" : "w-1/2"
//           )}
//         />
//         {wide && (
//           <div className="h-3 rounded-sm mb-2 bg-[#d1d7db] w-[40%]" />
//         )}
//         <div className="flex justify-end mt-2">
//           <div className="h-2 w-8 rounded-sm bg-[#d1d7db]" />
//         </div>
//       </div>
//     </div>
//   );
// }

// function ChatSkeleton() {
//   const pattern = [
//     { own: false, wide: false },
//     { own: false, wide: true },
//     { own: true, wide: false },
//     { own: true, wide: true },
//     { own: false, wide: true },
//     { own: true, wide: false },
//     { own: false, wide: false },
//     { own: false, wide: true },
//     { own: true, wide: true },
//     { own: true, wide: false },
//     { own: false, wide: false },
//     { own: true, wide: true },
//   ];
//   return (
//     <div className="flex flex-col px-[5%] pt-6">
//       {pattern.map((p, i) => (
//         <SkeletonBubble key={i} own={p.own} wide={p.wide} />
//       ))}
//     </div>
//   );
// }

// // ─── Audio Player ──────────────────────────────────────────────────────────────
// function WaAudioPlayer({ src, isOwn }: { src: string; isOwn?: boolean }) {
//   const audioRef = useRef<HTMLAudioElement>(null);
//   const [playing, setPlaying] = useState(false);
//   const [current, setCurrent] = useState(0);
//   const [duration, setDuration] = useState(0);

//   useEffect(() => {
//     const a = audioRef.current;
//     if (!a) return;
//     const onTime = () => setCurrent(a.currentTime);
//     const onMeta = () =>
//       setDuration(isFinite(a.duration) ? a.duration : 0);
//     const onEnd = () => {
//       setPlaying(false);
//       setCurrent(0);
//     };
//     a.addEventListener("timeupdate", onTime);
//     a.addEventListener("loadedmetadata", onMeta);
//     a.addEventListener("durationchange", onMeta);
//     a.addEventListener("ended", onEnd);
//     return () => {
//       a.removeEventListener("timeupdate", onTime);
//       a.removeEventListener("loadedmetadata", onMeta);
//       a.removeEventListener("durationchange", onMeta);
//       a.removeEventListener("ended", onEnd);
//     };
//   }, [src]);

//   function toggle() {
//     const a = audioRef.current;
//     if (!a) return;
//     if (playing) {
//       a.pause();
//       setPlaying(false);
//     } else {
//       a.play()
//         .then(() => setPlaying(true))
//         .catch(console.error);
//     }
//   }

//   const pct =
//     duration > 0 ? Math.min((current / duration) * 100, 100) : 0;

//   return (
//     <div className="flex items-center gap-2.5 py-1 min-w-[200px] max-w-[270px]">
//       <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
//       <button
//         type="button"
//         onClick={toggle}
//         className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white"
//         aria-label={playing ? "Pause audio" : "Play audio"}
//       >
//         {playing ? (
//           <Pause className="h-5 w-5" />
//         ) : (
//           <Play className="h-5 w-5 ml-0.5" />
//         )}
//       </button>
//       <div className="flex flex-col flex-1 min-w-0 gap-1.5">
//         <div
//           className={cn(
//             "relative h-1.5 rounded-full overflow-hidden cursor-pointer",
//             isOwn ? "bg-[#b2dfcd]" : "bg-[#d1d7db]"
//           )}
//           onClick={(e) => {
//             const a = audioRef.current;
//             if (!a || !duration) return;
//             const rect = e.currentTarget.getBoundingClientRect();
//             a.currentTime =
//               ((e.clientX - rect.left) / rect.width) * duration;
//           }}
//         >
//           <div
//             className="absolute inset-y-0 left-0 rounded-full bg-[#00a884] transition-all duration-100"
//             style={{ width: `${pct}%` }}
//           />
//         </div>
//         <div className="flex items-center justify-between">
//           <span className="text-[10px] font-medium tabular-nums text-[#667781]">
//             {playing || current > 0
//               ? formatDuration(current)
//               : formatDuration(duration)}
//           </span>
//           <Mic className="h-3 w-3 text-[#667781]" />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Voice Preview ─────────────────────────────────────────────────────────────
// function VoicePreview({
//   blob,
//   onSend,
//   onDiscard,
//   sending,
// }: {
//   blob: Blob;
//   onSend: () => void;
//   onDiscard: () => void;
//   sending: boolean;
// }) {
//   const url = useMemo(() => URL.createObjectURL(blob), [blob]);
//   useEffect(() => () => URL.revokeObjectURL(url), [url]);

//   return (
//     <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm border border-[#d1d7db] bg-white">
//       <WaAudioPlayer src={url} isOwn />
//       <button
//         type="button"
//         onClick={onDiscard}
//         title="Discard recording"
//         aria-label="Discard recording"
//         className="h-8 w-8 flex items-center justify-center rounded-sm hover:bg-red-50 transition-colors"
//       >
//         <Trash2 className="h-4 w-4 text-red-500" />
//       </button>
//       <button
//         type="button"
//         onClick={onSend}
//         disabled={sending}
//         title="Send voice message"
//         aria-label="Send voice message"
//         className="h-9 w-9 flex items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-50 transition-colors"
//       >
//         {sending ? (
//           <Loader2 className="h-4 w-4 animate-spin" />
//         ) : (
//           <Send className="h-4 w-4" />
//         )}
//       </button>
//     </div>
//   );
// }

// // ─── Icon Button ───────────────────────────────────────────────────────────────
// function WaIconBtn({
//   children,
//   onClick,
//   disabled,
//   "aria-label": ariaLabel,
//   className,
//   active,
// }: {
//   children: React.ReactNode;
//   onClick?: () => void;
//   disabled?: boolean;
//   "aria-label"?: string;
//   className?: string;
//   active?: boolean;
// }) {
//   return (
//     <button
//       type="button"
//       aria-label={ariaLabel}
//       disabled={disabled}
//       onClick={onClick}
//       className={cn(
//         "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-40 text-[#667781]",
//         active ? "opacity-100" : "opacity-70 hover:opacity-100",
//         className
//       )}
//     >
//       {children}
//     </button>
//   );
// }

// // ─── Reply Quote ───────────────────────────────────────────────────────────────
// function ReplyQuote({
//   body,
//   sender,
//   isOwn,
// }: {
//   body: string;
//   sender: string;
//   isOwn?: boolean;
// }) {
//   return (
//     <div
//       className={cn(
//         "mb-1.5 rounded-sm overflow-hidden flex border-l-[3px] border-[#00a884]",
//         isOwn ? "bg-black/[0.07]" : "bg-black/[0.05]"
//       )}
//     >
//       <div className="px-2.5 py-1.5 min-w-0 flex-1">
//         <p className="text-[11px] font-semibold truncate text-[#00a884]">
//           {sender}
//         </p>
//         <p className="text-[12px] truncate leading-snug text-[#667781]">
//           {body || "📎 Attachment"}
//         </p>
//       </div>
//     </div>
//   );
// }

// // ─── Reply Bar ─────────────────────────────────────────────────────────────────
// function ReplyBar({ msg, onClose }: { msg: Msg; onClose: () => void }) {
//   const sender =
//     msg.profiles?.full_name || msg.profiles?.username || "Member";
//   const preview =
//     msg.body?.trim() ||
//     (parseAttachments(msg.attachments).length
//       ? "📎 Attachment"
//       : "Message");
//   return (
//     <div className="flex items-center gap-2 px-3 py-2 bg-[#f0f2f5] border-b border-[#d1d7db]">
//       <div
//         className="flex-1 min-w-0 pl-2.5 border-l-[3px] border-[#00a884]"
//       >
//         <p className="text-[11px] font-semibold truncate text-[#00a884]">
//           {sender}
//         </p>
//         <p className="text-[12px] truncate text-[#667781]">{preview}</p>
//       </div>
//       <button
//         type="button"
//         onClick={onClose}
//         aria-label="Cancel reply"
//         className="shrink-0 h-7 w-7 flex items-center justify-center rounded-sm hover:bg-black/5"
//       >
//         <X className="h-4 w-4 text-[#667781]" />
//       </button>
//     </div>
//   );
// }

// // ─── Confirm Dialog ────────────────────────────────────────────────────────────
// // FIX: replaces window.confirm — no more UI thread blocking
// function ConfirmDialog({
//   open,
//   title,
//   description,
//   onConfirm,
//   onCancel,
// }: {
//   open: boolean;
//   title: string;
//   description: string;
//   onConfirm: () => void;
//   onCancel: () => void;
// }) {
//   return (
//     <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
//       <DialogContent className="z-[10060] max-w-sm">
//         <DialogHeader>
//           <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
//         </DialogHeader>
//         <p className="text-sm text-[#667781] mt-1">{description}</p>
//         <div className="mt-4 flex justify-end gap-2">
//           <Button variant="outline" className="rounded-sm" onClick={onCancel}>
//             Cancel
//           </Button>
//           <Button
//             className="rounded-sm font-semibold text-white bg-red-500 hover:bg-red-600"
//             onClick={onConfirm}
//           >
//             Delete
//           </Button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }

// // ─── MessageRow ────────────────────────────────────────────────────────────────
// function MessageRow({
//   m,
//   compact,
//   isOwn,
//   userId,
//   isDM,
//   onOpenThread,
//   onToggleReaction,
//   onDelete,
//   onEdit,
//   onReply,
// }: {
//   m: Msg;
//   compact?: boolean;
//   isOwn?: boolean;
//   userId: string | null;
//   isDM?: boolean;
//   onOpenThread: () => void;
//   onToggleReaction: (id: string, emoji: string) => void;
//   onDelete: (id: string) => void;
//   onEdit: (msg: Msg) => void;
//   onReply: (msg: Msg) => void;
// }) {
//   const p = m.profiles;
//   const attachments = parseAttachments(m.attachments);
//   const reactions = (
//     m.reactions && typeof m.reactions === "object" ? m.reactions : {}
//   ) as Record<string, string[]>;
//   const isRoot = !m.thread_id;
//   const replyCount = m.reply_count ?? 0;
//   const isAudio =
//     m.message_type === "audio" ||
//     attachments.some((a) => a.mime?.startsWith("audio/"));
//   const audioUrl =
//     attachments.find((a) => a.mime?.startsWith("audio/"))?.url || "";
//   const nonAudioAtts = attachments.filter(
//     (a) => !a.mime?.startsWith("audio/")
//   );
//   const hasReplyQuote = !!m.reply_to_id && !!m.reply_to_body;

//   function userReacted(emoji: string) {
//     const ids = reactions[emoji];
//     if (!userId || !ids?.length) return false;
//     return ids.some((id) => String(id) === String(userId));
//   }

//   return (
//     <div
//       className={cn(
//         "flex w-full group mb-0.5",
//         isOwn ? "justify-end" : "justify-start",
//         compact && "pl-3"
//       )}
//     >
//       <div
//         className={cn(
//           "flex gap-2 max-w-[min(100%,26rem)]",
//           isOwn && "flex-row-reverse"
//         )}
//       >
//         {/* Avatar */}
//         {!isOwn && !compact && (
//           <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 mt-1 border border-[#d1d7db] bg-[#f0f2f5]">
//             {p?.avatar_url ? (
//               <Image
//                 src={p.avatar_url}
//                 alt=""
//                 width={32}
//                 height={32}
//                 className="object-cover h-full w-full"
//                 unoptimized
//               />
//             ) : (
//               <div className="h-full w-full flex items-center justify-center text-xs font-bold text-[#00a884]">
//                 {(p?.full_name || p?.username || "?")[0]}
//               </div>
//             )}
//           </div>
//         )}

//         <div
//           className={cn(
//             "min-w-0 flex-1",
//             isOwn && "flex flex-col items-end"
//           )}
//         >
//           {/* Bubble */}
//           <div
//             className={cn(
//               "relative px-2.5 pt-1.5 pb-2 shadow-sm",
//               isOwn
//                 ? "bg-[#d9fdd3] rounded-t-lg rounded-bl-lg rounded-br-sm"
//                 : "bg-white rounded-t-lg rounded-br-lg rounded-bl-sm"
//             )}
//           >
//             {/* Sender name (group) */}
//             {!isOwn && !isDM && (
//               <p className="text-[11px] font-semibold mb-0.5 text-[#00a884]">
//                 {p?.full_name || p?.username || "Member"}
//               </p>
//             )}

//             {/* Quoted reply */}
//             {hasReplyQuote && (
//               <ReplyQuote
//                 body={m.reply_to_body!}
//                 sender={m.reply_to_sender || "Member"}
//                 isOwn={isOwn}
//               />
//             )}

//             {/* Audio */}
//             {isAudio ? (
//               <WaAudioPlayer src={audioUrl} isOwn={isOwn} />
//             ) : (
//               <>
//                 {m.body?.trim() && (
//                   <p className="text-sm whitespace-pre-wrap break-words pr-12 text-[#111b21]">
//                     {m.body}
//                   </p>
//                 )}
//                 {nonAudioAtts.length > 0 && (
//                   <div
//                     className={cn(
//                       "mt-1.5 flex flex-col gap-2",
//                       isOwn && "items-end"
//                     )}
//                   >
//                     {nonAudioAtts.map((a) =>
//                       a.mime?.startsWith("image/") ||
//                         /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(a.url) ? (
//                         <a
//                           key={a.url}
//                           href={a.url}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="block rounded-sm overflow-hidden max-w-full"
//                         >
//                           <Image
//                             src={a.url}
//                             alt={a.name || ""}
//                             width={280}
//                             height={200}
//                             className="max-h-52 w-auto object-contain"
//                             unoptimized
//                           />
//                         </a>
//                       ) : (
//                         <a
//                           key={a.url}
//                           href={a.url}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-sm bg-white text-[#00a884]"
//                         >
//                           <FileIcon className="h-4 w-4 shrink-0" />
//                           <span className="truncate">
//                             {a.name || "File"}
//                           </span>
//                         </a>
//                       )
//                     )}
//                   </div>
//                 )}
//               </>
//             )}

//             {/* Timestamp + ticks */}
//             <div className="absolute bottom-1 right-1.5 flex items-center gap-1 pointer-events-none">
//               {m.is_edited && (
//                 <span className="text-[9px] text-[#667781]">edited</span>
//               )}
//               <span className="text-[10px] text-[#667781]">
//                 {format(new Date(m.created_at), "HH:mm")}
//               </span>
//               {isOwn && (
//                 <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
//               )}
//             </div>
//           </div>

//           {/* Reactions */}
//           {Object.values(reactions).some((ids) => ids.length > 0) && (
//             <div
//               className={cn(
//                 "mt-0.5 flex flex-wrap items-center gap-1",
//                 isOwn && "justify-end"
//               )}
//             >
//               {Object.entries(reactions).map(([emoji, ids]) =>
//                 ids.length ? (
//                   <button
//                     key={emoji}
//                     type="button"
//                     onClick={() => onToggleReaction(m.id, emoji)}
//                     className={cn(
//                       "text-[11px] px-2 py-0.5 rounded-sm transition-colors border text-[#111b21]",
//                       userReacted(emoji)
//                         ? "bg-[#00a884]/20 border-[#00a884]"
//                         : "bg-white border-transparent"
//                     )}
//                   >
//                     {emoji} {ids.length}
//                   </button>
//                 ) : null
//               )}
//             </div>
//           )}

//           {/* Hover actions */}
//           <div
//             className={cn(
//               "mt-0.5 flex flex-wrap items-center gap-0.5",
//               "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
//               isOwn && "justify-end"
//             )}
//           >
//             {QUICK_REACTIONS.map((emoji) => (
//               <button
//                 key={emoji}
//                 type="button"
//                 aria-label={`React with ${emoji}`}
//                 className="text-base leading-none h-7 w-7 rounded-sm flex items-center justify-center hover:opacity-80"
//                 onClick={() => onToggleReaction(m.id, emoji)}
//               >
//                 {emoji}
//               </button>
//             ))}

//             <button
//               type="button"
//               className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium hover:bg-black/5 transition-colors text-[#667781]"
//               onClick={() => onReply(m)}
//             >
//               <Reply className="h-3.5 w-3.5" />
//               Reply
//             </button>

//             {isRoot && !isDM && (
//               <button
//                 type="button"
//                 className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium hover:bg-black/5 transition-colors text-[#667781]"
//                 onClick={onOpenThread}
//               >
//                 {replyCount > 0 ? `${replyCount} in thread` : "Thread"}
//               </button>
//             )}

//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <button
//                   type="button"
//                   aria-label="More options"
//                   className="h-7 w-7 inline-flex items-center justify-center rounded-sm hover:bg-black/5 transition-colors text-[#667781]"
//                 >
//                   <MoreHorizontal className="h-4 w-4" />
//                 </button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent
//                 align={isOwn ? "end" : "start"}
//                 className="z-[10055] min-w-[10rem]"
//               >
//                 <DropdownMenuItem
//                   className="cursor-pointer"
//                   onClick={() =>
//                     void navigator.clipboard.writeText(
//                       (m.body || "").trim() || "(attachment)"
//                     )
//                   }
//                 >
//                   <Copy className="mr-2 h-4 w-4" /> Copy text
//                 </DropdownMenuItem>
//                 {isOwn && (
//                   <>
//                     <DropdownMenuItem
//                       className="cursor-pointer"
//                       onClick={() => onEdit(m)}
//                     >
//                       <Pencil className="mr-2 h-4 w-4" /> Edit
//                     </DropdownMenuItem>
//                     <DropdownMenuItem
//                       className="cursor-pointer font-semibold text-red-500"
//                       onClick={() => onDelete(m.id)}
//                     >
//                       <Trash2 className="mr-2 h-4 w-4" /> Delete
//                     </DropdownMenuItem>
//                   </>
//                 )}
//               </DropdownMenuContent>
//             </DropdownMenu>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Main ChatRoom ──────────────────────────────────────────────────────────────
// export function ChatRoom({
//   roomId,
//   roomName,
//   communityId,
//   slug,
//   hideHeader,
// }: {
//   roomId: string;
//   roomName: string;
//   communityId: string;
//   slug: string;
//   hideHeader?: boolean;
// }) {
//   const supabase = useMemo(() => createClient(), []);
//   const [messages, setMessages] = useState<Msg[]>([]);
//   const [userId, setUserId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [text, setText] = useState("");
//   const [threadReplyText, setThreadReplyText] = useState("");
//   const [pendingMain, setPendingMain] = useState<ChatAttachmentPayload[]>([]);
//   const [pendingThread, setPendingThread] = useState<ChatAttachmentPayload[]>(
//     []
//   );
//   const [replyingTo, setReplyingTo] = useState<Msg | null>(null);

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
//   const localVideoRef = useRef<HTMLVideoElement>(null);
//   const remoteVideoRef = useRef<HTMLVideoElement>(null);

//   const [activeConvId, setActiveConvId] = useState<string | null>(null);
//   const [activeConvPeer, setActiveConvPeer] = useState<{
//     name: string;
//     avatar: string | null;
//   } | null>(null);
//   const [uploading, setUploading] = useState(false);
//   const [sending, setSending] = useState(false);
//   const [emojiOpen, setEmojiOpen] = useState(false);
//   const [threadRoot, setThreadRoot] = useState<Msg | null>(null);
//   const [threadReplies, setThreadReplies] = useState<Msg[]>([]);
//   const [threadOpen, setThreadOpen] = useState(false);
//   const bottomRef = useRef<HTMLDivElement>(null);
//   const threadBottomRef = useRef<HTMLDivElement>(null);
//   const threadRootRef = useRef<Msg | null>(null);
//   const threadOpenRef = useRef(false);
//   const threadFileRef = useRef<HTMLInputElement>(null);
//   const scrollRef = useRef<HTMLDivElement>(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [atBottom, setAtBottom] = useState(true);
//   const [editingMsg, setEditingMsg] = useState<Msg | null>(null);
//   const [editBody, setEditBody] = useState("");
//   const [editSaving, setEditSaving] = useState(false);
//   const [searchOpen, setSearchOpen] = useState(false);
//   const [chatFilter, setChatFilter] = useState<"all" | "media">("all");
//   const [sidebarFilter, setSidebarFilter] = useState<
//     "all" | "unread" | "group" | "inbox" | "calls"
//   >("all");
//   // FIX: typed properly
//   const [sidebarMembers, setSidebarMembers] = useState<SidebarMember[]>([]);
//   const [inboxConversations, setInboxConversations] = useState<
//     InboxConversation[]
//   >([]);
//   const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
//   const [forceShowList, setForceShowList] = useState(false);

//   // FIX: replaces window.confirm
//   const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

//   // ── Voice recording ──────────────────────────────────────────────────────
//   const [voiceRecording, setVoiceRecording] = useState(false);
//   const [voiceSeconds, setVoiceSeconds] = useState(0);
//   const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
//   const [voiceMime, setVoiceMime] = useState("");
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const voiceChunksRef = useRef<Blob[]>([]);
//   const voiceStreamRef = useRef<MediaStream | null>(null);
//   const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   const isChatting = !forceShowList && (!!roomId || !!activeConvId);
//   const { spacesWithRooms } = useWorkspace();
//   const router = useRouter();
//   const allChatRooms = spacesWithRooms.flatMap((s: { id: string; rooms: { room_type: string; id: string; name: string }[] }) =>
//     s.rooms
//       .filter((r) => r.room_type === "chat")
//       .map((r) => ({ spaceId: s.id, ...r }))
//   );

//   useEffect(() => {
//     threadRootRef.current = threadRoot;
//   }, [threadRoot]);
//   useEffect(() => {
//     threadOpenRef.current = threadOpen;
//   }, [threadOpen]);

//   // FIX: cleanup voice resources on unmount
//   useEffect(() => {
//     return () => {
//       voiceStreamRef.current?.getTracks().forEach((t) => t.stop());
//       if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
//       // FIX: cleanup WebRTC on unmount
//       pcRef.current?.close();
//     };
//   }, [pcRef]);

//   // FIX: cleanup local stream on unmount
//   useEffect(() => {
//     return () => {
//       localStream?.getTracks().forEach((t) => t.stop());
//     };
//   }, [localStream]);

//   // FIX: use Map-based dedup helper to prevent duplicate messages
//   const upsertMessage = useCallback((msg: Msg) => {
//     setMessages((prev) => {
//       const map = new Map(prev.map((m) => [m.id, m]));
//       map.set(msg.id, msg);
//       return [...map.values()].sort(
//         (a, b) =>
//           new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
//       );
//     });
//   }, []);

//   const patchMessage = useCallback((id: string, patch: Partial<Msg>) => {
//     setMessages((prev) =>
//       prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
//     );
//     setThreadReplies((prev) =>
//       prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
//     );
//     setThreadRoot((r) => (r && r.id === id ? { ...r, ...patch } : r));
//   }, []);

//   const removeMessage = useCallback((id: string) => {
//     setMessages((prev) => prev.filter((m) => m.id !== id));
//     setThreadReplies((prev) => prev.filter((m) => m.id !== id));
//     setThreadRoot((r) => {
//       if (r?.id === id) {
//         setThreadOpen(false);
//         return null;
//       }
//       return r;
//     });
//   }, []);

//   const scrollToBottom = useCallback((smooth = true) => {
//     bottomRef.current?.scrollIntoView({
//       behavior: smooth ? "smooth" : "auto",
//     });
//   }, []);

//   // FIX: AbortController for all fetch calls
//   const load = useCallback(async () => {
//     setLoading(true);
//     const controller = new AbortController();
//     try {
//       if (activeConvId) {
//         const res = await fetch(
//           `/api/communities/${slug}/inbox/${activeConvId}/messages`,
//           { signal: controller.signal }
//         );
//         const data = await res.json();
//         if (!res.ok) throw new Error(data.error);
//         setMessages(data.messages ?? []);
//       } else if (roomId) {
//         const res = await fetch(`/api/messages/${roomId}?limit=100`, {
//           signal: controller.signal,
//         });
//         const data = await res.json();
//         if (!res.ok) throw new Error(data.error);
//         setMessages(data.messages ?? []);
//       }
//     } catch (e: unknown) {
//       if (e instanceof Error && e.name !== "AbortError") setMessages([]);
//     } finally {
//       setLoading(false);
//     }
//     return () => controller.abort();
//   }, [roomId, activeConvId, slug]);

//   const loadThread = useCallback(async (rootId: string) => {
//     const sb = createClient();
//     const { data } = await sb
//       .from("community_messages")
//       .select(
//         "*, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)"
//       )
//       .eq("thread_id", rootId)
//       .eq("is_deleted", false)
//       .order("created_at", { ascending: true });
//     setThreadReplies((data as Msg[]) ?? []);
//   }, []);

//   // Unread counts from localStorage
//   useEffect(() => {
//     const read = () => {
//       const uc: Record<string, number> = {};
//       for (let i = 0; i < localStorage.length; i++) {
//         const k = localStorage.key(i);
//         if (k?.startsWith("workspace-unread:"))
//           uc[k.replace("workspace-unread:", "")] = parseInt(
//             localStorage.getItem(k) || "0",
//             10
//           );
//       }
//       setUnreadCounts(uc);
//     };
//     read();
//     window.addEventListener("storage", read);
//     return () => window.removeEventListener("storage", read);
//   }, []);

//   // FIX: AbortController for sidebar fetch
//   useEffect(() => {
//     const controller = new AbortController();
//     async function fetchSidebar() {
//       try {
//         const [mr, cr] = await Promise.all([
//           fetch(`/api/communities/${slug}/members`, {
//             signal: controller.signal,
//           }),
//           fetch(`/api/communities/${slug}/inbox`, {
//             signal: controller.signal,
//           }),
//         ]);
//         if (mr.ok) setSidebarMembers((await mr.json()).members || []);
//         if (cr.ok)
//           setInboxConversations((await cr.json()).conversations || []);
//       } catch (e: unknown) {
//         if (e instanceof Error && e.name !== "AbortError") console.error(e);
//       }
//     }
//     fetchSidebar();
//     const sub = supabase
//       .channel("inbox_updates")
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "community_inbox_conversations",
//         },
//         fetchSidebar
//       )
//       .subscribe();
//     return () => {
//       controller.abort();
//       supabase.removeChannel(sub);
//     };
//   }, [slug, supabase]);

//   useEffect(() => {
//     if (!roomId && !activeConvId) return;
//     const key = `workspace-unread:${activeConvId || roomId}`;
//     if (localStorage.getItem(key)) {
//       localStorage.removeItem(key);
//       window.dispatchEvent(new Event("storage"));
//     }
//   }, [roomId, activeConvId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     if (!communityId) return;
//     const controller = new AbortController();
//     fetch(`/api/communities/${communityId}/members`, {
//       signal: controller.signal,
//     })
//       .then((r) => r.json())
//       .then((d) => setSidebarMembers(d.members ?? []))
//       .catch((e: unknown) => {
//         if (e instanceof Error && e.name !== "AbortError") console.error(e);
//       });
//     return () => controller.abort();
//   }, [communityId]);

//   // FIX: subscribe to auth changes instead of one-shot getUser
//   useEffect(() => {
//     supabase.auth.getUser().then(({ data: { user } }) =>
//       setUserId(user?.id ?? null)
//     );
//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange((_event, session) => {
//       setUserId(session?.user?.id ?? null);
//     });
//     return () => subscription.unsubscribe();
//   }, [supabase]);

//   // FIX: AbortController for inbox fetch
//   useEffect(() => {
//     if (!userId || !communityId) return;
//     const controller = new AbortController();
//     const fetchInboxes = async () => {
//       const { data } = await supabase
//         .from("community_inbox_conversations")
//         .select(
//           "*, user_low_profile:profiles!community_inbox_conversations_user_low_fkey(full_name, avatar_url, username), user_high_profile:profiles!community_inbox_conversations_user_high_fkey(full_name, avatar_url, username)"
//         )
//         .eq("community_id", communityId)
//         .or(`user_low.eq.${userId},user_high.eq.${userId}`)
//         .order("updated_at", { ascending: false })
//         .abortSignal(controller.signal);
//       if (data)
//         setInboxConversations(
//           data.map((conv) => {
//             const isLow = conv.user_low === userId;
//             const peer = isLow
//               ? conv.user_high_profile
//               : conv.user_low_profile;
//             return {
//               id: conv.id,
//               peerId: isLow ? conv.user_high : conv.user_low,
//               peerName:
//                 peer?.full_name || peer?.username || "Member",
//               peerAvatar: peer?.avatar_url,
//             };
//           })
//         );
//     };
//     fetchInboxes();
//     const ch = supabase
//       .channel(`inbox_list_${communityId}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "community_inbox_conversations",
//           filter: `community_id=eq.${communityId}`,
//         },
//         fetchInboxes
//       )
//       .subscribe();
//     return () => {
//       controller.abort();
//       supabase.removeChannel(ch);
//     };
//   }, [userId, communityId, supabase]);

//   // Realtime subscriptions
//   useEffect(() => {
//     if (!isChatting) return;

//     async function enrich(id: string): Promise<Profile | null> {
//       const { data } = await supabase
//         .from("profiles")
//         .select("full_name, avatar_url, username")
//         .eq("id", id)
//         .maybeSingle();
//       return data;
//     }

//     if (activeConvId) {
//       const ch = supabase
//         .channel(`inbox_messages:${activeConvId}`)
//         .on(
//           "postgres_changes",
//           {
//             event: "INSERT",
//             schema: "public",
//             table: "community_inbox_messages",
//             filter: `conversation_id=eq.${activeConvId}`,
//           },
//           async (raw: { new: Record<string, unknown> }) => {
//             const p = raw.new;
//             if (
//               p.message_type === "call_start" &&
//               p.sender_id !== userId
//             ) {
//               setIncomingCall({
//                 type: p.body === "video" ? "video" : "audio",
//                 sender: p.profiles as Profile,
//                 roomId: p.room_id as string,
//                 convId: p.conversation_id as string,
//               });
//             } else if (
//               p.message_type === "call_signal" &&
//               p.sender_id !== userId
//             ) {
//               handleCallSignal(JSON.parse(p.body as string));
//             } else {
//               const prof = await enrich(String(p.sender_id));
//               upsertMessage({
//                 id: String(p.id),
//                 body: String(p.body ?? ""),
//                 sender_id: String(p.sender_id),
//                 created_at: String(p.created_at),
//                 message_type: String(p.message_type ?? "text"),
//                 thread_id: null,
//                 reactions: p.reactions ?? {},
//                 attachments: p.attachments ?? [],
//                 profiles: prof,
//               });
//             }
//           }
//         )
//         .subscribe();

//       const gi = supabase
//         .channel(`inbox_unread_${communityId}`)
//         .on(
//           "postgres_changes",
//           {
//             event: "INSERT",
//             schema: "public",
//             table: "community_inbox_messages",
//           },
//           (p: { new: Record<string, unknown> }) => {
//             const r = p.new;
//             if (
//               r.sender_id !== userId &&
//               r.conversation_id !== activeConvId
//             ) {
//               const k = `workspace-unread:${r.conversation_id}`;
//               localStorage.setItem(
//                 k,
//                 String(
//                   parseInt(localStorage.getItem(k) || "0", 10) + 1
//                 )
//               );
//               window.dispatchEvent(new Event("storage"));
//             }
//           }
//         )
//         .subscribe();

//       return () => {
//         supabase.removeChannel(ch);
//         supabase.removeChannel(gi);
//       };
//     } else if (roomId) {
//       const ch = supabase
//         .channel(`community_messages:${roomId}`)
//         .on(
//           "postgres_changes",
//           {
//             event: "INSERT",
//             schema: "public",
//             table: "community_messages",
//             filter: `room_id=eq.${roomId}`,
//           },
//           async (raw: { new: Record<string, unknown> }) => {
//             const row = raw.new;
//             if (
//               row.message_type === "call_start" &&
//               row.sender_id !== userId
//             ) {
//               setIncomingCall({
//                 type: row.body === "video" ? "video" : "audio",
//                 sender: await enrich(String(row.sender_id)),
//                 roomId: String(row.room_id),
//               });
//             } else {
//               const tid = row.thread_id as string | null;
//               if (tid) {
//                 if (
//                   threadOpenRef.current &&
//                   threadRootRef.current?.id === tid
//                 )
//                   await loadThread(tid);
//                 return;
//               }
//               const prof = await enrich(String(row.sender_id));
//               upsertMessage({
//                 id: String(row.id),
//                 body: String(row.body ?? ""),
//                 sender_id: String(row.sender_id),
//                 created_at: String(row.created_at),
//                 message_type: String(row.message_type ?? "text"),
//                 thread_id: null,
//                 reactions: row.reactions,
//                 attachments: row.attachments,
//                 profiles: prof,
//                 reply_count: (row.reply_count as number) ?? 0,
//                 is_edited: row.is_edited as boolean,
//                 edited_at: row.edited_at as string,
//                 reply_to_id: row.reply_to_id as string,
//                 reply_to_body: row.reply_to_body as string,
//                 reply_to_sender: row.reply_to_sender as string,
//               });
//             }
//           }
//         )
//         .on(
//           "postgres_changes",
//           {
//             event: "UPDATE",
//             schema: "public",
//             table: "community_messages",
//             filter: `room_id=eq.${roomId}`,
//           },
//           (raw: { new: Record<string, unknown> }) => {
//             const row = raw.new;
//             if (row.is_deleted) {
//               removeMessage(String(row.id));
//               return;
//             }
//             patchMessage(String(row.id), {
//               body: String(row.body ?? ""),
//               reactions: row.reactions,
//               is_edited: row.is_edited as boolean,
//               edited_at: row.edited_at as string,
//               reply_count: row.reply_count as number,
//             });
//           }
//         )
//         .subscribe();

//       const gr = supabase
//         .channel(`rooms_unread_${communityId}`)
//         .on(
//           "postgres_changes",
//           {
//             event: "INSERT",
//             schema: "public",
//             table: "community_messages",
//             filter: `community_id=eq.${communityId}`,
//           },
//           (p: { new: Record<string, unknown> }) => {
//             const r = p.new;
//             if (r.sender_id !== userId && r.room_id !== roomId) {
//               const k = `workspace-unread:${r.room_id}`;
//               localStorage.setItem(
//                 k,
//                 String(
//                   parseInt(localStorage.getItem(k) || "0", 10) + 1
//                 )
//               );
//               window.dispatchEvent(new Event("storage"));
//             }
//           }
//         )
//         .subscribe();

//       return () => {
//         supabase.removeChannel(ch);
//         supabase.removeChannel(gr);
//       };
//     }
//   }, [
//     roomId,
//     activeConvId,
//     isChatting,
//     userId,
//     communityId,
//     loadThread,
//     patchMessage,
//     removeMessage,
//     upsertMessage,
//     supabase,
//     setIncomingCall,
//   ]);

//   useEffect(() => {
//     if (atBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages, atBottom]);

//   useEffect(() => {
//     threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [threadReplies]);

//   useEffect(() => {
//     if (localVideoRef.current && localStream)
//       localVideoRef.current.srcObject = localStream;
//   }, [localStream]);

//   useEffect(() => {
//     if (remoteVideoRef.current && remoteStream)
//       remoteVideoRef.current.srcObject = remoteStream;
//   }, [remoteStream]);

//   // ── WebRTC ─────────────────────────────────────────────────────────────────
//   async function sendCallSignal(
//     type: "audio" | "video" | "call_signal",
//     body?: unknown
//   ) {
//     const ep = activeConvId
//       ? `/api/communities/${slug}/inbox/${activeConvId}/messages`
//       : `/api/messages/${roomId}`;
//     await fetch(ep, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         body:
//           typeof body === "object"
//             ? JSON.stringify(body)
//             : body || type,
//         message_type:
//           type === "call_signal" ? "call_signal" : "call_start",
//       }),
//     });
//   }

//   async function initWebRTC(
//     type: "audio" | "video",
//     isInitiator: boolean
//   ) {
//     const stream = await navigator.mediaDevices.getUserMedia({
//       audio: true,
//       video: type === "video",
//     });
//     if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//     const pc = new RTCPeerConnection({
//       iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
//     });
//     pcRef.current = pc;
//     stream.getTracks().forEach((t) => pc.addTrack(t, stream));
//     pc.ontrack = (ev) => {
//       if (remoteVideoRef.current)
//         remoteVideoRef.current.srcObject = ev.streams[0];
//     };
//     pc.onicecandidate = (ev) => {
//       if (ev.candidate)
//         sendCallSignal("call_signal", { ice: ev.candidate });
//     };
//     if (isInitiator) {
//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);
//       sendCallSignal("call_signal", { sdp: offer });
//     }
//   }

//   async function handleCallSignal(signal: {
//     sdp?: RTCSessionDescriptionInit;
//     ice?: RTCIceCandidateInit;
//   }) {
//     const pc = pcRef.current;
//     if (!pc) return;
//     try {
//       if (signal.sdp) {
//         await pc.setRemoteDescription(
//           new RTCSessionDescription(signal.sdp)
//         );
//         for (const c of iceQueueRef.current)
//           await pc
//             .addIceCandidate(new RTCIceCandidate(c))
//             .catch(console.error);
//         iceQueueRef.current = [];
//         if (signal.sdp.type === "offer") {
//           const ans = await pc.createAnswer();
//           await pc.setLocalDescription(ans);
//           sendCallSignal("call_signal", { sdp: ans });
//         }
//       } else if (signal.ice) {
//         if (pc.remoteDescription)
//           await pc
//             .addIceCandidate(new RTCIceCandidate(signal.ice))
//             .catch(console.error);
//         else iceQueueRef.current.push(signal.ice);
//       }
//     } catch (e) {
//       console.error("WebRTC error", e);
//     }
//   }

//   async function startNativeCall(type: "audio" | "video") {
//     setCallType(type);
//     iceQueueRef.current = [];
//     await sendCallSignal(type);
//     await initWebRTC(type, true);
//   }

//   function handleEndCall() {
//     if (localVideoRef.current?.srcObject) {
//       (localVideoRef.current.srcObject as MediaStream)
//         .getTracks()
//         .forEach((t) => t.stop());
//       localVideoRef.current.srcObject = null;
//     }
//     if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
//     setCallType(null);
//     pcRef.current?.close();
//     pcRef.current = null;
//     iceQueueRef.current = [];
//   }

//   // ── Files ───────────────────────────────────────────────────────────────────
//   async function handleFiles(
//     files: FileList | null,
//     target: "main" | "thread"
//   ) {
//     if (!files?.length) return;
//     setUploading(true);
//     try {
//       for (const file of Array.from(files)) {
//         if (file.size > MAX_FILE_BYTES) continue;
//         const up = await uploadCommunityChatFile(communityId, roomId, file);
//         if (target === "main")
//           setPendingMain((p) =>
//             p.length >= MAX_ATTACH ? p : [...p, up]
//           );
//         else
//           setPendingThread((p) =>
//             p.length >= MAX_ATTACH ? p : [...p, up]
//           );
//       }
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setUploading(false);
//     }
//   }

//   // ── Send ────────────────────────────────────────────────────────────────────
//   async function sendMessage(threadId?: string | null) {
//     const isThread = !!threadId;
//     const t = (isThread ? threadReplyText : text).trim();
//     const queue = isThread ? pendingThread : pendingMain;
//     if ((!t && queue.length === 0) || sending) return;
//     setSending(true);
//     try {
//       const ep = activeConvId
//         ? `/api/communities/${slug}/inbox/${activeConvId}/messages`
//         : `/api/messages/${roomId}`;
//       const res = await fetch(ep, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           body: t,
//           threadId: threadId ?? null,
//           attachments: queue,
//           message_type: deriveMessageType(queue, t),
//           reply_to_id: !isThread && replyingTo ? replyingTo.id : null,
//           reply_to_body:
//             !isThread && replyingTo
//               ? replyingTo.body?.slice(0, 200)
//               : null,
//           reply_to_sender:
//             !isThread && replyingTo
//               ? replyingTo.profiles?.full_name ||
//               replyingTo.profiles?.username ||
//               "Member"
//               : null,
//         }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error);
//       const msg = (data.message || data.row) as Msg;
//       if (msg.thread_id) {
//         setThreadReplies((p) =>
//           p.some((m) => m.id === msg.id)
//             ? p
//             : [...p, msg].sort(
//               (a, b) =>
//                 new Date(a.created_at).getTime() -
//                 new Date(b.created_at).getTime()
//             )
//         );
//         setThreadReplyText("");
//         setPendingThread([]);
//       } else {
//         // FIX: use upsertMessage to prevent duplicate from realtime event
//         upsertMessage(msg);
//         setText("");
//         setPendingMain([]);
//         setReplyingTo(null);
//         setAtBottom(true);
//         requestAnimationFrame(() =>
//           bottomRef.current?.scrollIntoView({ behavior: "smooth" })
//         );
//       }
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setSending(false);
//     }
//   }

//   // ── Voice ───────────────────────────────────────────────────────────────────
//   function pickMime() {
//     if (typeof MediaRecorder === "undefined") return "";
//     for (const c of [
//       "audio/webm;codecs=opus",
//       "audio/webm",
//       "audio/mp4",
//       "audio/mp4;codecs=opus",
//     ])
//       if (MediaRecorder.isTypeSupported(c)) return c;
//     return "";
//   }

//   async function startVoiceRecording() {
//     if (voiceRecording || sending || uploading) return;
//     const mime = pickMime();
//     // FIX: use toast/inline error instead of window.alert
//     if (!mime) {
//       console.error("Voice recording not supported in this browser.");
//       return;
//     }
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         audio: true,
//       });
//       voiceStreamRef.current = stream;
//       voiceChunksRef.current = [];
//       setVoiceSeconds(0);
//       voiceTimerRef.current = setInterval(
//         () => setVoiceSeconds((s) => s + 1),
//         1000
//       );
//       const mr = new MediaRecorder(stream, { mimeType: mime });
//       mediaRecorderRef.current = mr;
//       mr.ondataavailable = (e) => {
//         if (e.data.size) voiceChunksRef.current.push(e.data);
//       };
//       mr.onstop = () => {
//         stream.getTracks().forEach((t) => t.stop());
//         voiceStreamRef.current = null;
//         mediaRecorderRef.current = null;
//         if (voiceTimerRef.current) {
//           clearInterval(voiceTimerRef.current);
//           voiceTimerRef.current = null;
//         }
//         const blob = new Blob(voiceChunksRef.current, { type: mime });
//         voiceChunksRef.current = [];
//         setVoiceRecording(false);
//         if (blob.size >= 100) {
//           setVoiceBlob(blob);
//           setVoiceMime(mime);
//         }
//       };
//       mr.start();
//       setVoiceRecording(true);
//     } catch (e) {
//       console.error("Microphone access denied.", e);
//     }
//   }

//   function stopVoiceRecording() {
//     const mr = mediaRecorderRef.current;
//     if (mr && mr.state === "recording") mr.stop();
//     else {
//       setVoiceRecording(false);
//       if (voiceTimerRef.current) {
//         clearInterval(voiceTimerRef.current);
//         voiceTimerRef.current = null;
//       }
//     }
//   }

//   async function sendVoiceBlob() {
//     if (!voiceBlob || sending) return;
//     setSending(true);
//     try {
//       const ext = voiceMime.includes("mp4") ? "m4a" : "webm";
//       const file = new File(
//         [voiceBlob],
//         `voice-${Date.now()}.${ext}`,
//         { type: voiceBlob.type || voiceMime }
//       );
//       setUploading(true);
//       const up = await uploadCommunityChatFile(communityId, roomId, file);
//       setUploading(false);
//       const ep = activeConvId
//         ? `/api/communities/${slug}/inbox/${activeConvId}/messages`
//         : `/api/messages/${roomId}`;
//       const res = await fetch(ep, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           body: "",
//           threadId: null,
//           attachments: [up],
//           message_type: "audio",
//         }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error);
//       upsertMessage(data.message as Msg);
//       setVoiceBlob(null);
//       setVoiceMime("");
//       setAtBottom(true);
//       setTimeout(scrollToBottom, 50);
//     } catch (e: unknown) {
//       console.error("Voice send failed:", e);
//     } finally {
//       setSending(false);
//     }
//   }

//   async function openThread(m: Msg) {
//     setThreadRoot(m);
//     setThreadOpen(true);
//     await loadThread(m.id);
//   }

//   const appendEmoji = (native: string, target: "main" | "thread") =>
//     target === "main"
//       ? setText((s) => s + native)
//       : setThreadReplyText((s) => s + native);

//   const toggleReaction = useCallback(
//     async (messageId: string, emoji: string) => {
//       try {
//         const ep = activeConvId
//           ? `/api/communities/${slug}/inbox/${activeConvId}/messages/${messageId}/react`
//           : `/api/messages/${roomId}/${messageId}/react`;
//         const res = await fetch(ep, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ emoji }),
//         });
//         const data = await res.json();
//         if (!res.ok) throw new Error(data.error);
//         patchMessage(messageId, { reactions: data.reactions });
//       } catch (e) {
//         console.error(e);
//       }
//     },
//     [roomId, activeConvId, slug, patchMessage]
//   );

//   // FIX: no window.confirm — use ConfirmDialog state instead
//   const deleteMessage = useCallback(
//     (messageId: string) => {
//       setConfirmDelete(messageId);
//     },
//     []
//   );

//   const confirmDeleteAction = useCallback(async () => {
//     if (!confirmDelete) return;
//     const messageId = confirmDelete;
//     setConfirmDelete(null);
//     try {
//       const ep = activeConvId
//         ? `/api/communities/${slug}/inbox/${activeConvId}/messages/${messageId}`
//         : `/api/messages/${roomId}/${messageId}`;
//       const res = await fetch(ep, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ delete: true }),
//       });
//       if (!res.ok) throw new Error((await res.json()).error);
//       removeMessage(messageId);
//     } catch (e) {
//       console.error(e);
//     }
//   }, [confirmDelete, roomId, activeConvId, slug, removeMessage]);

//   const saveEdit = useCallback(async () => {
//     if (!editingMsg) return;
//     const t = editBody.trim();
//     if (!t) return;
//     setEditSaving(true);
//     try {
//       const ep = activeConvId
//         ? `/api/communities/${slug}/inbox/${activeConvId}/messages/${editingMsg.id}`
//         : `/api/messages/${roomId}/${editingMsg.id}`;
//       const res = await fetch(ep, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ body: t }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error);
//       patchMessage(editingMsg.id, data.message as Msg);
//       setEditingMsg(null);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setEditSaving(false);
//     }
//   }, [editingMsg, editBody, roomId, activeConvId, slug, patchMessage]);

//   const filteredMessages = useMemo(() => {
//     let list = messages.filter(
//       (m) =>
//         m.message_type !== "call_signal" &&
//         m.message_type !== "call_start"
//     );
//     if (chatFilter === "media")
//       list = list.filter(
//         (m) =>
//           parseAttachments(m.attachments).length > 0 ||
//           ["image", "file", "audio"].includes(m.message_type)
//       );
//     const q = searchQuery.trim().toLowerCase();
//     if (!q) return list;
//     return list.filter(
//       (m) =>
//         (m.body || "").toLowerCase().includes(q) ||
//         (m.profiles?.full_name || "").toLowerCase().includes(q) ||
//         (m.profiles?.username || "").toLowerCase().includes(q)
//     );
//   }, [messages, searchQuery, chatFilter]);

//   const grouped = useMemo(() => {
//     const rows: { day: Date; items: Msg[] }[] = [];
//     for (const m of filteredMessages) {
//       const d = new Date(m.created_at);
//       const last = rows[rows.length - 1];
//       if (!last || !isSameDay(last.day, d)) rows.push({ day: d, items: [m] });
//       else last.items.push(m);
//     }
//     return rows;
//   }, [filteredMessages]);

//   const onScrollMain = useCallback(() => {
//     const el = scrollRef.current;
//     if (!el) return;
//     setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 100);
//   }, []);

//   // ─── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="flex flex-1 h-full min-h-screen max-h-screen font-sans overflow-hidden">
//       {/* FIX: ConfirmDialog replaces window.confirm */}
//       <ConfirmDialog
//         open={!!confirmDelete}
//         title="Delete message"
//         description="This message will be permanently deleted for everyone."
//         onConfirm={confirmDeleteAction}
//         onCancel={() => setConfirmDelete(null)}
//       />

//       {/* Active call overlay */}
//       {callType && (
//         <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0b141a] text-white">
//           <div className="flex flex-col items-center gap-6 w-full max-w-sm px-6">
//             <div className="h-[110px] w-[110px] rounded-full flex items-center justify-center bg-[#233138] text-[38px] overflow-hidden">
//               {activeConvPeer?.avatar ? (
//                 <img
//                   src={activeConvPeer.avatar}
//                   className="w-full h-full object-cover"
//                   alt=""
//                 />
//               ) : (
//                 <span>
//                   {(activeConvPeer?.name || roomName)[0]}
//                 </span>
//               )}
//             </div>
//             <div className="text-center">
//               <h2 className="text-2xl font-bold">
//                 {activeConvPeer?.name || roomName}
//               </h2>
//               <p className="text-[#8696a0] mt-1">
//                 {callType === "video"
//                   ? "Video calling…"
//                   : "Audio calling…"}
//               </p>
//             </div>
//             <div className="w-full h-72 bg-[#233138] rounded-xl overflow-hidden relative border border-white/10">
//               {remoteStream && (
//                 <video
//                   autoPlay
//                   playsInline
//                   ref={remoteVideoRef}
//                   className="w-full h-full object-cover"
//                 />
//               )}
//               {localStream && (
//                 <video
//                   autoPlay
//                   playsInline
//                   muted
//                   ref={localVideoRef}
//                   className={cn(
//                     "absolute bottom-3 right-3 w-24 h-36 bg-black rounded-lg border border-white/20 object-cover",
//                     !remoteStream &&
//                     "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-56"
//                   )}
//                 />
//               )}
//               {!remoteStream && !localStream && (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
//                   <div className="w-14 h-14 rounded-full flex items-center justify-center animate-pulse bg-[#00a884]">
//                     {callType === "video" ? (
//                       <Video className="h-7 w-7" />
//                     ) : (
//                       <Phone className="h-7 w-7" />
//                     )}
//                   </div>
//                   <p className="text-sm text-white/70">Connecting…</p>
//                 </div>
//               )}
//             </div>
//             <div className="mt-4">
//               <button
//                 onClick={handleEndCall}
//                 aria-label="End call"
//                 className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all"
//               >
//                 <Phone className="h-8 w-8 rotate-[135deg]" />
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       <ChatEmojiPickerDialog
//         open={emojiOpen}
//         onOpenChange={setEmojiOpen}
//         onSelect={(n) =>
//           appendEmoji(n, threadOpen && threadRoot ? "thread" : "main")
//         }
//       />

//       {/* Edit dialog */}
//       <Dialog
//         open={!!editingMsg}
//         onOpenChange={(o) => !o && setEditingMsg(null)}
//       >
//         <DialogContent className="z-[10051] max-w-md">
//           <DialogHeader>
//             <DialogTitle className="text-base font-semibold">
//               Edit message
//             </DialogTitle>
//           </DialogHeader>
//           <Textarea
//             value={editBody}
//             onChange={(e) => setEditBody(e.target.value)}
//             rows={4}
//             className="mt-2 rounded-sm"
//           />
//           <div className="mt-4 flex justify-end gap-2">
//             <Button
//               variant="outline"
//               className="rounded-sm"
//               onClick={() => setEditingMsg(null)}
//             >
//               Cancel
//             </Button>
//             <Button
//               className="rounded-sm font-semibold text-white bg-[#00a884] hover:bg-[#009070]"
//               disabled={editSaving || !editBody.trim()}
//               onClick={() => void saveEdit()}
//             >
//               {editSaving ? (
//                 <Loader2 className="h-4 w-4 animate-spin" />
//               ) : (
//                 "Save"
//               )}
//             </Button>
//           </div>
//         </DialogContent>
//       </Dialog>

//       <div
//         className={cn(
//           "w-[360px] shrink-0 flex-col bg-white border-r border-[#d1d7db]",
//           isChatting ? "hidden md:flex" : "flex"
//         )}
//       >
//         <div className="flex items-center justify-between px-4 py-[10px] bg-[#f0f2f5] min-h-[59px]">
//           <span className="font-bold text-[19px] text-[#111b21]">
//             Chats
//           </span>
//           <button
//             aria-label="More options"
//             className="h-8 w-8 flex items-center justify-center rounded-sm text-[#667781]"
//           >
//             <MoreHorizontal size={18} />
//           </button>
//         </div>

//         {/* Search */}
//         <div
//           className="px-3 py-2 bg-white border-b border-[#d1d7db] cursor-pointer"
//           onClick={() => setSidebarFilter("inbox")}
//         >
//           <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-lg px-3 py-2 hover:bg-[#ebebeb] transition-colors">
//             <Search className="h-4 w-4 shrink-0 text-[#667781]" />
//             <span className="flex-1 text-sm text-[#667781]">
//               Search or browse members
//             </span>
//           </div>
//         </div>

//         {/* Filter bar */}
//         <div className="flex gap-1.5 px-3 py-2 bg-white border-b border-[#d1d7db] overflow-x-auto scrollbar-hide">
//           {(
//             ["all", "unread", "group", "inbox", "calls"] as const
//           ).map((f) => (
//             <button
//               key={f}
//               className={cn(
//                 "px-3.5 py-[5px] rounded-full text-[13px] font-medium whitespace-nowrap transition-all",
//                 sidebarFilter === f
//                   ? "bg-[#d9fdd3] text-[#008069] font-semibold"
//                   : "bg-[#f0f2f5] text-[#667781]"
//               )}
//               onClick={() => setSidebarFilter(f)}
//             >
//               {f.charAt(0).toUpperCase() + f.slice(1)}
//             </button>
//           ))}
//         </div>

//         {/* Chat list */}
//         <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#d1d7db]">
//           {(sidebarFilter === "all" ||
//             sidebarFilter === "group" ||
//             sidebarFilter === "unread") &&
//             allChatRooms.map((r) => {
//               const ur = unreadCounts[r.id] || 0;
//               if (sidebarFilter === "unread" && ur === 0) return null;
//               return (
//                 <div
//                   key={r.id}
//                   className={cn(
//                     "flex items-center gap-3 px-4 py-[10px] cursor-pointer border-b border-[#d1d7db] transition-colors min-h-[72px]",
//                     r.id === roomId && !activeConvId
//                       ? "bg-[#ebebeb]"
//                       : "hover:bg-[#f5f6f6]"
//                   )}
//                   onClick={() => {
//                     setActiveConvId(null);
//                     setActiveConvPeer(null);
//                     setForceShowList(false);
//                     router.push(
//                       `/c/${slug}/workspace?space=${r.spaceId}&room=${r.id}`
//                     );
//                   }}
//                 >
//                   <div className="h-[49px] w-[49px] rounded-full flex items-center justify-center font-bold text-[18px] shrink-0 bg-[#dfe5e7] text-[#3b4a54] uppercase overflow-hidden">
//                     {r.name.slice(0, 2)}
//                   </div>
//                   <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
//                     <div className="flex items-center justify-between gap-1.5">
//                       <span className="font-medium text-[15px] text-[#111b21] truncate flex-1">
//                         #{r.name}
//                       </span>
//                       {ur > 0 && (
//                         <span className="bg-[#00a884] text-white rounded-full text-[11px] font-bold px-1.5 py-px shrink-0">
//                           {ur}
//                         </span>
//                       )}
//                     </div>
//                     <div className="text-[13px] text-[#667781] truncate">
//                       Community channel
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}

//           {(sidebarFilter === "all" || sidebarFilter === "unread") &&
//             inboxConversations.map((conv) => {
//               const ur = unreadCounts[conv.id] || 0;
//               if (sidebarFilter === "unread" && ur === 0) return null;
//               return (
//                 <div
//                   key={conv.id}
//                   className={cn(
//                     "flex items-center gap-3 px-4 py-[10px] cursor-pointer border-b border-[#d1d7db] transition-colors min-h-[72px]",
//                     activeConvId === conv.id
//                       ? "bg-[#ebebeb]"
//                       : "hover:bg-[#f5f6f6]"
//                   )}
//                   onClick={() => {
//                     setActiveConvId(conv.id);
//                     setActiveConvPeer({
//                       name: conv.peerName,
//                       avatar: conv.peerAvatar,
//                     });
//                     setForceShowList(false);
//                   }}
//                 >
//                   <div className="h-[49px] w-[49px] rounded-full shrink-0 overflow-hidden bg-[#dfe5e7] flex items-center justify-center font-bold text-[18px] text-[#3b4a54]">
//                     {conv.peerAvatar ? (
//                       <img
//                         src={conv.peerAvatar}
//                         className="w-full h-full object-cover"
//                         alt=""
//                       />
//                     ) : (
//                       <span>{conv.peerName[0]}</span>
//                     )}
//                   </div>
//                   <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
//                     <div className="flex items-center justify-between gap-1.5">
//                       <span className="font-medium text-[15px] text-[#111b21] truncate flex-1">
//                         {conv.peerName}
//                       </span>
//                       {ur > 0 && (
//                         <span className="bg-[#00a884] text-white rounded-full text-[11px] font-bold px-1.5 py-px shrink-0">
//                           {ur}
//                         </span>
//                       )}
//                     </div>
//                     <div className="text-[13px] text-[#667781] truncate">
//                       Private message
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}

//           {sidebarFilter === "inbox" &&
//             (sidebarMembers.length === 0 ? (
//               <p className="px-4 py-6 text-center text-[13px] text-[#667781]">
//                 No members found.
//               </p>
//             ) : (
//               sidebarMembers.map((m) => {
//                 const name =
//                   m.profile?.full_name ||
//                   m.profile?.username ||
//                   "Member";
//                 const av = m.profile?.avatar_url;
//                 const isMe = m.user_id === userId;
//                 return (
//                   <div
//                     key={m.user_id}
//                     className={cn(
//                       "flex items-center gap-3 px-4 py-[10px] border-b border-[#d1d7db] min-h-[72px] transition-colors",
//                       isMe
//                         ? "cursor-default opacity-70"
//                         : "cursor-pointer hover:bg-[#f5f6f6]"
//                     )}
//                     onClick={async () => {
//                       if (isMe) return;
//                       try {
//                         const res = await fetch(
//                           `/api/communities/${slug}/inbox`,
//                           {
//                             method: "POST",
//                             headers: {
//                               "Content-Type": "application/json",
//                             },
//                             body: JSON.stringify({
//                               peerUserId: m.user_id,
//                             }),
//                           }
//                         );
//                         const data = await res.json();
//                         if (res.ok && data.conversationId) {
//                           setActiveConvId(data.conversationId);
//                           setActiveConvPeer({
//                             name,
//                             avatar: av ?? null,
//                           });
//                           setForceShowList(false);
//                           setSidebarFilter("all");
//                         }
//                       } catch (e) {
//                         console.error(e);
//                       }
//                     }}
//                   >
//                     <div className="h-[49px] w-[49px] rounded-full shrink-0 overflow-hidden bg-[#dfe5e7] flex items-center justify-center font-bold text-[18px] text-[#3b4a54] uppercase">
//                       {av ? (
//                         <img
//                           src={av}
//                           className="w-full h-full object-cover"
//                           alt=""
//                         />
//                       ) : (
//                         <span>{name[0]?.toUpperCase()}</span>
//                       )}
//                     </div>
//                     <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
//                       <div className="flex items-center justify-between gap-1.5">
//                         <span className="font-medium text-[15px] text-[#111b21] truncate flex-1">
//                           {name}
//                         </span>
//                         {m.role === "owner" && (
//                           <span className="text-[10px] font-bold text-[#00a884]">
//                             Owner
//                           </span>
//                         )}
//                         {m.role === "admin" && (
//                           <span className="text-[10px] font-bold text-orange-400">
//                             Admin
//                           </span>
//                         )}
//                       </div>
//                       <div className="text-[13px] text-[#667781] truncate">
//                         {isMe ? "You" : "Tap to message"}
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })
//             ))}
//         </div>
//       </div>

//       {/* ── Main panel ── */}
//       <div
//         className={cn(
//           "flex-1 flex flex-col min-w-0 relative h-full bg-red-400",
//           // FIX: Tailwind replaces the CSS string media query
//           isChatting ? "flex" : "hidden md:flex"
//         )}
//       >
//         {/* Mobile back button */}
//         {isChatting && (
//           <div className="md:hidden absolute left-3 top-2.5 z-30">
//             <button
//               type="button"
//               aria-label="Back to chat list"
//               className="flex h-10 w-10 items-center justify-center rounded-sm bg-white shadow-sm text-[#00a884]"
//               onClick={() => setForceShowList(true)}
//             >
//               <ChevronLeft size={24} />
//             </button>
//           </div>
//         )}

//         {/* Call buttons when hideHeader */}
//         {(activeConvId || roomId) && hideHeader && (
//           <div className="absolute right-4 top-2.5 z-30 flex items-center gap-2">
//             <button
//               onClick={() => startNativeCall("audio")}
//               aria-label="Audio call"
//               className="flex h-10 w-10 items-center justify-center rounded-sm bg-white border border-[#d1d7db] hover:scale-105 transition-all"
//             >
//               <Phone className="h-4 w-4 text-[#00a884]" />
//             </button>
//             <button
//               onClick={() => startNativeCall("video")}
//               aria-label="Video call"
//               className="flex h-10 w-10 items-center justify-center rounded-sm bg-white border border-[#d1d7db] hover:scale-105 transition-all"
//             >
//               <Video className="h-4 w-4 text-[#00a884]" />
//             </button>
//           </div>
//         )}

//         {/* Header */}
//         {!hideHeader && (
//           <header
//             className={cn(
//               "flex items-center gap-3 px-4 py-[10px] bg-[#f0f2f5] border-b border-[#d1d7db] min-h-[59px] z-10",
//               isChatting && "pl-14"
//             )}
//           >
//             <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-[15px] overflow-hidden bg-[#dfe5e7] text-[#3b4a54] shrink-0">
//               {activeConvId ? (
//                 activeConvPeer?.avatar ? (
//                   <img
//                     src={activeConvPeer.avatar}
//                     className="w-full h-full object-cover"
//                     alt=""
//                   />
//                 ) : (
//                   <span>{activeConvPeer?.name[0]}</span>
//                 )
//               ) : (
//                 roomName.slice(0, 2)
//               )}
//             </div>
//             <div className="flex-1 min-w-0">
//               <p className="text-[15px] font-semibold text-[#111b21] truncate">
//                 {activeConvId
//                   ? activeConvPeer?.name
//                   : `#${roomName}`}
//               </p>
//               <p className="text-[12px] text-[#00a884]">
//                 {activeConvId ? "Online" : "● Live"}
//               </p>
//             </div>
//             <div className="flex items-center gap-1">
//               {(activeConvId || roomId) && (
//                 <>
//                   <WaIconBtn
//                     aria-label="Audio call"
//                     onClick={() => startNativeCall("audio")}
//                   >
//                     <Phone className="h-5 w-5" />
//                   </WaIconBtn>
//                   <WaIconBtn
//                     aria-label="Video call"
//                     onClick={() => startNativeCall("video")}
//                   >
//                     <Video className="h-5 w-5" />
//                   </WaIconBtn>
//                 </>
//               )}
//               <WaIconBtn
//                 aria-label="Search messages"
//                 onClick={() => setSearchOpen((s) => !s)}
//                 active={searchOpen}
//               >
//                 <Search className="h-5 w-5" />
//               </WaIconBtn>
//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <WaIconBtn aria-label="More options">
//                     <MoreVertical className="h-5 w-5" />
//                   </WaIconBtn>
//                 </DropdownMenuTrigger>
//                 <DropdownMenuContent
//                   align="end"
//                   className="z-[10055] min-w-[11rem]"
//                 >
//                   <DropdownMenuItem
//                     onClick={() =>
//                       void navigator.clipboard.writeText(
//                         typeof window !== "undefined"
//                           ? window.location.href
//                           : ""
//                       )
//                     }
//                   >
//                     <Copy className="mr-2 h-4 w-4" /> Copy link
//                   </DropdownMenuItem>
//                   {(["all", "media"] as const).map((key) => (
//                     <DropdownMenuItem
//                       key={key}
//                       onClick={() => setChatFilter(key)}
//                     >
//                       {chatFilter === key ? (
//                         <Check
//                           className="mr-2 h-4 w-4 text-[#00a884]"
//                         />
//                       ) : (
//                         <span className="mr-2 h-4 w-4 inline-block" />
//                       )}
//                       {key === "all" ? "All messages" : "Media & files"}
//                     </DropdownMenuItem>
//                   ))}
//                 </DropdownMenuContent>
//               </DropdownMenu>
//             </div>
//           </header>
//         )}

//         {/* Search bar */}
//         {searchOpen && (
//           <div className="flex shrink-0 items-center gap-2 px-3 py-2 bg-[#f0f2f5] border-b border-[#d1d7db]">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-[#667781]" />
//               <input
//                 type="search"
//                 placeholder="Search messages…"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 autoFocus
//                 className="w-full rounded-lg border-0 py-2 pl-10 pr-4 text-sm outline-none bg-[#f0f2f5] text-[#111b21]"
//               />
//             </div>
//             <button
//               type="button"
//               className="text-sm font-semibold shrink-0 text-[#00a884]"
//               onClick={() => {
//                 setSearchOpen(false);
//                 setSearchQuery("");
//               }}
//             >
//               Cancel
//             </button>
//           </div>
//         )}

//         {/* Messages — FIX: role="log" + aria-live for accessibility */}
//         <div
//           ref={scrollRef}
//           onScroll={onScrollMain}
//           role="log"
//           aria-live="polite"
//           aria-label="Messages"
//           // className="flex-1 min-h-0 overflow-y-auto px-[5%] py-3 pb-5 bg-[#efeae2] flex flex-col scrollbar-thin scrollbar-thumb-[#c1c9cd]"
//           className={`bg-[#efeae2] overflow-scroll px-[5%] py-3 pb-5 flex-1 min-h-0 flex flex-col scrollbar-thin scrollbar-thumb-[#c1c9cd] ${loading ? "scroll-hidden" : "scroll-auto"
//             }`}
//         >
//           {loading ? (
//             <ChatSkeleton />
//           ) : messages.length === 0 ? (
//             <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center">
//               <p className="text-sm font-semibold text-[#111b21]">
//                 Start the conversation
//               </p>
//               <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#667781]">
//                 Type a message below.
//               </p>
//             </div>
//           ) : filteredMessages.length === 0 ? (
//             <p className="py-12 text-center text-sm text-[#667781]">
//               No messages match your search.
//             </p>
//           ) : (
//             grouped.map((g) => (
//               <div key={g.day.toISOString()}>
//                 {/* Date separator */}
//                 <div className="flex justify-center my-2 mb-4">
//                   <span className="bg-white text-[#3b4a54] px-3 py-[5px] rounded-md text-[12px] font-medium shadow-sm">
//                     {format(g.day, "MMM d, yyyy")}
//                   </span>
//                 </div>
//                 <div className="space-y-0.5">
//                   {g.items.map((m) =>
//                     m.message_type === "system" ? (
//                       <p
//                         key={m.id}
//                         className="py-1 text-center text-xs text-[#667781]"
//                       >
//                         {m.body}
//                       </p>
//                     ) : (
//                       <MessageRow
//                         key={m.id}
//                         m={m}
//                         isOwn={
//                           !!userId && m.sender_id === userId
//                         }
//                         userId={userId}
//                         isDM={!!activeConvId}
//                         onOpenThread={() => openThread(m)}
//                         onToggleReaction={toggleReaction}
//                         onDelete={deleteMessage}
//                         onEdit={(msg) => {
//                           setEditingMsg(msg);
//                           setEditBody(msg.body);
//                         }}
//                         onReply={(msg) => setReplyingTo(msg)}
//                       />
//                     )
//                   )}
//                 </div>
//               </div>
//             ))
//           )}

//           {/* Scroll to bottom button */}
//           {!atBottom && !loading && messages.length > 0 && (
//             <div className="pointer-events-none sticky bottom-2 z-10 flex justify-center">
//               <button
//                 type="button"
//                 aria-label="Scroll to latest message"
//                 onClick={() => scrollToBottom()}
//                 className="pointer-events-auto h-10 w-10 flex items-center justify-center rounded-full shadow-sm bg-[#f0f2f5] text-[#00a884] border border-[#d1d7db]"
//               >
//                 <ChevronDown className="h-5 w-5" />
//               </button>
//             </div>
//           )}
//           {/* <div ref={bottomRef} /> */}
//         </div>

//         {/* ── Input zone ── */}
//         <div className="flex flex-col shrink-0 bg-[#f0f2f5] border-t border-[#d1d7db]">
//           {replyingTo && (
//             <ReplyBar
//               msg={replyingTo}
//               onClose={() => setReplyingTo(null)}
//             />
//           )}

//           {voiceBlob && !voiceRecording && (
//             <div className="px-3 pt-2 pb-1">
//               <VoicePreview
//                 blob={voiceBlob}
//                 onSend={sendVoiceBlob}
//                 onDiscard={() => {
//                   setVoiceBlob(null);
//                   setVoiceMime("");
//                 }}
//                 sending={sending}
//               />
//             </div>
//           )}

//           {/* Recording bar */}
//           {voiceRecording && (
//             <div className="flex items-center gap-3 px-4 py-3">
//               <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
//                 <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-75" />
//                 <Mic className="h-5 w-5 relative z-10 text-red-500" />
//               </div>
//               <div className="flex flex-1 items-center gap-2 overflow-hidden">
//                 <span className="text-sm font-bold tabular-nums shrink-0 text-red-500 min-w-[36px]">
//                   {formatDuration(voiceSeconds)}
//                 </span>
//                 <div className="flex items-end gap-[2px] h-6 flex-1 overflow-hidden">
//                   {[...Array(22)].map((_, i) => (
//                     <div
//                       key={i}
//                       className="shrink-0 w-[3px] rounded-full bg-red-400"
//                       style={{
//                         height: `${28 +
//                           Math.sin((i + voiceSeconds * 3) * 0.7) * 22 +
//                           Math.cos(
//                             (i * 1.3 + voiceSeconds) * 0.9
//                           ) *
//                           12
//                           }%`,
//                         opacity: 0.55 + (i % 4) * 0.1,
//                         transition: "height 0.15s ease",
//                       }}
//                     />
//                   ))}
//                 </div>
//                 <span className="text-[11px] shrink-0 ml-1 text-[#667781]">
//                   Recording…
//                 </span>
//               </div>
//               <button
//                 type="button"
//                 onClick={stopVoiceRecording}
//                 aria-label="Stop recording"
//                 className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow"
//               >
//                 <StopCircle className="h-5 w-5" />
//               </button>
//             </div>
//           )}

//           {/* Normal input */}
//           {!voiceRecording && !voiceBlob && (
//             <div className="flex items-end gap-1 px-3 py-[9px] min-h-[62px] pb-[max(9px,env(safe-area-inset-bottom,0px))]">
//               <WaIconBtn
//                 aria-label="Emoji picker"
//                 onClick={() => setEmojiOpen(true)}
//               >
//                 <Smile className="h-6 w-6" />
//               </WaIconBtn>

//               <div className="flex items-center gap-0.5">
//                 <label
//                   htmlFor="wa-img-input"
//                   className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-sm hover:bg-black/5"
//                   aria-label="Attach image"
//                 >
//                   <ImageIcon className="h-5 w-5 text-[#667781]" />
//                 </label>
//                 <input
//                   id="wa-img-input"
//                   type="file"
//                   accept="image/*"
//                   className="hidden"
//                   onChange={(e) => handleFiles(e.target.files, "main")}
//                 />
//                 <label
//                   htmlFor="wa-file-input"
//                   className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-sm hover:bg-black/5"
//                   aria-label="Attach file"
//                 >
//                   <FileIcon className="h-5 w-5 text-[#667781]" />
//                 </label>
//                 <input
//                   id="wa-file-input"
//                   type="file"
//                   className="hidden"
//                   onChange={(e) => handleFiles(e.target.files, "main")}
//                 />
//               </div>

//               <div className="flex flex-col flex-1 min-w-0">
//                 {pendingMain.length > 0 && (
//                   <div className="flex flex-wrap gap-1.5 px-1 py-1.5 mb-1 rounded-sm bg-black/[0.04]">
//                     {pendingMain.map((a, i) => (
//                       <div
//                         key={a.url}
//                         className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-sm text-[11px] font-medium border border-[#d1d7db]"
//                       >
//                         <FileIcon
//                           size={11}
//                           className="text-[#00a884]"
//                         />
//                         <span className="truncate max-w-[90px]">
//                           {a.name}
//                         </span>
//                         <button
//                           type="button"
//                           aria-label={`Remove ${a.name}`}
//                           onClick={() =>
//                             setPendingMain((p) =>
//                               p.filter((_, j) => j !== i)
//                             )
//                           }
//                         >
//                           <X size={12} className="hover:text-red-500" />
//                         </button>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//                 <div className="flex items-center bg-white rounded-lg px-3 py-2.5">
//                   <Textarea
//                     value={text}
//                     onChange={(e) => setText(e.target.value)}
//                     placeholder="Type a message"
//                     rows={1}
//                     className="max-h-32 min-h-[24px] w-full resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 text-[#111b21]"
//                     onKeyDown={(e) => {
//                       if (e.key === "Enter" && !e.shiftKey) {
//                         e.preventDefault();
//                         sendMessage();
//                       }
//                     }}
//                   />
//                 </div>
//               </div>

//               {text.trim() || pendingMain.length > 0 ? (
//                 <button
//                   type="button"
//                   disabled={sending}
//                   aria-label="Send message"
//                   onClick={() => sendMessage()}
//                   className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {sending ? (
//                     <Loader2 className="h-5 w-5 animate-spin" />
//                   ) : (
//                     <Send className="h-5 w-5" />
//                   )}
//                 </button>
//               ) : (
//                 <button
//                   type="button"
//                   disabled={sending || uploading}
//                   aria-label="Record voice message"
//                   onClick={() => void startVoiceRecording()}
//                   className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <Mic className="h-6 w-6" />
//                 </button>
//               )}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ── Thread panel ── */}
//       {threadOpen && threadRoot && (
//         <aside className="flex w-full shrink-0 flex-col min-h-0 absolute inset-0 z-30 lg:static lg:inset-auto lg:z-auto lg:w-[360px] bg-white border-l border-[#d1d7db]">
//           <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-[#f0f2f5] border-b border-[#d1d7db]">
//             <div>
//               <span className="text-sm font-semibold text-[#111b21]">
//                 Thread
//               </span>
//               <p className="text-xs text-[#667781]">
//                 {threadReplies.length} repl
//                 {threadReplies.length === 1 ? "y" : "ies"}
//               </p>
//             </div>
//             <button
//               type="button"
//               aria-label="Close thread"
//               className="h-8 w-8 flex items-center justify-center rounded-sm text-[#667781] hover:bg-black/5"
//               onClick={() => setThreadOpen(false)}
//             >
//               <X className="h-5 w-5" />
//             </button>
//           </div>

//           <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-[#efeae2]">
//             <MessageRow
//               m={threadRoot}
//               isOwn={!!userId && threadRoot.sender_id === userId}
//               userId={userId}
//               onOpenThread={() => { }}
//               onToggleReaction={toggleReaction}
//               onDelete={deleteMessage}
//               onEdit={(msg) => {
//                 setEditingMsg(msg);
//                 setEditBody(msg.body);
//               }}
//               onReply={(msg) => {
//                 setReplyingTo(msg);
//                 setThreadOpen(false);
//               }}
//             />
//             <div
//               className="pt-2 space-y-1 border-t border-[#d1d7db]"
//             >
//               {threadReplies.map((r) => (
//                 <MessageRow
//                   key={r.id}
//                   m={r}
//                   compact
//                   isOwn={!!userId && r.sender_id === userId}
//                   userId={userId}
//                   onOpenThread={() => { }}
//                   onToggleReaction={toggleReaction}
//                   onDelete={deleteMessage}
//                   onEdit={(msg) => {
//                     setEditingMsg(msg);
//                     setEditBody(msg.body);
//                   }}
//                   onReply={() => { }}
//                 />
//               ))}
//               <div ref={threadBottomRef} />
//             </div>
//           </div>

//           <div className="border-t border-[#d1d7db] p-3 space-y-2 shrink-0 bg-[#f0f2f5] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
//             <input
//               ref={threadFileRef}
//               type="file"
//               className="hidden"
//               onChange={(e) => handleFiles(e.target.files, "thread")}
//             />
//             {pendingThread.length > 0 && (
//               <div className="flex flex-wrap gap-1.5">
//                 {pendingThread.map((a, i) => (
//                   <span
//                     key={`${a.url}-${i}`}
//                     className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-sm bg-white border border-[#d1d7db] text-[#111b21]"
//                   >
//                     <FileIcon className="h-3 w-3" />
//                     <span className="truncate max-w-[120px]">
//                       {a.name}
//                     </span>
//                     <button
//                       type="button"
//                       aria-label={`Remove ${a.name}`}
//                       onClick={() =>
//                         setPendingThread((p) =>
//                           p.filter((_, j) => j !== i)
//                         )
//                       }
//                     >
//                       <X className="h-3 w-3" />
//                     </button>
//                   </span>
//                 ))}
//               </div>
//             )}
//             <div className="flex items-end gap-2">
//               <WaIconBtn
//                 aria-label="Attach file to thread"
//                 onClick={() => threadFileRef.current?.click()}
//                 disabled={pendingThread.length >= MAX_ATTACH}
//               >
//                 <Paperclip className="h-5 w-5" />
//               </WaIconBtn>
//               <WaIconBtn
//                 aria-label="Emoji picker"
//                 onClick={() => setEmojiOpen(true)}
//               >
//                 <Smile className="h-5 w-5" />
//               </WaIconBtn>
//               <div className="flex-1 rounded-lg px-4 py-2 bg-white border border-[#d1d7db]">
//                 <Textarea
//                   rows={2}
//                   placeholder="Reply in thread…"
//                   className="w-full resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 text-[#111b21]"
//                   value={threadReplyText}
//                   onChange={(e) => setThreadReplyText(e.target.value)}
//                   onKeyDown={(e) => {
//                     if (e.key === "Enter" && !e.shiftKey) {
//                       e.preventDefault();
//                       sendMessage(threadRoot.id);
//                     }
//                   }}
//                 />
//               </div>
//               <button
//                 type="button"
//                 aria-label="Send thread reply"
//                 className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-50"
//                 onClick={() => sendMessage(threadRoot.id)}
//                 disabled={
//                   sending ||
//                   (!threadReplyText.trim() &&
//                     pendingThread.length === 0)
//                 }
//               >
//                 {sending ? (
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                 ) : (
//                   <Send className="h-4 w-4" />
//                 )}
//               </button>
//             </div>
//           </div>
//         </aside>
//       )}

//       {/* ── Incoming call ── */}
//       {incomingCall && (
//         <div className="fixed inset-0 z-[30000] flex flex-col items-center justify-center bg-black/90 text-white">
//           <div className="flex flex-col items-center gap-6 max-w-sm w-full p-8 rounded-2xl bg-[#233138] border border-white/10">
//             <div className="h-[100px] w-[100px] rounded-full flex items-center justify-center text-[30px] bg-[#00a884] text-white overflow-hidden">
//               {incomingCall.sender?.avatar_url?.trim() ? (
//                 <img
//                   src={incomingCall.sender.avatar_url}
//                   className="w-full h-full object-cover"
//                   alt=""
//                 />
//               ) : (
//                 <span>
//                   {incomingCall.sender?.full_name?.[0] || "I"}
//                 </span>
//               )}
//             </div>
//             <div className="text-center">
//               <h3 className="text-xl font-bold">
//                 {incomingCall.sender?.full_name ||
//                   incomingCall.sender?.username ||
//                   "Someone"}
//               </h3>
//               <p className="font-bold mt-1 uppercase tracking-widest text-[11px] text-[#00a884]">
//                 Incoming {incomingCall.type} Call…
//               </p>
//             </div>
//             <div className="flex items-center gap-8 mt-4">
//               <button
//                 aria-label="Decline call"
//                 onClick={() => setIncomingCall(null)}
//                 className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all"
//               >
//                 <X className="h-6 w-6" />
//               </button>
//               <button
//                 aria-label="Accept call"
//                 onClick={() => {
//                   setCallType(incomingCall.type);
//                   setIncomingCall(null);
//                   iceQueueRef.current = [];
//                   initWebRTC(incomingCall.type, false);
//                 }}
//                 className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 animate-bounce bg-[#00a884]"
//               >
//                 {incomingCall.type === "audio" ? (
//                   <Phone className="h-7 w-7" />
//                 ) : (
//                   <Video className="h-7 w-7" />
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }