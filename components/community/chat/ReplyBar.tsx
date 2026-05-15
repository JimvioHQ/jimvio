import { parseAttachments } from "@/lib/utils";
import { Msg } from "@/types";
import { X } from "lucide-react";

interface ReplyBarProps {
  msg: Msg;
  onClose: () => void;
}

export function ReplyBar({ msg, onClose }: ReplyBarProps) {
  const sender =
    msg.profiles?.full_name || msg.profiles?.username || "Member";
  const preview =
    msg.body?.trim() ||
    (parseAttachments(msg.attachments).length ? "📎 Attachment" : "Message");

  return (
    <div
      className="flex items-center gap-2 px-3 py-2
                 bg-[var(--color-surface-secondary)]
                 border-b border-[var(--color-border)]"
    >
      <div
        className="flex-1 min-w-0 pl-2.5
                   border-l-[3px] border-[var(--color-accent)]"
      >
        <p className="text-[11px] font-semibold truncate text-[var(--color-accent)]">
          {sender}
        </p>
        <p className="text-[12px] truncate text-[var(--color-text-muted)]">
          {preview}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cancel reply"
        className="shrink-0 h-7 w-7 flex items-center justify-center rounded-sm
                   hover:bg-[var(--color-border)] transition-colors"
      >
        <X className="h-4 w-4 text-[var(--color-text-muted)]" />
      </button>
    </div>
  );
}