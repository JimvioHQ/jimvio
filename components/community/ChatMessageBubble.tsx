import { Download, FileText, CheckCheck } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Reaction = { emoji: string; count: number };

type ChatMessageBubbleProps = {
  author: string;
  role?: "Admin" | "Owner" | null;
  time: string;
  body: string;
  own?: boolean;
  read?: boolean;
  reactions?: Reaction[];
  others?: number;
  file?: { name: string; size: string };
};

const ROLE_STYLES = {
  Admin: "bg-violet-50 text-violet-600",
  Owner: "bg-green-50 text-green-600",
};

export function ChatMessageBubble({
  author,
  role,
  time,
  body,
  own = false,
  read = false,
  reactions = [],
  others = 0,
  file,
}: ChatMessageBubbleProps) {
  if (own) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[75%]">
          <div className="rounded-2xl rounded-br-md bg-green-50 px-3.5 py-2.5">
            <p className="text-sm text-gray-900">{body}</p>
          </div>
          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-gray-400">
            <span>{time}</span>
            {read && <CheckCheck className="h-3.5 w-3.5 text-green-500" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 px-4 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
        {getInitials(author)}
      </span>
      <div className="min-w-0 max-w-[75%]">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-900">{author}</span>
          {role && (
            <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", ROLE_STYLES[role])}>
              {role}
            </span>
          )}
          <span className="text-xs text-gray-400">{time}</span>
        </div>
        <p className="text-sm text-gray-800">{body}</p>
        {file && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2.5">
            <FileText className="h-8 w-8 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{file.size}</p>
            </div>
            <button type="button" aria-label="Download" className="text-gray-400 hover:text-gray-600">
              <Download className="h-4 w-4" />
            </button>
          </div>
        )}
        {reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {reactions.map((r) => (
              <span key={r.emoji} className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs">
                {r.emoji} {r.count}
              </span>
            ))}
            {others > 0 && (
              <span className="text-[11px] text-gray-400">+{others} reacted</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
