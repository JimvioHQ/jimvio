"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { ChannelEmptyState } from "../ChannelEmptyState";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import { extractMediaItems } from "@/lib/community/chat/message-experience";
import { FileAttachmentCard } from "@/components/community/chat/message-engine";
import { cn } from "@/lib/utils";

/** Media gallery from the live chat message index. */
export function MediaPanel({ roomId }: { roomId?: string }) {
  const messages = useRoomMessageIndex((s) =>
    roomId ? s.byRoom[roomId]?.messages ?? [] : []
  );
  const media = extractMediaItems(messages);

  if (!roomId || media.length === 0) {
    return (
      <ChannelEmptyState
        icon={ImageIcon}
        title="Media"
        description="Photos, clips, and audio shared in this channel appear here after Discussion loads."
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <ul
        className="mx-auto grid max-w-4xl grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
        aria-label="Shared media"
      >
        {media.map(({ message, attachment, kind }) => (
          <li
            key={`${message.id}-${attachment.url}`}
            className={cn(
              "overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]",
              kind !== "image" && "col-span-2 sm:col-span-1"
            )}
          >
            {kind === "image" ? (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block aspect-square"
              >
                <Image
                  src={attachment.url}
                  alt={attachment.name || "Media"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 25vw"
                  loading="lazy"
                  unoptimized
                />
              </a>
            ) : (
              <div className="p-2">
                <FileAttachmentCard attachment={attachment} compact />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
