"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { format, isSameDay } from "date-fns";
import {
  ChevronDown,
  ChevronLeft,
  Copy,
  FileIcon,
  ImageIcon,
  Loader2,
  Mic,
  MoreVertical,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Reply,
  Search,
  Send,
  Smile,
  StopCircle,
  Trash2,
  X,
  Phone,
  Video,
  Check,
  CheckCheck,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/components/community/workspace-context";
import { useCall } from "@/components/community/call-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { uploadCommunityChatFile, type ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { ChatEmojiPickerDialog } from "@/components/community/chat/chat-emoji-picker-dialog";
import { useRouter } from "next/navigation";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type Profile = { full_name: string | null; avatar_url: string | null; username: string | null };

type Msg = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  thread_id: string | null;
  reactions: unknown;
  attachments?: unknown;
  profiles?: Profile | null;
  reply_count?: number | null;
  is_edited?: boolean | null;
  edited_at?: string | null;
  // WhatsApp-style inline reply fields
  reply_to_id?: string | null;
  reply_to_body?: string | null;
  reply_to_sender?: string | null;
};

const QUICK_REACTIONS = ["ðŸ‘", "â¤ï¸", "ðŸ˜‚", "ðŸ”¥"] as const;
const MAX_ATTACH = 6;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function parseAttachments(raw: unknown): { url: string; name?: string; mime?: string }[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is { url: string; name?: string; mime?: string } =>
      typeof x === "object" && x !== null && "url" in x &&
      typeof (x as { url: unknown }).url === "string"
  );
}

function deriveMessageType(atts: ChatAttachmentPayload[], body: string): string {
  if (atts.length === 0) return "text";
  const allImg = atts.every((a) => a.mime.startsWith("image/"));
  const allAudio = atts.every((a) => a.mime.startsWith("audio/"));
  if (body.trim()) return "text";
  if (allImg) return "image";
  if (allAudio) return "audio";
  return "file";
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// â”€â”€â”€ WhatsApp palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const WA = {
  bg: "#efeae2",
  panel: "#ffffff",
  header: "#f0f2f5",
  inputBar: "#f0f2f5",
  ownBubble: "#d9fdd3",
  otherBubble: "#ffffff",
  text: "#111b21",
  textSecondary: "#667781",
  border: "#d1d7db",
  accent: "#00a884",
  datePill: "#ffffff",
  tickRead: "#53bdeb",
  searchBg: "#f0f2f5",
} as const;

// â”€â”€â”€ Skeleton loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SkeletonBubble({ own, wide }: { own?: boolean; wide?: boolean }) {
  return (
    <div className={cn("flex w-full mb-3", own ? "justify-end" : "justify-start")}>
      {!own && (
        <div className="h-8 w-8 rounded-none shrink-0 mr-2 mt-1 animate-pulse"
          style={{ background: "#d1d7db" }} />
      )}
      <div className="rounded-none px-3 py-2.5 animate-pulse"
        style={{
          background: own ? WA.ownBubble : WA.otherBubble,
          borderRadius: own ? "8px 8px 2px 8px" : "8px 8px 8px 2px",
          width: wide ? "55%" : "38%",
          minWidth: 80,
          boxShadow: "0 1px 0.5px rgba(0,0,0,0.1)",
        }}>
        <div className="h-3 rounded-none mb-2" style={{ background: "#d1d7db", width: "70%" }} />
        <div className="h-3 rounded-none mb-2" style={{ background: "#d1d7db", width: wide ? "90%" : "50%" }} />
        {wide && <div className="h-3 rounded-none mb-2" style={{ background: "#d1d7db", width: "40%" }} />}
        <div className="flex justify-end mt-2">
          <div className="h-2 w-8 rounded-none" style={{ background: "#d1d7db" }} />
        </div>
      </div>
    </div>
  );
}

function ChatSkeleton() {
  const pattern = [
    { own: false, wide: false }, { own: false, wide: true },
    { own: true, wide: false }, { own: true, wide: true },
    { own: false, wide: true }, { own: true, wide: false },
    { own: false, wide: false }, { own: false, wide: true },
    { own: true, wide: true }, { own: true, wide: false },
    { own: false, wide: false }, { own: true, wide: true },
  ];
  return (
    <div className="flex flex-col px-[5%] pt-6">
      {pattern.map((p, i) => <SkeletonBubble key={i} own={p.own} wide={p.wide} />)}
    </div>
  );
}

// â”€â”€â”€ WhatsApp-style audio player â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function WaAudioPlayer({ src, isOwn }: { src: string; isOwn?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(isFinite(a.duration) ? a.duration : 0);
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(console.error); }
  }

  const pct = duration > 0 ? Math.min((current / duration) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[200px] max-w-[270px]">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button type="button" onClick={toggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none text-white shadow-none"
        style={{ background: WA.accent }}>
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </button>
      <div className="flex flex-col flex-1 min-w-0 gap-1.5">
        {/* Progress bar */}
        <div className="relative h-1.5 rounded-none overflow-hidden cursor-pointer"
          style={{ background: isOwn ? "#b2dfcd" : "#d1d7db" }}
          onClick={(e) => {
            const a = audioRef.current;
            if (!a || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            a.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}>
          <div className="absolute inset-y-0 left-0 rounded-none transition-all duration-100"
            style={{ width: `${pct}%`, background: WA.accent }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium tabular-nums" style={{ color: WA.textSecondary }}>
            {playing || current > 0 ? formatDuration(current) : formatDuration(duration)}
          </span>
          <Mic className="h-3 w-3" style={{ color: WA.textSecondary }} />
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Voice preview before sending â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function VoicePreview({ blob, onSend, onDiscard, sending }: {
  blob: Blob; onSend: () => void; onDiscard: () => void; sending: boolean;
}) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-none border"
      style={{ background: WA.panel, borderColor: WA.border }}>
      <WaAudioPlayer src={url} isOwn />
      <button type="button" onClick={onDiscard} title="Discard"
        className="h-8 w-8 flex items-center justify-center rounded-none hover:bg-red-50 transition-colors">
        <Trash2 className="h-4 w-4 text-red-500" />
      </button>
      <button type="button" onClick={onSend} disabled={sending} title="Send"
        className="h-9 w-9 flex items-center justify-center rounded-none text-white shadow transition-colors disabled:opacity-50"
        style={{ background: WA.accent }}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </div>
  );
}

// â”€â”€â”€ WaIconBtn â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function WaIconBtn({ children, onClick, disabled, "aria-label": ariaLabel, className, active }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  "aria-label"?: string; className?: string; active?: boolean;
}) {
  return (
    <button type="button" aria-label={ariaLabel} disabled={disabled} onClick={onClick}
      className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-none transition-colors disabled:opacity-40",
        active ? "opacity-100" : "opacity-70 hover:opacity-100", className)}
      style={{ color: WA.textSecondary }}>
      {children}
    </button>
  );
}

// â”€â”€â”€ Quoted reply strip inside bubble â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ReplyQuote({ body, sender, isOwn }: { body: string; sender: string; isOwn?: boolean }) {
  return (
    <div className="mb-1.5 rounded-none overflow-hidden flex"
      style={{ background: isOwn ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.05)", borderLeft: `3px solid ${WA.accent}` }}>
      <div className="px-2.5 py-1.5 min-w-0 flex-1">
        <p className="text-[11px] font-semibold truncate" style={{ color: WA.accent }}>{sender}</p>
        <p className="text-[12px] truncate leading-snug" style={{ color: WA.textSecondary }}>{body || "ðŸ“Ž Attachment"}</p>
      </div>
    </div>
  );
}

