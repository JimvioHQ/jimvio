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
        "mb-1.5 overflow-hidden rounded-md flex",
        "border-l-[3px]",
        isOwn
          ? "border-white/70 bg-white/15"
          : "border-[var(--color-accent)] bg-black/[0.04]"
      )}
    >
      <div className="min-w-0 flex-1 px-2.5 py-1.5">
        <p
          className={cn(
            "truncate text-[11px] font-semibold",
            isOwn ? "text-white" : "text-[var(--color-accent)]"
          )}
        >
          {sender}
        </p>
        <p
          className={cn(
            "truncate text-[12px] leading-snug",
            isOwn ? "text-white/85" : "text-[var(--color-text-muted)]"
          )}
        >
          {body || "📎 Attachment"}
        </p>
      </div>
    </div>
  );
}
