"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Tags,
} from "lucide-react";
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

type SortKey = "newest" | "oldest" | "name";
type ViewMode = "list" | "grid";

/** Files as reusable assets — preview, filter, sort, grid/list. */
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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>("list");

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

  const filtered = useMemo(() => {
    let list =
      categoryFilter === "all"
        ? files
        : files.filter(
            (f) => (f.meta?.category ?? "general") === categoryFilter
          );

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((f) => {
        const name = (f.attachment.name || "").toLowerCase();
        const desc = (f.meta?.description || "").toLowerCase();
        const tags = (f.meta?.tags ?? []).join(" ").toLowerCase();
        return name.includes(q) || desc.includes(q) || tags.includes(q);
      });
    }

    return [...list].sort((a, b) => {
      if (sort === "name") {
        return (a.attachment.name || "").localeCompare(b.attachment.name || "");
      }
      const ta = new Date(a.message.created_at).getTime();
      const tb = new Date(b.message.created_at).getTime();
      return sort === "newest" ? tb - ta : ta - tb;
    });
  }, [files, categoryFilter, query, sort]);

  if (!roomId || files.length === 0) {
    return (
      <ChannelEmptyState
        icon={FileText}
        title="Files"
        description="Shared documents become reusable assets with categories, tags, and rich previews. Open Discussion so the index can populate."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-2 border-b border-[var(--color-border)] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Quick search files…"
              aria-label="Search files"
              className="w-full rounded-lg border-0 bg-[var(--color-surface-secondary)] py-1.5 pl-8 pr-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort files"
            className="rounded-lg bg-[var(--color-surface-secondary)] px-2 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)]"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
          </select>
          <div className="flex rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
            <button
              type="button"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={cn(
                "rounded-md p-1.5",
                view === "list"
                  ? "bg-[var(--color-surface)] text-[var(--color-accent)] shadow-sm"
                  : "text-[var(--color-text-muted)]"
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={cn(
                "rounded-md p-1.5",
                view === "grid"
                  ? "bg-[var(--color-surface)] text-[var(--color-accent)] shadow-sm"
                  : "text-[var(--color-text-muted)]"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
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
      </div>

      {filtered.length === 0 ? (
        <ChannelEmptyState
          icon={FileText}
          title="No matches"
          description="Try another filter or search term."
          className="py-10"
        />
      ) : (
        <ul
          className={cn(
            "min-h-0 flex-1 overflow-y-auto p-4",
            view === "grid"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
              : "mx-auto max-w-2xl space-y-4"
          )}
          aria-label="Shared files"
        >
          {filtered.map(({ message, attachment, key, meta }) => (
            <li
              key={key}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-accent)]/30"
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

                <div className="flex flex-wrap gap-1 pt-1">
                  {["Summary", "Extract Text", "Generate Quiz"].map((label) => (
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
                  ))}
                </div>

                {canManage && roomId && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {FILE_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          upsertFileMeta(
                            key,
                            roomId,
                            message.id,
                            attachment.url,
                            { category: c }
                          )
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
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
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
        "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition",
        active
          ? "bg-[var(--color-accent)] text-white"
          : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
      )}
    >
      {label}
    </button>
  );
}
