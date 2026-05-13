import { parseAttachments } from "@/lib/utils";
import { Msg } from "@/types";
import { X } from "lucide-react";

interface ReplyBarProps {
  msg: Msg;
  onClose: () => void;
}

export function ReplyBar({ msg, onClose }: ReplyBarProps) {
  const sender = msg.profiles?.full_name || msg.profiles?.username || "Member";
  const preview =
    msg.body?.trim() ||
    (parseAttachments(msg.attachments).length ? "📎 Attachment" : "Message");
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#f0f2f5] border-b border-[#d1d7db]">
      <div className="flex-1 min-w-0 pl-2.5 border-l-[3px] border-[#00a884]">
        <p className="text-[11px] font-semibold truncate text-[#00a884]">{sender}</p>
        <p className="text-[12px] truncate text-[#667781]">{preview}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cancel reply"
        className="shrink-0 h-7 w-7 flex items-center justify-center rounded-sm hover:bg-black/5"
      >
        <X className="h-4 w-4 text-[#667781]" />
      </button>
    </div>
  );
}