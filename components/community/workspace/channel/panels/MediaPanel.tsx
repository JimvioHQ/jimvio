"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ImageIcon, Music, Video } from "lucide-react";
import { ChannelEmptyState } from "../ChannelEmptyState";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import { extractMediaItems } from "@/lib/community/chat/message-experience";
import { FileAttachmentCard } from "@/components/community/chat/message-engine";
import { cn } from "@/lib/utils";

type MediaFilter = "all" | "image" | "video" | "audio";

/** Modern media gallery — images, videos, audio. */
export function MediaPanel({
  roomId,
  onOpenDiscussion,
}: {
  roomId?: string;
  onOpenDiscussion?: () => void;
}) {
  const messages = useRoomMessageIndex((s) =>
    roomId ? (s.byRoom[roomId]?.messages ?? []) : []
  );
  const media = extractMediaItems(messages);
  const [filter, setFilter] = useState<MediaFilter>("all");

  const filtered = useMemo(
    () => (filter === "all" ? media : media.filter((m) => m.kind === filter)),
    [media, filter]
  );

  const counts = useMemo(
    () => ({
      image: media.filter((m) => m.kind === "image").length,
      video: media.filter((m) => m.kind === "video").length,
      audio: media.filter((m) => m.kind === "audio").length,
    }),
    [media]
  );

  if (!roomId || media.length === 0) {
    return (
      <ChannelEmptyState
        icon={ImageIcon}
        title="Media"
        description="Photos, clips, and audio shared in this channel appear here after Discussion loads."
        actionLabel={onOpenDiscussion ? "Open Discussion" : undefined}
        onAction={onOpenDiscussion}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--color-border)] px-3 py-2 scrollbar-hide">
        {(
          [
            { id: "all", label: `All (${media.length})` },
            { id: "image", label: `Images (${counts.image})`, icon: ImageIcon },
            { id: "video", label: `Videos (${counts.video})`, icon: Video },
            { id: "audio", label: `Audio (${counts.audio})`, icon: Music },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
              filter === f.id
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
            )}
          >
            {"icon" in f && f.icon ? <f.icon className="h-3 w-3" /> : null}
            {f.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <ChannelEmptyState
            icon={ImageIcon}
            title="Nothing in this filter"
            description="Try another media type."
            className="py-10"
          />
        ) : (
          <ul
            className="mx-auto grid max-w-4xl grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
            aria-label="Shared media"
          >
            {filtered.map(({ message, attachment, kind }) => (
              <li
                key={`${message.id}-${attachment.url}`}
                className={cn(
                  "group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[var(--color-accent)]/40",
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
                      className="object-cover transition duration-300 group-hover:scale-105"
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
        )}
      </div>
    </div>
  );
}
