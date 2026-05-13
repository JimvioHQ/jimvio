import { parseAttachments, cn } from "@/lib/utils";
import { Msg, QUICK_REACTIONS } from "@/types";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { FileIcon, CheckCheck, Reply, MoreHorizontal, Copy, Pencil, Trash2 } from "lucide-react";
import { ReplyQuote } from "./ReplyQuote";
import { WaAudioPlayer } from "./WaAudioPlayer";
import Image from "next/image";
import { format, isSameDay } from "date-fns";
interface MessageRowProps {
  m: Msg;
  compact?: boolean;
  isOwn?: boolean;
  userId: string | null;
  isDM?: boolean;
  onOpenThread: () => void;
  onToggleReaction: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onEdit: (msg: Msg) => void;
  onReply: (msg: Msg) => void;
}

export function MessageRow({
  m,
  compact,
  isOwn,
  userId,
  isDM,
  onOpenThread,
  onToggleReaction,
  onDelete,
  onEdit,
  onReply,
}: MessageRowProps) {
  const p = m.profiles;
  const attachments = parseAttachments(m.attachments);
  const reactions = (
    m.reactions && typeof m.reactions === "object" ? m.reactions : {}
  ) as Record<string, string[]>;
  const isRoot = !m.thread_id;
  const replyCount = m.reply_count ?? 0;
  const isAudio =
    m.message_type === "audio" ||
    attachments.some((a) => a.mime?.startsWith("audio/"));
  const audioUrl = attachments.find((a) => a.mime?.startsWith("audio/"))?.url || "";
  const nonAudioAtts = attachments.filter((a) => !a.mime?.startsWith("audio/"));
  const hasReplyQuote = !!m.reply_to_id && !!m.reply_to_body;

  function userReacted(emoji: string) {
    const ids = reactions[emoji];
    if (!userId || !ids?.length) return false;
    return ids.some((id) => String(id) === String(userId));
  }

  return (
    <div
      className={cn(
        "flex w-full group mb-0.5",
        isOwn ? "justify-end" : "justify-start",
        compact && "pl-3"
      )}
    >
      <div className={cn("flex gap-2 max-w-[min(100%,26rem)]", isOwn && "flex-row-reverse")}>
        {/* Avatar */}
        {!isOwn && !compact && (
          <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 mt-1 border border-[#d1d7db] bg-[#f0f2f5]">
            {p?.avatar_url ? (
              <Image
                src={p.avatar_url}
                alt=""
                width={32}
                height={32}
                className="object-cover h-full w-full"
                unoptimized
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs font-bold text-[#00a884]">
                {(p?.full_name || p?.username || "?")[0]}
              </div>
            )}
          </div>
        )}

        <div className={cn("min-w-0 flex-1", isOwn && "flex flex-col items-end")}>
          {/* Bubble */}
          <div
            className={cn(
              "relative px-2.5 pt-1.5 pb-2 shadow-sm",
              isOwn
                ? "bg-[#d9fdd3] rounded-t-lg rounded-bl-lg rounded-br-sm"
                : "bg-white rounded-t-lg rounded-br-lg rounded-bl-sm"
            )}
          >
            {/* Sender name (group) */}
            {!isOwn && !isDM && (
              <p className="text-[11px] font-semibold mb-0.5 text-[#00a884]">
                {p?.full_name || p?.username || "Member"}
              </p>
            )}

            {/* Quoted reply */}
            {hasReplyQuote && (
              <ReplyQuote
                body={m.reply_to_body!}
                sender={m.reply_to_sender || "Member"}
                isOwn={isOwn}
              />
            )}

            {/* Audio */}
            {isAudio ? (
              <WaAudioPlayer src={audioUrl} isOwn={isOwn} />
            ) : (
              <>
                {m.body?.trim() && (
                  <p className="text-sm whitespace-pre-wrap break-words pr-12 text-[#111b21]">
                    {m.body}
                  </p>
                )}
                {nonAudioAtts.length > 0 && (
                  <div className={cn("mt-1.5 flex flex-col gap-2", isOwn && "items-end")}>
                    {nonAudioAtts.map((a) =>
                      a.mime?.startsWith("image/") ||
                      /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(a.url) ? (
                        <a
                          key={a.url}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-sm overflow-hidden max-w-full"
                        >
                          <Image
                            src={a.url}
                            alt={a.name || ""}
                            width={280}
                            height={200}
                            className="max-h-52 w-auto object-contain"
                            unoptimized
                          />
                        </a>
                      ) : (
                        <a
                          key={a.url}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-sm bg-white text-[#00a884]"
                        >
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
              {m.is_edited && <span className="text-[9px] text-[#667781]">edited</span>}
              <span className="text-[10px] text-[#667781]">
                {format(new Date(m.created_at), "HH:mm")}
              </span>
              {isOwn && <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />}
            </div>
          </div>

          {/* Reactions */}
          {Object.values(reactions).some((ids) => ids.length > 0) && (
            <div className={cn("mt-0.5 flex flex-wrap items-center gap-1", isOwn && "justify-end")}>
              {Object.entries(reactions).map(([emoji, ids]) =>
                ids.length ? (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onToggleReaction(m.id, emoji)}
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded-sm transition-colors border text-[#111b21]",
                      userReacted(emoji)
                        ? "bg-[#00a884]/20 border-[#00a884]"
                        : "bg-white border-transparent"
                    )}
                  >
                    {emoji} {ids.length}
                  </button>
                ) : null
              )}
            </div>
          )}

          {/* Hover actions */}
          <div
            className={cn(
              "mt-0.5 flex flex-wrap items-center gap-0.5",
              "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
              isOwn && "justify-end"
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`React with ${emoji}`}
                className="text-base leading-none h-7 w-7 rounded-sm flex items-center justify-center hover:opacity-80"
                onClick={() => onToggleReaction(m.id, emoji)}
              >
                {emoji}
              </button>
            ))}

            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium hover:bg-black/5 transition-colors text-[#667781]"
              onClick={() => onReply(m)}
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>

            {isRoot && !isDM && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium hover:bg-black/5 transition-colors text-[#667781]"
                onClick={onOpenThread}
              >
                {replyCount > 0 ? `${replyCount} in thread` : "Thread"}
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More options"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-sm hover:bg-black/5 transition-colors text-[#667781]"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isOwn ? "end" : "start"}
                className="z-[10055] min-w-[10rem]"
              >
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() =>
                    void navigator.clipboard.writeText((m.body || "").trim() || "(attachment)")
                  }
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy text
                </DropdownMenuItem>
                {isOwn && (
                  <>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(m)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer font-semibold text-red-500"
                      onClick={() => onDelete(m.id)}
                    >
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