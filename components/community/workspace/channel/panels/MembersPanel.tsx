"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { ChannelEmptyState } from "../ChannelEmptyState";

export type ChannelMemberRow = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role?: string | null;
  status?: string | null;
};

/**
 * Reusable member directory foundation.
 * Search + pagination hooks are ready; Phase 1 ships empty / list-ready UI.
 */
export function MembersPanel({
  members = [],
  pageSize = 24,
}: {
  members?: ChannelMemberRow[];
  pageSize?: number;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.role ?? "").toLowerCase().includes(q)
    );
  }, [members, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  if (members.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-[var(--color-border)] px-3 py-2.5 sm:px-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search members…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-[#fd5000]/40"
              aria-label="Search members"
            />
          </div>
        </div>
        <ChannelEmptyState
          icon={Users}
          title="Members"
          description="Channel member directory is ready for search and pagination. Connect roster data in a later phase."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--color-border)] px-3 py-2.5 sm:px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search members…"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-[#fd5000]/40"
            aria-label="Search members"
          />
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
        {slice.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--color-surface-secondary)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fd5000]/10 text-[12px] font-bold text-[#fd5000]">
              {m.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                {m.name}
              </p>
              <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                {m.role ?? m.status ?? "Member"}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2 text-[12px] text-[var(--color-text-muted)]">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="font-semibold disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
