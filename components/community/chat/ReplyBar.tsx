import { parseAttachments } from "@/lib/utils";
import { Msg } from "@/types";
import { replyAuthorLabel } from "@/lib/community/chat/message-experience";
import { X } from "lucide-react";

interface ReplyBarProps {
  msg: Msg;
  onClose: () => void;
  mode?: "reply" | "forward";
}

export function ReplyBar({ msg, onClose, mode = "reply" }: ReplyBarProps) {
  const sender = replyAuthorLabel(null, msg);
  const preview =
    msg.body?.trim() ||
    (parseAttachments(msg.attachments).length ? "📎 Attachment" : "Message");

  return (
    <div
      className="flex items-center gap-2 border-b border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1 border-l-[3px] border-[#FF5A1F] pl-2.5">
        <p className="text-[11px] font-semibold text-[#FF5A1F]">
          {mode === "forward" ? "Forwarding" : "Replying to"}{" "}
          <span className="text-[#111827]">{sender}</span>
        </p>
        <p className="truncate text-[12px] text-[#6B7280]">{preview}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={mode === "forward" ? "Cancel forward" : "Cancel reply"}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-[#E5E7EB]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