// â”€â”€â”€ Reply bar above the input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ReplyBar({ msg, onClose }: { msg: Msg; onClose: () => void }) {
  const sender = msg.profiles?.full_name || msg.profiles?.username || "Member";
  const preview = msg.body?.trim() || (parseAttachments(msg.attachments).length ? "ðŸ“Ž Attachment" : "Message");
  return (
    <div className="flex items-center gap-2 px-3 py-2" style={{ background: WA.inputBar, borderBottom: `1px solid ${WA.border}` }}>
      <div className="flex-1 min-w-0 pl-2.5 border-l-[3px]" style={{ borderColor: WA.accent }}>
        <p className="text-[11px] font-semibold truncate" style={{ color: WA.accent }}>{sender}</p>
        <p className="text-[12px] truncate" style={{ color: WA.textSecondary }}>{preview}</p>
      </div>
      <button type="button" onClick={onClose}
        className="shrink-0 h-7 w-7 flex items-center justify-center rounded-none hover:bg-black/5">
        <X className="h-4 w-4" style={{ color: WA.textSecondary }} />
      </button>
    </div>
  );
}

// â”€â”€â”€ MessageRow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MessageRow({
  m, compact, isOwn, userId, isDM,
  onOpenThread, onToggleReaction, onDelete, onEdit, onReply,
}: {
  m: Msg; compact?: boolean; isOwn?: boolean; userId: string | null; isDM?: boolean;
  onOpenThread: () => void; onToggleReaction: (id: string, emoji: string) => void;
  onDelete: (id: string) => void; onEdit: (msg: Msg) => void; onReply: (msg: Msg) => void;
}) {
  const p = m.profiles;
  const attachments = parseAttachments(m.attachments);
  const reactions = (m.reactions && typeof m.reactions === "object" ? m.reactions : {}) as Record<string, string[]>;
  const isRoot = !m.thread_id;
  const replyCount = m.reply_count ?? 0;
  const isAudio = m.message_type === "audio" || attachments.some(a => a.mime?.startsWith("audio/"));
  const audioUrl = attachments.find(a => a.mime?.startsWith("audio/"))?.url || "";
  const nonAudioAtts = attachments.filter(a => !a.mime?.startsWith("audio/"));
  const hasReplyQuote = !!m.reply_to_id && !!m.reply_to_body;

  function userReacted(emoji: string) {
    const ids = reactions[emoji];
    if (!userId || !ids?.length) return false;
    return ids.some((id) => String(id) === String(userId));
  }

  return (
    <div className={cn("flex w-full group mb-0.5", isOwn ? "justify-end" : "justify-start", compact && "pl-3")}>
      <div className={cn("flex gap-2 max-w-[min(100%,26rem)]", isOwn && "flex-row-reverse")}>

        {/* Avatar */}
        {!isOwn && !compact && (
          <div className="h-8 w-8 rounded-none overflow-hidden shrink-0 mt-1"
            style={{ border: `1px solid ${WA.border}`, background: WA.header }}>
            {p?.avatar_url
              ? <Image src={p.avatar_url} alt="" width={32} height={32} className="object-cover h-full w-full" unoptimized />
              : <div className="h-full w-full flex items-center justify-center text-xs font-bold" style={{ color: WA.accent }}>
                {(p?.full_name || p?.username || "?")[0]}
              </div>}
          </div>
        )}

        <div className={cn("min-w-0 flex-1", isOwn && "flex flex-col items-end")}>

          {/* Bubble */}
          <div className="relative rounded-none px-2.5 pt-1.5 pb-2 shadow-none"
            style={{
              background: isOwn ? WA.ownBubble : WA.otherBubble,
              borderRadius: isOwn ? "8px 8px 2px 8px" : "8px 8px 8px 2px",
            }}>

            {/* Sender name (group chat) */}
            {!isOwn && !isDM && (
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: WA.accent }}>
                {p?.full_name || p?.username || "Member"}
              </p>
            )}

            {/* Quoted reply */}
            {hasReplyQuote && (
              <ReplyQuote body={m.reply_to_body!} sender={m.reply_to_sender || "Member"} isOwn={isOwn} />
            )}

            {/* Audio message */}
            {isAudio ? (
              <WaAudioPlayer src={audioUrl} isOwn={isOwn} />
            ) : (
              <>
                {m.body?.trim() && (
                  <p className="text-sm whitespace-pre-wrap break-words pr-12" style={{ color: WA.text }}>{m.body}</p>
                )}
                {nonAudioAtts.length > 0 && (
                  <div className={cn("mt-1.5 flex flex-col gap-2", isOwn && "items-end")}>
                    {nonAudioAtts.map((a) =>
                      a.mime?.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(a.url) ? (
                        <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="block rounded-none overflow-hidden max-w-full">
                          <Image src={a.url} alt={a.name || ""} width={280} height={200} className="max-h-52 w-auto object-contain" unoptimized />
                        </a>
                      ) : (
                        <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-none"
                          style={{ background: WA.datePill, color: WA.accent }}>
                          <FileIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{a.name || "File"}</span>
                        </a>
                      )
                    )}
                  </div>
                )}
              </>
            )}

            {/* Timestamp + ticks */}
            <div className="absolute bottom-1 right-1.5 flex items-center gap-1 pointer-events-none">
              {m.is_edited && <span className="text-[9px]" style={{ color: WA.textSecondary }}>edited</span>}
              <span className="text-[10px]" style={{ color: WA.textSecondary }}>{format(new Date(m.created_at), "HH:mm")}</span>
              {isOwn && <CheckCheck className="h-3.5 w-3.5" style={{ color: WA.tickRead }} />}
            </div>
          </div>

          {/* Reactions */}
          {Object.values(reactions).some((ids) => ids.length > 0) && (
            <div className={cn("mt-0.5 flex flex-wrap items-center gap-1", isOwn && "justify-end")}>
              {Object.entries(reactions).map(([emoji, ids]) =>
                ids.length ? (
                  <button key={emoji} type="button" onClick={() => onToggleReaction(m.id, emoji)}
                    className="text-[11px] px-2 py-0.5 rounded-none transition-colors"
                    style={{
                      background: userReacted(emoji) ? "rgba(0,168,132,0.2)" : WA.datePill,
                      border: `1px solid ${userReacted(emoji) ? WA.accent : "transparent"}`,
                      color: WA.text,
                    }}>
                    {emoji} {ids.length}
                  </button>
                ) : null
              )}
            </div>
          )}

          {/* Hover actions */}
          <div className={cn(
            "mt-0.5 flex flex-wrap items-center gap-0.5",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
            isOwn && "justify-end"
          )}>
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} type="button"
                className="text-base leading-none h-7 w-7 rounded-none flex items-center justify-center hover:opacity-80"
                onClick={() => onToggleReaction(m.id, emoji)}>
                {emoji}
              </button>
            ))}

            {/* WhatsApp-style reply button */}
            <button type="button"
              className="inline-flex items-center gap-1 rounded-none px-2 py-1 text-xs font-medium hover:bg-black/5 transition-colors"
              style={{ color: WA.textSecondary }}
              onClick={() => onReply(m)}>
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>

            {isRoot && !isDM && (
              <button type="button"
                className="inline-flex items-center gap-1 rounded-none px-2 py-1 text-xs font-medium hover:bg-black/5 transition-colors"
                style={{ color: WA.textSecondary }}
                onClick={onOpenThread}>
                {replyCount > 0 ? `${replyCount} in thread` : "Thread"}
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded-none hover:bg-black/5 transition-colors" style={{ color: WA.textSecondary }}>
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"} className="z-[10055] min-w-[10rem]">
                <DropdownMenuItem className="cursor-pointer" onClick={() => void navigator.clipboard.writeText((m.body || "").trim() || "(attachment)")}>
                  <Copy className="mr-2 h-4 w-4" /> Copy text
                </DropdownMenuItem>
                {isOwn && (
                  <>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(m)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer font-semibold" style={{ color: "#f15c6d" }} onClick={() => void onDelete(m.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main ChatRoom Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function ChatRoom({ roomId, roomName, communityId, slug, hideHeader }: {
  roomId: string; roomName: string; communityId: string; slug: string; hideHeader?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [threadReplyText, setThreadReplyText] = useState("");
  const [pendingMain, setPendingMain] = useState<ChatAttachmentPayload[]>([]);
  const [pendingThread, setPendingThread] = useState<ChatAttachmentPayload[]>([]);
  const [replyingTo, setReplyingTo] = useState<Msg | null>(null);

  const { callType, setCallType, incomingCall, setIncomingCall, startCall, localStream, remoteStream, pcRef, iceQueueRef } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConvPeer, setActiveConvPeer] = useState<{ name: string; avatar: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [threadRoot, setThreadRoot] = useState<Msg | null>(null);
  const [threadReplies, setThreadReplies] = useState<Msg[]>([]);
  const [threadOpen, setThreadOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadBottomRef = useRef<HTMLDivElement>(null);
  const threadRootRef = useRef<Msg | null>(null);
  const threadOpenRef = useRef(false);
  const threadFileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const [editingMsg, setEditingMsg] = useState<Msg | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatFilter, setChatFilter] = useState<"all" | "media">("all");
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'unread' | 'group' | 'inbox' | 'calls'>('all');
  const [sidebarMembers, setSidebarMembers] = useState<any[]>([]);
  const [inboxConversations, setInboxConversations] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [forceShowList, setForceShowList] = useState(false);

  // â”€â”€ Voice recording â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceMime, setVoiceMime] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isChatting = !forceShowList && (!!roomId || !!activeConvId);
  const { spacesWithRooms } = useWorkspace();
  const router = useRouter();
  const allChatRooms = spacesWithRooms.flatMap((s: any) =>
    s.rooms.filter((r: any) => r.room_type === 'chat').map((r: any) => ({ spaceId: s.id, ...r }))
  );

  useEffect(() => { threadRootRef.current = threadRoot; }, [threadRoot]);
  useEffect(() => { threadOpenRef.current = threadOpen; }, [threadOpen]);
  useEffect(() => {
    return () => {
      voiceStreamRef.current?.getTracks().forEach(t => t.stop());
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, []);

  const patchMessage = useCallback((id: string, patch: Partial<Msg>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
    setThreadReplies(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
    setThreadRoot(r => r && r.id === id ? { ...r, ...patch } : r);
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    setThreadReplies(prev => prev.filter(m => m.id !== id));
    setThreadRoot(r => { if (r?.id === id) { setThreadOpen(false); return null; } return r; });
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (activeConvId) {
        const res = await fetch(`/api/communities/${slug}/inbox/${activeConvId}/messages`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMessages(data.messages ?? []);
      } else if (roomId) {
        const res = await fetch(`/api/messages/${roomId}?limit=100`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMessages(data.messages ?? []);
      }
    } catch { setMessages([]); } finally { setLoading(false); }
  }, [roomId, activeConvId, slug]);

  const loadThread = useCallback(async (rootId: string) => {
    const sb = createClient();
    const { data } = await sb.from("community_messages")
      .select("*, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)")
      .eq("thread_id", rootId).eq("is_deleted", false).order("created_at", { ascending: true });
    setThreadReplies((data as Msg[]) ?? []);
  }, []);

  // Unread counts
  useEffect(() => {
    const read = () => {
      const uc: Record<string, number> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('workspace-unread:')) uc[k.replace('workspace-unread:', '')] = parseInt(localStorage.getItem(k) || '0', 10);
      }
      setUnreadCounts(uc);
    };
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);

  useEffect(() => {
    async function fetchSidebar() {
      try {
        const [mr, cr] = await Promise.all([fetch(`/api/communities/${slug}/members`), fetch(`/api/communities/${slug}/inbox`)]);
        if (mr.ok) setSidebarMembers((await mr.json()).members || []);
        if (cr.ok) setInboxConversations((await cr.json()).conversations || []);
      } catch (e) { console.error(e); }
    }
    fetchSidebar();
    const sub = supabase.channel('inbox_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_inbox_conversations' }, fetchSidebar)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [slug, supabase]);

  useEffect(() => {
    if (!roomId && !activeConvId) return;
    const key = `workspace-unread:${activeConvId || roomId}`;
    if (localStorage.getItem(key)) { localStorage.removeItem(key); window.dispatchEvent(new Event('storage')); }
  }, [roomId, activeConvId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!communityId) return;
    fetch(`/api/communities/${communityId}/members`).then(r => r.json()).then(d => setSidebarMembers(d.members ?? []));
  }, [communityId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!userId || !communityId) return;
    const fetchInboxes = async () => {
      const { data } = await supabase.from('community_inbox_conversations')
        .select('*, user_low_profile:profiles!community_inbox_conversations_user_low_fkey(full_name, avatar_url, username), user_high_profile:profiles!community_inbox_conversations_user_high_fkey(full_name, avatar_url, username)')
        .eq('community_id', communityId).or(`user_low.eq.${userId},user_high.eq.${userId}`)
        .order('updated_at', { ascending: false });
      if (data) setInboxConversations(data.map(conv => {
        const isLow = conv.user_low === userId;
        const peer = isLow ? conv.user_high_profile : conv.user_low_profile;
        return { id: conv.id, peerId: isLow ? conv.user_high : conv.user_low, peerName: peer?.full_name || peer?.username || 'Member', peerAvatar: peer?.avatar_url };
      }));
    };
    fetchInboxes();
    const ch = supabase.channel(`inbox_list_${communityId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_inbox_conversations', filter: `community_id=eq.${communityId}` }, fetchInboxes)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, communityId, supabase]);

  // Realtime
  useEffect(() => {
    if (!isChatting) return;
    async function enrich(id: string): Promise<Profile | null> {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url, username").eq("id", id).maybeSingle();
      return data;
    }
    if (activeConvId) {
      const ch = supabase.channel(`inbox_messages:${activeConvId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_inbox_messages", filter: `conversation_id=eq.${activeConvId}` },
          async (raw: any) => {
            const p = raw.new;
            if (p.message_type === 'call_start' && p.sender_id !== userId) {
              setIncomingCall({ type: p.body === 'video' ? 'video' : 'audio', sender: p.profiles, roomId: p.room_id, convId: p.conversation_id });
            } else if (p.message_type === 'call_signal' && p.sender_id !== userId) {
              handleCallSignal(JSON.parse(p.body));
            } else {
              const prof = await enrich(String(p.sender_id));
              setMessages(prev => {
                if (prev.some(m => m.id === p.id)) return prev;
                return [...prev, { id: String(p.id), body: String(p.body ?? ""), sender_id: String(p.sender_id), created_at: String(p.created_at), message_type: String(p.message_type ?? "text"), thread_id: null, reactions: p.reactions ?? {}, attachments: p.attachments ?? [], profiles: prof }]
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              });
            }
          }).subscribe();
      const gi = supabase.channel(`inbox_unread_${communityId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_inbox_messages" }, (p: any) => {
          const r = p.new;
          if (r.sender_id !== userId && r.conversation_id !== activeConvId) {
            const k = `workspace-unread:${r.conversation_id}`;
            localStorage.setItem(k, String(parseInt(localStorage.getItem(k) || '0', 10) + 1));
            window.dispatchEvent(new Event('storage'));
          }
        }).subscribe();
      return () => { supabase.removeChannel(ch); supabase.removeChannel(gi); };
    } else if (roomId) {
      const ch = supabase.channel(`community_messages:${roomId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `room_id=eq.${roomId}` },
          async (raw: any) => {
            const row = raw.new as Record<string, unknown>;
            if (row.message_type === 'call_start' && row.sender_id !== userId) {
              setIncomingCall({ type: row.body === 'video' ? 'video' : 'audio', sender: await enrich(String(row.sender_id)), roomId: String(row.room_id) });
            } else {
              const tid = row.thread_id as string | null;
              if (tid) { if (threadOpenRef.current && threadRootRef.current?.id === tid) await loadThread(tid); return; }
              const prof = await enrich(String(row.sender_id));
              setMessages(prev => {
                if (prev.some(m => m.id === row.id)) return prev;
                return [...prev, {
                  id: String(row.id), body: String(row.body ?? ""), sender_id: String(row.sender_id),
                  created_at: String(row.created_at), message_type: String(row.message_type ?? "text"),
                  thread_id: null, reactions: row.reactions, attachments: row.attachments, profiles: prof,
                  reply_count: (row.reply_count as number) ?? 0,
                  is_edited: row.is_edited as boolean, edited_at: row.edited_at as string,
                  reply_to_id: row.reply_to_id as string, reply_to_body: row.reply_to_body as string, reply_to_sender: row.reply_to_sender as string,
                }].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              });
            }
          })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_messages", filter: `room_id=eq.${roomId}` },
          (raw: any) => {
            const row = raw.new as Record<string, unknown>;
            if (row.is_deleted) { removeMessage(String(row.id)); return; }
            patchMessage(String(row.id), { body: String(row.body ?? ""), reactions: row.reactions, is_edited: row.is_edited as boolean, edited_at: row.edited_at as string, reply_count: row.reply_count as number });
          }).subscribe();
      const gr = supabase.channel(`rooms_unread_${communityId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `community_id=eq.${communityId}` }, (p: any) => {
          const r = p.new;
          if (r.sender_id !== userId && r.room_id !== roomId) {
            const k = `workspace-unread:${r.room_id}`;
            localStorage.setItem(k, String(parseInt(localStorage.getItem(k) || '0', 10) + 1));
            window.dispatchEvent(new Event('storage'));
          }
        }).subscribe();
      return () => { supabase.removeChannel(ch); supabase.removeChannel(gr); };
    }
  }, [roomId, activeConvId, isChatting, userId, communityId, loadThread, patchMessage, removeMessage]);

  useEffect(() => { if (atBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, atBottom]);
  useEffect(() => { threadBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [threadReplies]);
  useEffect(() => { if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream; }, [localStream]);
  useEffect(() => { if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream; }, [remoteStream]);

  // â”€â”€ WebRTC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function sendCallSignal(type: 'audio' | 'video' | 'call_signal', body?: any) {
    const ep = activeConvId ? `/api/communities/${slug}/inbox/${activeConvId}/messages` : `/api/messages/${roomId}`;
    await fetch(ep, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: typeof body === 'object' ? JSON.stringify(body) : (body || type), message_type: type === 'call_signal' ? 'call_signal' : 'call_start' }) });
  }

  async function initWebRTC(type: 'audio' | 'video', isInitiator: boolean) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = ev => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = ev.streams[0]; };
    pc.onicecandidate = ev => { if (ev.candidate) sendCallSignal('call_signal', { ice: ev.candidate }); };
    if (isInitiator) { const offer = await pc.createOffer(); await pc.setLocalDescription(offer); sendCallSignal('call_signal', { sdp: offer }); }
  }

  async function handleCallSignal(signal: any) {
    const pc = pcRef.current; if (!pc) return;
    try {
      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        for (const c of iceQueueRef.current) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
        iceQueueRef.current = [];
        if (signal.sdp.type === 'offer') { const ans = await pc.createAnswer(); await pc.setLocalDescription(ans); sendCallSignal('call_signal', { sdp: ans }); }
      } else if (signal.ice) {
        if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(console.error);
        else iceQueueRef.current.push(signal.ice);
      }
    } catch (e) { console.error("WebRTC error", e); }
  }

  async function startNativeCall(type: 'audio' | 'video') {
    setCallType(type); iceQueueRef.current = [];
    await sendCallSignal(type); await initWebRTC(type, true);
  }

  function handleEndCall() {
    if (localVideoRef.current?.srcObject) { (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); localVideoRef.current.srcObject = null; }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallType(null); pcRef.current?.close(); pcRef.current = null; iceQueueRef.current = [];
  }

  // â”€â”€ Files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleFiles(files: FileList | null, target: "main" | "thread") {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_BYTES) continue;
        const up = await uploadCommunityChatFile(communityId, roomId, file);
        if (target === "main") setPendingMain(p => p.length >= MAX_ATTACH ? p : [...p, up]);
        else setPendingThread(p => p.length >= MAX_ATTACH ? p : [...p, up]);
      }
    } catch (e) { console.error(e); } finally { setUploading(false); }
  }

  // â”€â”€ Send â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function sendMessage(threadId?: string | null) {
    const isThread = !!threadId;
    const t = (isThread ? threadReplyText : text).trim();
    const queue = isThread ? pendingThread : pendingMain;
    if ((!t && queue.length === 0) || sending) return;
    setSending(true);
    try {
      const ep = activeConvId ? `/api/communities/${slug}/inbox/${activeConvId}/messages` : `/api/messages/${roomId}`;
      const res = await fetch(ep, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: t, threadId: threadId ?? null, attachments: queue,
          message_type: deriveMessageType(queue, t),
          reply_to_id: !isThread && replyingTo ? replyingTo.id : null,
          reply_to_body: !isThread && replyingTo ? replyingTo.body?.slice(0, 200) : null,
          reply_to_sender: !isThread && replyingTo ? (replyingTo.profiles?.full_name || replyingTo.profiles?.username || "Member") : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const msg = (data.message || data.row) as Msg;
      if (msg.thread_id) {
        setThreadReplies(p => p.some(m => m.id === msg.id) ? p : [...p, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        setThreadReplyText(""); setPendingThread([]);
      } else {
        setMessages(p => p.some(m => m.id === msg.id) ? p : [...p, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        setText(""); setPendingMain([]); setReplyingTo(null); setAtBottom(true);
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
      }
    } catch (e) { console.error(e); } finally { setSending(false); }
  }

  // â”€â”€ Voice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function pickMime() {
    if (typeof MediaRecorder === "undefined") return "";
    for (const c of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mp4;codecs=opus"])
      if (MediaRecorder.isTypeSupported(c)) return c;
    return "";
  }

  async function startVoiceRecording() {
    if (voiceRecording || sending || uploading) return;
    const mime = pickMime();
    if (!mime) { window.alert("Voice recording not supported in this browser."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];
      setVoiceSeconds(0);
      voiceTimerRef.current = setInterval(() => setVoiceSeconds(s => s + 1), 1000);
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size) voiceChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        voiceStreamRef.current = null; mediaRecorderRef.current = null;
        if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null; }
        const blob = new Blob(voiceChunksRef.current, { type: mime });
        voiceChunksRef.current = []; setVoiceRecording(false);
        if (blob.size >= 100) { setVoiceBlob(blob); setVoiceMime(mime); }
      };
      mr.start(); setVoiceRecording(true);
    } catch (e) { console.error(e); window.alert("Microphone access denied."); }
  }

  function stopVoiceRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") mr.stop();
    else {
      setVoiceRecording(false);
      if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null; }
    }
  }

  async function sendVoiceBlob() {
    if (!voiceBlob || sending) return;
    setSending(true);
    try {
      const ext = voiceMime.includes("mp4") ? "m4a" : "webm";
      const file = new File([voiceBlob], `voice-${Date.now()}.${ext}`, { type: voiceBlob.type || voiceMime });
      setUploading(true);
      const up = await uploadCommunityChatFile(communityId, roomId, file);
      setUploading(false);
      const ep = activeConvId ? `/api/communities/${slug}/inbox/${activeConvId}/messages` : `/api/messages/${roomId}`;
      const res = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: "", threadId: null, attachments: [up], message_type: "audio" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const msg = data.message as Msg;
      setMessages(p => p.some(m => m.id === msg.id) ? p : [...p, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      setVoiceBlob(null); setVoiceMime(""); setAtBottom(true);
      setTimeout(scrollToBottom, 50);
    } catch (e: any) { console.error(e); window.alert(`Voice send failed: ${e.message}`); }
    finally { setSending(false); }
  }

  async function openThread(m: Msg) { setThreadRoot(m); setThreadOpen(true); await loadThread(m.id); }
  const appendEmoji = (native: string, target: "main" | "thread") => target === "main" ? setText(s => s + native) : setThreadReplyText(s => s + native);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const ep = activeConvId ? `/api/communities/${slug}/inbox/${activeConvId}/messages/${messageId}/react` : `/api/messages/${roomId}/${messageId}/react`;
      const res = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      patchMessage(messageId, { reactions: data.reactions });
    } catch (e) { console.error(e); }
  }, [roomId, activeConvId, slug, patchMessage]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      const ep = activeConvId ? `/api/communities/${slug}/inbox/${activeConvId}/messages/${messageId}` : `/api/messages/${roomId}/${messageId}`;
      const res = await fetch(ep, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delete: true }) });
      if (!res.ok) throw new Error((await res.json()).error);
      removeMessage(messageId);
    } catch (e) { console.error(e); }
  }, [roomId, activeConvId, slug, removeMessage]);

  const saveEdit = useCallback(async () => {
    if (!editingMsg) return;
    const t = editBody.trim(); if (!t) return;
    setEditSaving(true);
    try {
      const ep = activeConvId ? `/api/communities/${slug}/inbox/${activeConvId}/messages/${editingMsg.id}` : `/api/messages/${roomId}/${editingMsg.id}`;
      const res = await fetch(ep, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: t }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      patchMessage(editingMsg.id, data.message as Msg); setEditingMsg(null);
    } catch (e) { console.error(e); } finally { setEditSaving(false); }
  }, [editingMsg, editBody, roomId, activeConvId, slug, patchMessage]);

  const filteredMessages = useMemo(() => {
    let list = messages.filter(m => m.message_type !== 'call_signal' && m.message_type !== 'call_start');
    if (chatFilter === "media") list = list.filter(m => parseAttachments(m.attachments).length > 0 || ["image", "file", "audio"].includes(m.message_type));
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(m => (m.body || "").toLowerCase().includes(q) || (m.profiles?.full_name || "").toLowerCase().includes(q) || (m.profiles?.username || "").toLowerCase().includes(q));
  }, [messages, searchQuery, chatFilter]);

  const grouped = useMemo(() => {
    const rows: { day: Date; items: Msg[] }[] = [];
    for (const m of filteredMessages) {
      const d = new Date(m.created_at);
      const last = rows[rows.length - 1];
      if (!last || !isSameDay(last.day, d)) rows.push({ day: d, items: [m] });
      else last.items.push(m);
    }
    return rows;
  }, [filteredMessages]);

  const onScrollMain = useCallback(() => {
    const el = scrollRef.current; if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 100);
  }, []);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="wa-root flex flex-1 h-full min-h-0 overflow-hidden" style={{ fontFamily: 'inherit', height: '100%' }}>

      <style dangerouslySetInnerHTML={{
        __html: `
        .wa-root{--wa-accent:#00a884;--wa-sb:#fff;--wa-sb-h:#f5f6f6;--wa-sb-a:#ebebeb;--wa-hdr:#f0f2f5;--wa-bg:#efeae2;--wa-tx:#111b21;--wa-tx2:#3b4a54;--wa-tx3:#667781;--wa-br:#d1d7db;color:var(--wa-tx)}
        .wa-sidebar{width:360px;flex-shrink:0;display:flex;flex-direction:column;background:var(--wa-sb);border-right:1px solid var(--wa-br)}
        @media(max-width:768px){.wa-sidebar{width:100%;display:${isChatting ? 'none' : 'flex'}}.wa-panel{display:${isChatting ? 'flex' : 'none'}}}
        .wa-panel{flex:1;display:flex;flex-direction:column;min-width:0;position:relative;height:100%}
        .wa-hdr{display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--wa-hdr);border-bottom:1px solid var(--wa-br);min-height:59px;z-index:10}
        .wa-sb-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--wa-hdr);min-height:59px}
        .wa-srch{padding:8px 12px;background:var(--wa-sb);border-bottom:1px solid var(--wa-br)}
        .wa-srch-inner{display:flex;align-items:center;gap:8px;background:var(--wa-sb-h);border-radius:8px;padding:8px 12px;cursor:pointer;transition:background .15s}
        .wa-srch-inner:hover{background:var(--wa-sb-a)}
        .wa-filter-bar{display:flex;gap:6px;padding:8px 12px;background:var(--wa-sb);border-bottom:1px solid var(--wa-br);overflow-x:auto}
        .wa-filter-bar::-webkit-scrollbar{display:none}
        .wa-filter-btn{padding:5px 14px;border-radius:99px;background:var(--wa-sb-h);border:none;font-size:13px;font-weight:500;color:var(--wa-tx3);cursor:pointer;white-space:nowrap;transition:all .15s}
        .wa-filter-btn.active{background:#d9fdd3;color:#008069;font-weight:600}
        .wa-chat-list{flex:1;overflow-y:auto}
        .wa-chat-list::-webkit-scrollbar{width:4px}
        .wa-chat-list::-webkit-scrollbar-thumb{background:var(--wa-br);border-radius:4px}
        .wa-chat-item{display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--wa-br);transition:background .12s;min-height:72px}
        .wa-chat-item:hover{background:var(--wa-sb-h)}
        .wa-chat-item.active{background:var(--wa-sb-a)}
        .wa-avatar{width:49px;height:49px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;flex-shrink:0;background:#dfe5e7;color:var(--wa-tx2);text-transform:uppercase;overflow:hidden}
        .wa-chat-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
        .wa-chat-row{display:flex;align-items:center;justify-content:space-between;gap:6px}
        .wa-chat-name{font-weight:500;font-size:15px;color:var(--wa-tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
        .wa-chat-preview{font-size:13px;color:var(--wa-tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .wa-badge{background:var(--wa-accent);color:#fff;border-radius:99px;font-size:11px;font-weight:700;padding:1px 7px;flex-shrink:0}
        .wa-msgs{flex:1;overflow-y:auto;padding:12px 5% 20px;background:#efeae2;display:flex;flex-direction:column}
        .wa-msgs::-webkit-scrollbar{width:6px}
        .wa-msgs::-webkit-scrollbar-thumb{background:#c1c9cd;border-radius:3px}
        .wa-day-sep{display:flex;justify-content:center;margin:8px 0 16px}
        .wa-day-sep span{background:#fff;color:var(--wa-tx2);padding:5px 12px;border-radius:7px;font-size:12px;font-weight:500;box-shadow:0 1px 0.5px rgba(0,0,0,0.13)}
        .wa-inp-bar{display:flex;align-items:end;gap:4px;padding:9px 12px;min-height:62px;padding-bottom:calc(9px + env(safe-area-inset-bottom,0px))}
        .wa-inp-inner{flex:1;background:#fff!important;border-radius:8px;padding:9px 12px;display:flex;align-items:center}
        .wa-send{background:var(--wa-accent);border:none;color:#fff;cursor:pointer;padding:10px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:transform .2s;flex-shrink:0}
        .wa-send:hover{transform:scale(1.05)}
        .wa-send:disabled{opacity:.5;cursor:not-allowed;transform:none}
        /* Recording pulse ring */
        @keyframes wa-rec-ring{0%{transform:scale(1);opacity:.9}70%{transform:scale(1.6);opacity:0}100%{transform:scale(1.6);opacity:0}}
        .wa-rec-ring{position:absolute;inset:0;border-radius:50%;border:2px solid #f15c6d;animation:wa-rec-ring 1.4s ease-out infinite;pointer-events:none}
        /* Skeleton shimmer */
        @keyframes wa-shimmer{0%{opacity:.5}50%{opacity:1}100%{opacity:.5}}
        .animate-pulse{animation:wa-shimmer 1.7s ease-in-out infinite}
        @media(max-width:480px){.wa-inp-bar{padding:6px 8px}}
      `}} />

      {/* â”€â”€ Active call overlay â”€â”€ */}
      {callType && (
        <div className="fixed inset-0 z-[20000] flex flex-col items-center justify-center bg-[#0b141a] text-white">
          <div className="flex flex-col items-center gap-6 w-full max-w-sm px-6">
            <div className="wa-avatar" style={{ width: 110, height: 110, fontSize: 38, background: '#233138' }}>
              {activeConvPeer?.avatar ? <img src={activeConvPeer.avatar} className="w-full h-full object-cover" alt="" /> : <span>{(activeConvPeer?.name || roomName)[0]}</span>}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">{activeConvPeer?.name || roomName}</h2>
              <p className="text-[#8696a0] mt-1">{callType === 'video' ? 'Video calling...' : 'Audio calling...'}</p>
            </div>
            <div className="w-full h-72 bg-[#233138] rounded-none overflow-hidden relative shadow-none border border-white/10">
              {remoteStream && <video autoPlay playsInline ref={remoteVideoRef} className="w-full h-full object-cover" />}
              {localStream && <video autoPlay playsInline muted ref={localVideoRef} className={cn("absolute bottom-3 right-3 w-24 h-36 bg-black rounded-none border border-white/20 object-cover shadow-none", !remoteStream && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-56")} />}
              {!remoteStream && !localStream && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><div className="w-14 h-14 rounded-none flex items-center justify-center animate-pulse" style={{ background: WA.accent }}>{callType === 'video' ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}</div><p className="text-sm text-white/70">Connecting...</p></div>}
            </div>
            <div className="mt-4">
              <button onClick={handleEndCall} className="w-16 h-16 rounded-none bg-red-500 flex items-center justify-center hover:bg-red-600 active:scale-90 shadow-none transition-all"><Phone className="h-8 w-8 rotate-[135deg]" /></button>
            </div>
          </div>
        </div>
      )}

      <ChatEmojiPickerDialog open={emojiOpen} onOpenChange={setEmojiOpen} onSelect={n => appendEmoji(n, threadOpen && threadRoot ? "thread" : "main")} />

      {/* Edit dialog */}
      <Dialog open={!!editingMsg} onOpenChange={o => !o && setEditingMsg(null)}>
        <DialogContent overlayClassName="z-[10050]" className="z-[10051] max-w-md shadow-none">
          <DialogHeader><DialogTitle className="text-base font-semibold">Edit message</DialogTitle></DialogHeader>
          <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={4} className="mt-2 rounded-none" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" className="rounded-none" onClick={() => setEditingMsg(null)}>Cancel</Button>
            <Button className="rounded-none font-semibold text-white" style={{ background: WA.accent }} disabled={editSaving || !editBody.trim()} onClick={() => void saveEdit()}>
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Sidebar â”€â”€ */}
      <div className="wa-sidebar hidden md:flex">
        <div className="wa-sb-hdr">
          <span style={{ fontWeight: 700, fontSize: 19, color: '#111b21' }}>Chats</span>
          <button className="h-8 w-8 flex items-center justify-center rounded-none" style={{ color: WA.textSecondary }}><MoreHorizontal size={18} /></button>
        </div>
        <div className="wa-srch" onClick={() => setSidebarFilter('inbox')}>
          <div className="wa-srch-inner">
            <Search className="h-4 w-4 shrink-0" style={{ color: WA.textSecondary }} />
            <span style={{ flex: 1, fontSize: 14, color: WA.textSecondary }}>Search or browse members</span>
          </div>
        </div>
        <div className="wa-filter-bar">
          {(['all', 'unread', 'group', 'inbox', 'calls'] as const).map(f => (
            <button key={f} className={`wa-filter-btn${sidebarFilter === f ? ' active' : ''}`} onClick={() => setSidebarFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="wa-chat-list">
          {(sidebarFilter === 'all' || sidebarFilter === 'group' || sidebarFilter === 'unread') && allChatRooms.map((r: any) => {
            const ur = unreadCounts[r.id] || 0;
            if (sidebarFilter === 'unread' && ur === 0) return null;
            return (
              <div key={r.id} className={`wa-chat-item${r.id === roomId && !activeConvId ? ' active' : ''}`}
                onClick={() => { setActiveConvId(null); setActiveConvPeer(null); setForceShowList(false); router.push(`/communities/${slug}/workspace?space=${r.spaceId}&room=${r.id}`); }}>
                <div className="wa-avatar">{r.name.slice(0, 2)}</div>
                <div className="wa-chat-info">
                  <div className="wa-chat-row"><span className="wa-chat-name">#{r.name}</span>{ur > 0 && <span className="wa-badge">{ur}</span>}</div>
                  <div className="wa-chat-preview">Community channel</div>
                </div>
              </div>
            );
          })}
          {(sidebarFilter === 'all' || sidebarFilter === 'unread') && inboxConversations.map((conv: any) => {
            const ur = unreadCounts[conv.id] || 0;
            if (sidebarFilter === 'unread' && ur === 0) return null;
            return (
              <div key={conv.id} className={`wa-chat-item${activeConvId === conv.id ? ' active' : ''}`}
                onClick={() => { setActiveConvId(conv.id); setActiveConvPeer({ name: conv.peerName, avatar: conv.peerAvatar }); setForceShowList(false); }}>
                <div className="wa-avatar">{conv.peerAvatar ? <img src={conv.peerAvatar} className="w-full h-full object-cover" alt="" /> : <span>{conv.peerName[0]}</span>}</div>
                <div className="wa-chat-info">
                  <div className="wa-chat-row"><span className="wa-chat-name">{conv.peerName}</span>{ur > 0 && <span className="wa-badge">{ur}</span>}</div>
                  <div className="wa-chat-preview">Private message</div>
                </div>
              </div>
            );
          })}
          {sidebarFilter === 'inbox' && (sidebarMembers.length === 0
            ? <p style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: WA.textSecondary }}>No members found.</p>
            : sidebarMembers.map((m: any) => {
              const name = m.profile?.full_name || m.profile?.username || 'Member';
              const av = m.profile?.avatar_url;
              const isMe = m.user_id === userId;
              return (
                <div key={m.user_id} className="wa-chat-item" style={{ cursor: isMe ? 'default' : 'pointer', opacity: isMe ? .7 : 1 }}
                  onClick={async () => {
                    if (isMe) return;
                    try {
                      const res = await fetch(`/api/communities/${slug}/inbox`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ peerUserId: m.user_id }) });
                      const data = await res.json();
                      if (res.ok && data.conversationId) { setActiveConvId(data.conversationId); setActiveConvPeer({ name, avatar: av ?? null }); setForceShowList(false); setSidebarFilter('all'); }
                    } catch (e) { console.error(e); }
                  }}>
                  <div className="wa-avatar">{av ? <img src={av} className="w-full h-full object-cover" alt="" /> : <span>{name[0]?.toUpperCase()}</span>}</div>
                  <div className="wa-chat-info">
                    <div className="wa-chat-row">
                      <span className="wa-chat-name">{name}</span>
                      {m.role === 'owner' && <span style={{ fontSize: 10, fontWeight: 700, color: WA.accent }}>Owner</span>}
                      {m.role === 'admin' && <span style={{ fontSize: 10, fontWeight: 700, color: '#fb923c' }}>Admin</span>}
                    </div>
                    <div className="wa-chat-preview">{isMe ? 'You' : 'Tap to message'}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* â”€â”€ Main panel â”€â”€ */}
      <div className="wa-panel">

        {isChatting && (
          <div className="md:hidden absolute left-3 top-2.5 z-[30]">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-none bg-white dark:bg-surface/80 shadow-none" style={{ color: WA.accent }} onClick={() => setForceShowList(true)}>
              <ChevronLeft size={24} />
            </button>
          </div>
        )}

        {(activeConvId || roomId) && hideHeader && (
          <div className="absolute right-4 top-2.5 z-[30] flex items-center gap-2">
            <button onClick={() => startNativeCall('audio')} className="flex h-10 w-10 items-center justify-center rounded-none bg-white dark:bg-surface/90 shadow-none border border-gray-200 hover:scale-105 transition-all"><Phone className="h-4 w-4" style={{ color: WA.accent }} /></button>
            <button onClick={() => startNativeCall('video')} className="flex h-10 w-10 items-center justify-center rounded-none bg-white dark:bg-surface/90 shadow-none border border-gray-200 hover:scale-105 transition-all"><Video className="h-4 w-4" style={{ color: WA.accent }} /></button>
          </div>
        )}

        {!hideHeader && (
          <header className={`wa-hdr ${isChatting ? 'pl-14' : ''}`}>
            <div className="wa-avatar" style={{ width: 40, height: 40, fontSize: 15 }}>
              {activeConvId ? (activeConvPeer?.avatar ? <img src={activeConvPeer.avatar} className="w-full h-full object-cover" alt="" /> : <span>{activeConvPeer?.name[0]}</span>) : roomName.slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: WA.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeConvId ? activeConvPeer?.name : `#${roomName}`}
              </p>
              <p style={{ fontSize: 12, color: WA.accent }}>{activeConvId ? 'Online' : 'â— Live'}</p>
            </div>
            <div className="flex items-center gap-1">
              {(activeConvId || roomId) && (<>
                <WaIconBtn aria-label="Audio call" onClick={() => startNativeCall('audio')}><Phone className="h-5 w-5" /></WaIconBtn>
                <WaIconBtn aria-label="Video call" onClick={() => startNativeCall('video')}><Video className="h-5 w-5" /></WaIconBtn>
              </>)}
              <WaIconBtn aria-label="Search" onClick={() => setSearchOpen(s => !s)} active={searchOpen}><Search className="h-5 w-5" /></WaIconBtn>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><WaIconBtn aria-label="More"><MoreVertical className="h-5 w-5" /></WaIconBtn></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[10055] min-w-[11rem]">
                  <DropdownMenuItem onClick={() => void navigator.clipboard.writeText(typeof window !== "undefined" ? window.location.href : "")}><Copy className="mr-2 h-4 w-4" /> Copy link</DropdownMenuItem>
                  {(["all", "media"] as const).map(key => (
                    <DropdownMenuItem key={key} onClick={() => setChatFilter(key)}>
                      {chatFilter === key ? <Check className="mr-2 h-4 w-4" style={{ color: WA.accent }} /> : <span className="mr-2 h-4 w-4 inline-block" />}
                      {key === "all" ? "All messages" : "Media & files"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}

        {searchOpen && (
          <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ background: WA.header, borderBottom: `1px solid ${WA.border}` }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: WA.textSecondary }} />
              <input type="search" placeholder="Search messages…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus
                className="w-full rounded-none border-0 py-2 pl-10 pr-4 text-sm outline-none" style={{ background: WA.searchBg, color: WA.text }} />
            </div>
            <button type="button" className="text-sm font-semibold shrink-0" style={{ color: WA.accent }} onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>Cancel</button>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} onScroll={onScrollMain} className="wa-msgs">
          {loading ? (
            <ChatSkeleton />
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center">
              <p className="text-sm font-semibold" style={{ color: WA.text }}>Start the conversation</p>
              <p className="mt-2 max-w-sm text-xs leading-relaxed" style={{ color: WA.textSecondary }}>Type a message below.</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <p className="py-12 text-center text-sm" style={{ color: WA.textSecondary }}>No messages match your search.</p>
          ) : grouped.map(g => (
            <div key={g.day.toISOString()}>
              <div className="wa-day-sep"><span>{format(g.day, "MMM d, yyyy")}</span></div>
              <div className="space-y-0.5">
                {g.items.map(m =>
                  m.message_type === "system"
                    ? <p key={m.id} className="py-1 text-center text-xs" style={{ color: WA.textSecondary }}>{m.body}</p>
                    : <MessageRow key={m.id} m={m}
                      isOwn={!!userId && m.sender_id === userId}
                      userId={userId} isDM={!!activeConvId}
                      onOpenThread={() => openThread(m)}
                      onToggleReaction={toggleReaction}
                      onDelete={deleteMessage}
                      onEdit={msg => { setEditingMsg(msg); setEditBody(msg.body); }}
                      onReply={msg => setReplyingTo(msg)}
                    />
                )}
              </div>
            </div>
          ))}
          {!atBottom && !loading && messages.length > 0 && (
            <div className="pointer-events-none sticky bottom-2 z-10 flex justify-center">
              <button type="button" onClick={() => scrollToBottom()} className="pointer-events-auto h-10 w-10 flex items-center justify-center rounded-none shadow-none" style={{ background: WA.header, color: WA.accent, border: `1px solid ${WA.border}` }}>
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* â”€â”€ Input zone â”€â”€ */}
        <div className="flex flex-col shrink-0" style={{ background: WA.header, borderTop: `1px solid ${WA.border}` }}>

          {/* WhatsApp-style reply bar */}
          {replyingTo && <ReplyBar msg={replyingTo} onClose={() => setReplyingTo(null)} />}

          {/* Voice preview (listen before send) */}
          {voiceBlob && !voiceRecording && (
            <div className="px-3 pt-2 pb-1">
              <VoicePreview blob={voiceBlob} onSend={sendVoiceBlob} onDiscard={() => { setVoiceBlob(null); setVoiceMime(""); }} sending={sending} />
            </div>
          )}

          {/* WhatsApp-style recording bar */}
          {voiceRecording && (
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Pulsing mic icon */}
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <div className="wa-rec-ring" />
                <Mic className="h-5 w-5 relative z-10" style={{ color: "#f15c6d" }} />
              </div>
              {/* Timer + animated bars */}
              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: "#f15c6d", minWidth: 36 }}>
                  {formatDuration(voiceSeconds)}
                </span>
                {/* Animated waveform */}
                <div className="flex items-end gap-[2px] h-6 flex-1 overflow-hidden">
                  {[...Array(22)].map((_, i) => (
                    <div key={i} className="shrink-0 w-[3px] rounded-none"
                      style={{
                        background: "#f15c6d",
                        height: `${28 + Math.sin((i + voiceSeconds * 3) * 0.7) * 22 + Math.cos((i * 1.3 + voiceSeconds) * 0.9) * 12}%`,
                        opacity: 0.55 + (i % 4) * 0.1,
                        transition: "height 0.15s ease",
                      }} />
                  ))}
                </div>
                <span className="text-[11px] shrink-0 ml-1" style={{ color: WA.textSecondary }}>Recording…</span>
              </div>
              {/* Stop button */}
              <button type="button" onClick={stopVoiceRecording}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none text-white shadow"
                style={{ background: "#f15c6d" }}>
                <StopCircle className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Normal input bar */}
          {!voiceRecording && !voiceBlob && (
            <div className="wa-inp-bar">
              <WaIconBtn aria-label="Emoji" onClick={() => setEmojiOpen(true)}><Smile className="h-6 w-6" /></WaIconBtn>

              <div className="flex items-center gap-0.5">
                <label htmlFor="wa-img-input" className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-none hover:bg-black/5">
                  <ImageIcon className="h-5 w-5" style={{ color: WA.textSecondary }} />
                </label>
                <input id="wa-img-input" type="file" accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files, "main")} />
                <label htmlFor="wa-file-input" className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-none hover:bg-black/5">
                  <FileIcon className="h-5 w-5" style={{ color: WA.textSecondary }} />
                </label>
                <input id="wa-file-input" type="file" className="hidden" onChange={e => handleFiles(e.target.files, "main")} />
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                {pendingMain.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1 py-1.5 mb-1 rounded-none" style={{ background: "rgba(0,0,0,0.04)" }}>
                    {pendingMain.map((a, i) => (
                      <div key={a.url} className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-surface rounded-none shadow-none text-[11px] font-medium" style={{ border: `1px solid ${WA.border}` }}>
                        <FileIcon size={11} style={{ color: WA.accent }} />
                        <span className="truncate max-w-[90px]">{a.name}</span>
                        <button onClick={() => setPendingMain(p => p.filter((_, j) => j !== i))}><X size={12} className="hover:text-red-500" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="wa-inp-inner">
                  <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type a message" rows={1}
                    className="max-h-32 min-h-[24px] w-full resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                </div>
              </div>

              {text.trim() || pendingMain.length > 0 ? (
                <button type="button" className="wa-send shrink-0" disabled={sending} onClick={() => sendMessage()}>
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              ) : (
                <button type="button" className="wa-send shrink-0" disabled={sending || uploading} onClick={() => void startVoiceRecording()}>
                  <Mic className="h-6 w-6" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Thread panel â”€â”€ */}
      {threadOpen && threadRoot && (
        <aside className="flex w-full shrink-0 flex-col min-h-0 absolute inset-0 z-30 lg:static lg:inset-auto lg:z-auto lg:w-[360px]"
          style={{ background: WA.panel, borderLeft: `1px solid ${WA.border}` }}>
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: WA.header, borderBottom: `1px solid ${WA.border}` }}>
            <div>
              <span className="text-sm font-semibold" style={{ color: WA.text }}>Thread</span>
              <p className="text-xs" style={{ color: WA.textSecondary }}>{threadReplies.length} repl{threadReplies.length === 1 ? "y" : "ies"}</p>
            </div>
            <button type="button" className="h-8 w-8 flex items-center justify-center rounded-none" style={{ color: WA.textSecondary }} onClick={() => setThreadOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ background: WA.bg }}>
            <MessageRow m={threadRoot} isOwn={!!userId && threadRoot.sender_id === userId} userId={userId}
              onOpenThread={() => { }} onToggleReaction={toggleReaction} onDelete={deleteMessage}
              onEdit={msg => { setEditingMsg(msg); setEditBody(msg.body); }} onReply={msg => { setReplyingTo(msg); setThreadOpen(false); }} />
            <div className="pt-2 space-y-1" style={{ borderTop: `1px solid ${WA.border}` }}>
              {threadReplies.map(r => (
                <MessageRow key={r.id} m={r} compact isOwn={!!userId && r.sender_id === userId} userId={userId}
                  onOpenThread={() => { }} onToggleReaction={toggleReaction} onDelete={deleteMessage}
                  onEdit={msg => { setEditingMsg(msg); setEditBody(msg.body); }} onReply={() => { }} />
              ))}
              <div ref={threadBottomRef} />
            </div>
          </div>
          <div className="border-t p-3 space-y-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]" style={{ background: WA.inputBar, borderColor: WA.border }}>
            <input ref={threadFileRef} type="file" className="hidden" onChange={e => handleFiles(e.target.files, "thread")} />
            {pendingThread.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pendingThread.map((a, i) => (
                  <span key={`${a.url}-${i}`} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-none" style={{ background: WA.datePill, color: WA.text, border: `1px solid ${WA.border}` }}>
                    <FileIcon className="h-3 w-3" /><span className="truncate max-w-[120px]">{a.name}</span>
                    <button type="button" onClick={() => setPendingThread(p => p.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <WaIconBtn onClick={() => threadFileRef.current?.click()} disabled={pendingThread.length >= MAX_ATTACH}><Paperclip className="h-5 w-5" /></WaIconBtn>
              <WaIconBtn onClick={() => setEmojiOpen(true)}><Smile className="h-5 w-5" /></WaIconBtn>
              <div className="flex-1 rounded-none px-4 py-2" style={{ background: WA.panel, border: `1px solid ${WA.border}` }}>
                <Textarea rows={2} placeholder="Reply in thread…" className="w-full resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0" style={{ color: WA.text }}
                  value={threadReplyText} onChange={e => setThreadReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(threadRoot.id); } }} />
              </div>
              <button type="button" className="h-10 w-10 shrink-0 flex items-center justify-center rounded-none text-white disabled:opacity-50" style={{ background: WA.accent }}
                onClick={() => sendMessage(threadRoot.id)} disabled={sending || (!threadReplyText.trim() && pendingThread.length === 0)}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* â”€â”€ Incoming call â”€â”€ */}
      {incomingCall && (
        <div className="fixed inset-0 z-[30000] flex flex-col items-center justify-center bg-black/90 text-white">
          <div className="flex flex-col items-center gap-6 max-w-sm w-full p-8 rounded-none bg-[#233138] border border-white/10 shadow-none">
            <div className="wa-avatar" style={{ width: 100, height: 100, fontSize: 30, background: WA.accent, color: 'white' }}>
              {incomingCall.sender?.avatar_url ? <img src={incomingCall.sender.avatar_url} className="w-full h-full object-cover" alt="" /> : <span>{incomingCall.sender?.full_name?.[0] || 'I'}</span>}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold">{incomingCall.sender?.full_name || incomingCall.sender?.username || 'Someone'}</h3>
              <p className="font-bold mt-1 uppercase tracking-widest text-[11px]" style={{ color: WA.accent }}>Incoming {incomingCall.type} Call...</p>
            </div>
            <div className="flex items-center gap-8 mt-4">
              <button onClick={() => setIncomingCall(null)} className="w-14 h-14 rounded-none bg-red-500 flex items-center justify-center hover:bg-red-600 active:scale-90 shadow-none transition-all"><X className="h-6 w-6" /></button>
              <button onClick={() => { setCallType(incomingCall.type); setIncomingCall(null); iceQueueRef.current = []; initWebRTC(incomingCall.type, false); }}
                className="w-16 h-16 rounded-none flex items-center justify-center active:scale-95 shadow-none animate-bounce" style={{ background: WA.accent }}>
                {incomingCall.type === 'audio' ? <Phone className="h-7 w-7" /> : <Video className="h-7 w-7" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

