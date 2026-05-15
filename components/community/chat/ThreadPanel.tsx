import { ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { Msg } from "@/types";
import { FileIcon, Loader2, Paperclip, Send, Smile, X } from "lucide-react";
import { useRef } from "react";
import { MessageRow } from "./MessageRow";
import { WaIconBtn } from "./WaIconBtn";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ThreadPanelProps {
  threadRoot: Msg;
  threadReplies: Msg[];
  threadBottomRef: React.RefObject<HTMLDivElement | null>;
  userId: string | null;
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
}

export function ThreadPanel({
  threadRoot,
  threadReplies,
  threadBottomRef,
  userId,
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
}: ThreadPanelProps) {
  const threadFileRef = useRef<HTMLInputElement>(null);
  const MAX_ATTACH = 6;

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col min-h-0",
        "absolute inset-0 z-30 lg:static lg:inset-auto lg:z-auto lg:w-[360px]",
        "bg-[var(--color-surface)] border-l border-[var(--color-border)]"
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 shrink-0",
          "bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]"
        )}
      >
        <div>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            Thread
          </span>
          <p className="text-xs text-[var(--color-text-muted)]">
            {threadReplies.length} repl
            {threadReplies.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close thread"
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-sm",
            "text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors"
          )}
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Messages ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-[var(--color-bg)]">
        <MessageRow
          m={threadRoot}
          isOwn={!!userId && threadRoot.sender_id === userId}
          userId={userId}
          onOpenThread={() => {}}
          onToggleReaction={onToggleReaction}
          onDelete={onDelete}
          onEdit={onEdit}
          onReply={(msg) => {
            onReply(msg);
            onClose();
          }}
        />
        <div className="pt-2 space-y-1 border-t border-[var(--color-border)]">
          {threadReplies.map((r) => (
            <MessageRow
              key={r.id}
              m={r}
              compact
              isOwn={!!userId && r.sender_id === userId}
              userId={userId}
              onOpenThread={() => {}}
              onToggleReaction={onToggleReaction}
              onDelete={onDelete}
              onEdit={onEdit}
              onReply={() => {}}
            />
          ))}
          <div ref={threadBottomRef} />
        </div>
      </div>

      {/* ── Input zone ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "border-t border-[var(--color-border)] p-3 space-y-2 shrink-0",
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

        {/* Pending attachments */}
        {pendingThread.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendingThread.map((a, i) => (
              <span
                key={`${a.url}-${i}`}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-sm",
                  "bg-[var(--color-surface)] border border-[var(--color-border)]",
                  "text-[var(--color-text-primary)]"
                )}
              >
                <FileIcon className="h-3 w-3 text-[var(--color-accent)]" />
                <span className="truncate max-w-[120px]">{a.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${a.name}`}
                  onClick={() =>
                    setPendingThread((p) => p.filter((_, j) => j !== i))
                  }
                >
                  <X className="h-3 w-3 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input row */}
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

          {/* Textarea */}
          <div
            className={cn(
              "flex-1 rounded-lg px-4 py-2",
              "bg-[var(--color-surface)] border border-[var(--color-border)]"
            )}
          >
            <Textarea
              rows={2}
              placeholder="Reply in thread…"
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

          {/* Send button */}
          <button
            type="button"
            aria-label="Send thread reply"
            className={cn(
              "h-10 w-10 shrink-0 flex items-center justify-center rounded-full",
              "bg-[var(--color-accent)] text-white",
              "disabled:opacity-50 transition-all hover:scale-105"
            )}
            onClick={onSendReply}
            disabled={
              sending ||
              (!threadReplyText.trim() && pendingThread.length === 0)
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