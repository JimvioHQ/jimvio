"use client";

import { useMemo, useState } from "react";
import { FileText, Sparkles, Tags } from "lucide-react";
import { format } from "date-fns";
import { ChannelEmptyState } from "../ChannelEmptyState";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import {
  extractFileItems,
  displayName,
} from "@/lib/community/chat/message-experience";
import { FileAttachmentCard } from "@/components/community/chat/message-engine";
import {
  FILE_CATEGORIES,
  useCollaborationStore,
  type FileCategory,
} from "@/lib/community/knowledge";
import { cn } from "@/lib/utils";

/** Files as reusable assets — preview, category, tags, related + AI placeholders. */
export function FilesPanel({
  roomId,
  canManage,
}: {
  roomId?: string;
  canManage?: boolean;
}) {
  const messages = useRoomMessageIndex((s) =>
    roomId ? (s.byRoom[roomId]?.messages ?? []) : []
  );
  const filesMeta = useCollaborationStore((s) => s.files);
  const upsertFileMeta = useCollaborationStore((s) => s.upsertFileMeta);
  const [categoryFilter, setCategoryFilter] = useState<FileCategory | "all">(
    "all"
  );

  const files = useMemo(() => {
    const items = extractFileItems(messages).filter(
      (f) => f.kind === "pdf" || f.kind === "document" || f.kind === "other"
    );
    return items.map((item) => {
      const key = `${item.message.id}::${item.attachment.url}`;
      const meta = filesMeta.find((f) => f.key === key);
      return { ...item, key, meta };
    });
  }, [messages, filesMeta]);

  const filtered =
    categoryFilter === "all"
      ? files
      : files.filter((f) => (f.meta?.category ?? "general") === categoryFilter);

  if (!roomId || files.length === 0) {
    return (
      <ChannelEmptyState
        icon={FileText}
        title="Files"
        description="Shared documents become reusable assets with categories, tags, and related discussions. Open Discussion so the index can populate."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--color-border)] px-3 py-2 scrollbar-hide">
        <FilterChip
          active={categoryFilter === "all"}
          onClick={() => setCategoryFilter("all")}
          label="All"
        />
        {FILE_CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            active={categoryFilter === c}
            onClick={() => setCategoryFilter(c)}
            label={c}
          />
        ))}
      </div>

      <ul
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
        aria-label="Shared files"
      >
        {filtered.map(({ message, attachment, key, meta }) => (
          <li
            key={key}
            className="mx-auto max-w-2xl rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <FileAttachmentCard attachment={attachment} />
            <div className="mt-2 space-y-2">
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {displayName(message)} ·{" "}
                {format(new Date(message.created_at), "MMM d, HH:mm")}
              </p>

              {meta?.description ? (
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  {meta.description}
                </p>
              ) : (
                <p className="text-[12px] italic text-[var(--color-text-muted)]">
                  No description yet
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-sm bg-[var(--color-surface-secondary)] px-1.5 py-0.5 font-semibold capitalize text-[var(--color-text-muted)]">
                  <Tags className="h-3 w-3" />
                  {meta?.category ?? "general"}
                </span>
                {(meta?.tags ?? []).map((t) => (
                  <span
                    key={t}
                    className="rounded-sm bg-[var(--color-accent-subtle)] px-1.5 py-0.5 text-[var(--color-accent)]"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              <div className="grid gap-1 text-[11px] text-[var(--color-text-muted)] sm:grid-cols-2">
                <p>Related discussions: #{message.id.slice(0, 6)}</p>
                <p>
                  Related courses:{" "}
                  {(meta?.relatedCourseIds?.length ?? 0) > 0
                    ? meta!.relatedCourseIds.length
                    : "—"}
                </p>
                <p>
                  Related products:{" "}
                  {(meta?.relatedProductIds?.length ?? 0) > 0
                    ? meta!.relatedProductIds.length
                    : "—"}
                </p>
                <p>
                  Related events:{" "}
                  {(meta?.relatedEventIds?.length ?? 0) > 0
                    ? meta!.relatedEventIds.length
                    : "—"}
                </p>
              </div>

              {/* Future-ready AI */}
              <div className="flex flex-wrap gap-1 pt-1">
                {["Summary", "Extract Text", "Generate Quiz", "Generate Flashcards"].map(
                  (label) => (
                    <button
                      key={label}
                      type="button"
                      disabled
                      title={`${label} — coming soon`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-[var(--color-text-muted)] opacity-50"
                    >
                      <Sparkles className="h-3 w-3" />
                      {label}
                    </button>
                  )
                )}
              </div>

              {canManage && roomId && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {FILE_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        upsertFileMeta(key, roomId, message.id, attachment.url, {
                          category: c,
                        })
                      }
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize",
                        (meta?.category ?? "general") === c
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const description = window.prompt(
                        "File description",
                        meta?.description ?? ""
                      );
                      if (description == null) return;
                      upsertFileMeta(key, roomId, message.id, attachment.url, {
                        description,
                      });
                    }}
                    className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]"
                  >
                    Edit description
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const raw = window.prompt(
                        "Tags (comma-separated)",
                        (meta?.tags ?? []).join(", ")
                      );
                      if (raw == null) return;
                      const tags = raw
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean);
                      upsertFileMeta(key, roomId, message.id, attachment.url, {
                        tags,
                      });
                    }}
                    className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]"
                  >
                    Edit tags
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize",
        active
          ? "bg-[var(--color-accent)] text-white"
          : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
      )}
    >
      {label}
    </button>
  );
}
