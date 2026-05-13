import { cn } from "@/lib/utils";

interface ReplyQuoteProps {
  body: string;
  sender: string;
  isOwn?: boolean;
}

export function ReplyQuote({ body, sender, isOwn }: ReplyQuoteProps) {
  return (
    <div
      className={cn(
        "mb-1.5 rounded-sm overflow-hidden flex border-l-[3px] border-[#00a884]",
        isOwn ? "bg-black/[0.07]" : "bg-black/[0.05]"
      )}
    >
      <div className="px-2.5 py-1.5 min-w-0 flex-1">
        <p className="text-[11px] font-semibold truncate text-[#00a884]">{sender}</p>
        <p className="text-[12px] truncate leading-snug text-[#667781]">
          {body || "📎 Attachment"}
        </p>
      </div>
    </div>
  );
}