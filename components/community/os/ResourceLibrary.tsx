"use client";

import { useMemo, useState } from "react";
import {
  Download,
  FileText,
  Film,
  ImageIcon,
  Link2,
  LayoutTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import {
  classifyFile,
  extractFileItems,
  extractMediaItems,
} from "@/lib/community/chat/message-experience";
import { FileAttachmentCard } from "@/components/community/chat/message-engine";
import {
  RESOURCE_LIBRARY_SHELVES,
  type ResourceLibraryShelf,
} from "@/lib/community/os";
import { ChannelEmptyState } from "@/components/community/workspace/channel/ChannelEmptyState";

const SHELF_META: Record<
  ResourceLibraryShelf,
  { label: string; icon: typeof FileText }
> = {
  pdf: { label: "PDF Library", icon: FileText },
  video: { label: "Video Library", icon: Film },
  image: { label: "Image Library", icon: ImageIcon },
  links: { label: "Links", icon: Link2 },
  templates: { label: "Templates", icon: LayoutTemplate },
  downloads: { label: "Downloads", icon: Download },
};

/**
 * Resource library — aggregates from warm room message indices (no duplicate fetch).
 */
export function ResourceLibrary({
  roomIds,
  title = "Resource Library",
}: {
  roomIds: string[];
  title?: string;
}) {
  const byRoom = useRoomMessageIndex((s) => s.byRoom);
  const [shelf, setShelf] = useState<ResourceLibraryShelf>("pdf");
  const [query, setQuery] = useState("");

  const messages = useMemo(() => {
    const out = [];
    for (const id of roomIds) {
      const slice = byRoom[id]?.messages ?? [];
      out.push(...slice);
    }
    return out;
  }, [byRoom, roomIds]);

  const files = useMemo(() => extractFileItems(messages), [messages]);
  const media = useMemo(() => extractMediaItems(messages), [messages]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows =
      shelf === "pdf"
        ? files.filter((f) => f.kind === "pdf")
        : shelf === "video"
          ? media
              .filter((f) => f.kind === "video")
              .map((m) => ({
                message: m.message,
                attachment: m.attachment,
                kind: m.kind,
              }))
          : shelf === "image"
            ? media
                .filter((f) => f.kind === "image")
                .map((m) => ({
                  message: m.message,
                  attachment: m.attachment,
                  kind: m.kind,
                }))
            : shelf === "templates" || shelf === "downloads"
              ? files.filter(
                  (f) =>
                    f.kind === "document" || f.kind === "other" || f.kind === "pdf"
                )
              : messages
                  .filter((m) => /https?:\/\//i.test(m.body || ""))
                  .slice(0, 40)
                  .map((m) => ({
                    message: m,
                    attachment: {
                      url: (m.body.match(/https?:\/\/[^\s]+/) || [""])[0],
                      name: "Link",
                      mime: "text/uri-list",
                    },
                    kind: "other" as const,
                  }))
                  .filter((x) => x.attachment.url);

    if (!q) return rows;
    return rows.filter((row) => {
      const hay = `${row.attachment?.name ?? ""} ${row.attachment?.url ?? ""} ${row.message?.body ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [shelf, files, media, messages, query]);

  if (roomIds.length === 0) {
    return (
      <ChannelEmptyState
        icon={FileText}
        title={title}
        description="Open channels in this group so the resource index can populate PDFs, videos, images, and downloads."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--color-border)] px-3 py-2">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          {title}
        </p>
        <div className="relative mb-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search library…"
            aria-label="Search resource library"
            className="w-full rounded-md border-0 bg-[var(--color-surface-secondary)] px-3 py-2 text-[12px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {RESOURCE_LIBRARY_SHELVES.map((id) => {
            const Meta = SHELF_META[id];
            const Icon = Meta.icon;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setShelf(id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold",
                  shelf === id
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                )}
              >
                <Icon className="h-3 w-3" />
                {Meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <ChannelEmptyState
            icon={SHELF_META[shelf].icon}
            title={query ? "No matches" : SHELF_META[shelf].label}
            description={
              query
                ? "Try a different search term."
                : "Nothing in this shelf yet. Share files in Discussion to grow the library."
            }
            className="py-10"
          />
        ) : (
          <ul className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
            {items.map((item, i) => (
              <li key={`${item.message.id}-${item.attachment.url}-${i}`}>
                {shelf === "links" ? (
                  <a
                    href={item.attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
                  >
                    {item.attachment.url}
                  </a>
                ) : (
                  <FileAttachmentCard attachment={item.attachment} />
                )}
                <p className="sr-only">{classifyFile(item.attachment)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
