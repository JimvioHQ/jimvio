"use client";

import { ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { Msg } from "@/types";
import {
  CheckCircle2,
  FileIcon,
  Loader2,
  Paperclip,
  Pin,
  Send,
  Smile,
  X,
} from "lucide-react";
import { useMemo, useRef } from "react";
import { MessageRow } from "./MessageRow";
import { WaIconBtn } from "./WaIconBtn";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { displayName } from "@/lib/community/chat/message-experience";

interface ThreadPanelProps {
  threadRoot: Msg;
  threadReplies: Msg[];
  threadBottomRef: React.RefObject<HTMLDivElement | null>;
  userId: string | null;
  isStaff?: boolean;
  threadReplyText: string;
  setThreadReplyText: (v: string) => void;
  pendingThread: ChatAttachmentPayload[];
  setPendingThread: React.Dispatch<React.SetStateAction<ChatAttachmentPayload[]>>;
  sending: boolean;
  uploading: boolean;
  onClose: () => void;
  onSendReply: () => void;
  onToggleReaction: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onEdit: (msg: Msg) => void;
  onReply: (msg: Msg) => void;
  onOpenEmojiPicker: () => void;
  onAttachFile: (files: FileList | null) => void;
  onOpenAi?: (msg: Msg) => void;
  onTogglePin?: (id: string, pin: boolean) => void;
}

export function ThreadPanel({
  threadRoot,
  threadReplies,
  threadBottomRef,
  userId,
  isStaff,
  threadReplyText,
  setThreadReplyText,
  pendingThread,
  setPendingThread,
  sending,
  onClose,
  onSendReply,
  onToggleReaction,
  onDelete,
  onEdit,
  onReply,
  onOpenEmojiPicker,
  onAttachFile,
  onOpenAi,
  onTogglePin,
}: ThreadPanelProps) {
  const threadFileRef = useRef<HTMLInputElement>(null);
  const MAX_ATTACH = 6;

  const participants = useMemo(() => {
    const map = new Map<string, string>();
    map.set(threadRoot.sender_id, displayName(threadRoot));
    for (const r of threadReplies) {
      map.set(r.sender_id, displayName(r));
    }
    return [...map.values()];
  }, [threadRoot, threadReplies]);

  const lastReply = threadReplies[threadReplies.length - 1];
  const solved = !!threadRoot.thread_solved;
  const pinned = !!threadRoot.is_pinned;

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col min-h-0",
        "absolute inset-0 z-30 lg:static lg:inset-auto lg:z-auto lg:w-[360px]",
        "bg-[var(--color-surface)] border-l border-[var(--color-border)]"
      )}
      aria-label="Thread"
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between px-4 py-3",
          "border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
        )}
      >
        <div className="min-w-0">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            Thread
          </span>
          <p className="truncate text-xs text-[var(--color-text-muted)]">
            {threadReplies.length}{" "}
            {threadReplies.length === 1 ? "reply" : "replies"}
            {participants.length > 0
              ? ` · ${participants.length} participant${participants.length === 1 ? "" : "s"}`
              : ""}
            {lastReply
              ? ` · last ${new Date(lastReply.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {solved && (
              <span className="inline-flex items-center gap-0.5 rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Solved
              </span>
            )}
            {pinned && (
              <span className="inline-flex items-center gap-0.5 rounded-sm bg-[var(--color-accent-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close thread"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-sm",
            "text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)]"
          )}
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--color-bg)] p-4">
        <MessageRow
          m={threadRoot}
          isOwn={!!userId && threadRoot.sender_id === userId}
          userId={userId}
          isStaff={isStaff}
          onOpenThread={() => {}}
          onToggleReaction={onToggleReaction}
          onDelete={onDelete}
          onEdit={onEdit}
          onReply={(msg) => {
            onReply(msg);
            onClose();
          }}
          onOpenAi={onOpenAi}
          onTogglePin={onTogglePin}
        />
        <div className="space-y-1 border-t border-[var(--color-border)] pt-2">
          {threadReplies.map((r) => (
            <MessageRow
              key={r.id}
              m={r}
              compact
              isOwn={!!userId && r.sender_id === userId}
              userId={userId}
              isStaff={isStaff}
              onOpenThread={() => {}}
              onToggleReaction={onToggleReaction}
              onDelete={onDelete}
              onEdit={onEdit}
              onReply={() => {}}
              onOpenAi={onOpenAi}
            />
          ))}
          <div ref={threadBottomRef} />
        </div>
      </div>

      <div
        className={cn(
          "shrink-0 space-y-2 border-t border-[var(--color-border)] p-3",
          "bg-[var(--color-surface-secondary)]",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        )}
      >
        <input
          ref={threadFileRef}
          type="file"
          className="hidden"
          onChange={(e) => onAttachFile(e.target.files)}
        />

        {pendingThread.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendingThread.map((a, i) => (
              <span
                key={`${a.url}-${i}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] font-semibold",
                  "border border-[var(--color-border)] bg-[var(--color-surface)]",
                  "text-[var(--color-text-primary)]"
                )}
              >
                <FileIcon className="h-3 w-3 text-[var(--color-accent)]" />
                <span className="max-w-[120px] truncate">{a.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${a.name}`}
                  onClick={() =>
                    setPendingThread((p) => p.filter((_, j) => j !== i))
                  }
                >
                  <X className="h-3 w-3 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-danger)]" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <WaIconBtn
            aria-label="Attach file to thread"
            onClick={() => threadFileRef.current?.click()}
            disabled={pendingThread.length >= MAX_ATTACH}
          >
            <Paperclip className="h-5 w-5" />
          </WaIconBtn>
          <WaIconBtn aria-label="Emoji picker" onClick={onOpenEmojiPicker}>
            <Smile className="h-5 w-5" />
          </WaIconBtn>

          <div
            className={cn(
              "flex-1 rounded-lg px-4 py-2",
              "border border-[var(--color-border)] bg-[var(--color-surface)]"
            )}
          >
            <Textarea
              rows={2}
              placeholder="Reply in thread…"
              aria-label="Thread reply"
              className={cn(
                "w-full resize-none border-0 bg-transparent p-0 text-sm",
                "focus-visible:ring-0",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
              )}
              value={threadReplyText}
              onChange={(e) => setThreadReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSendReply();
                }
              }}
            />
          </div>

          <button
            type="button"
            aria-label="Send thread reply"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              "bg-[var(--color-accent)] text-white",
              "transition-all hover:scale-105 disabled:opacity-50"
            )}
            onClick={onSendReply}
            disabled={
              sending || (!threadReplyText.trim() && pendingThread.length === 0)
            }
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
