"use client";

import { FileText } from "lucide-react";
import { ChannelEmptyState } from "../ChannelEmptyState";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import { extractFileItems } from "@/lib/community/chat/message-experience";
import { FileAttachmentCard } from "@/components/community/chat/message-engine";
import { displayName } from "@/lib/community/chat/message-experience";
import { format } from "date-fns";

/** Files tab — rich cards from the live message index (no duplicate fetch). */
export function FilesPanel({ roomId }: { roomId?: string }) {
  const messages = useRoomMessageIndex((s) =>
    roomId ? s.byRoom[roomId]?.messages ?? [] : []
  );
  const files = extractFileItems(messages).filter(
    (f) => f.kind === "pdf" || f.kind === "document" || f.kind === "other"
  );

  if (!roomId || files.length === 0) {
    return (
      <ChannelEmptyState
        icon={FileText}
        title="Files"
        description="Shared documents, PDFs, and downloads will live here. Open Discussion so the channel index can populate, then return."
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <ul className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2" aria-label="Shared files">
        {files.map(({ message, attachment }) => (
          <li key={`${message.id}-${attachment.url}`} className="space-y-1.5">
            <FileAttachmentCard attachment={attachment} />
            <p className="px-0.5 text-[11px] text-[var(--color-text-muted)]">
              {displayName(message)} ·{" "}
              {format(new Date(message.created_at), "MMM d, HH:mm")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
