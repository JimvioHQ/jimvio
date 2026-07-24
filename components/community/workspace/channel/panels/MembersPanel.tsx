"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Search, Users } from "lucide-react";
import { ChannelEmptyState } from "../ChannelEmptyState";
import { WorkspaceSkeleton } from "@/components/community/workspace/shared/WorkspaceSkeleton";
import { cn } from "@/lib/utils";

export type ChannelMemberRow = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role?: string | null;
  status?: string | null;
  username?: string | null;
  joinedAt?: string | null;
};

const ROLE_STYLE: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-700",
  admin: "bg-[var(--color-accent)]/15 text-[var(--color-accent)]",
  moderator: "bg-sky-500/15 text-sky-700",
  creator: "bg-violet-500/15 text-violet-700",
  member: "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
};

/**
 * Beautiful member directory — roles, status, activity, search.
 */
export function MembersPanel({
  members = [],
  loading = false,
  pageSize = 24,
}: {
  members?: ChannelMemberRow[];
  loading?: boolean;
  pageSize?: number;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const roles = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      if (m.role) set.add(m.role.toLowerCase());
    }
    return ["all", ...Array.from(set).sort()];
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== "all" && (m.role ?? "").toLowerCase() !== roleFilter) {
        return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.role ?? "").toLowerCase().includes(q) ||
        (m.username ?? "").toLowerCase().includes(q)
      );
    });
  }, [members, query, roleFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-[var(--color-border)] px-3 py-2.5 sm:px-4">
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
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-[var(--color-accent)]/40"
            aria-label="Search members"
          />
        </div>
        {roles.length > 1 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRoleFilter(r);
                  setPage(0);
                }}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize",
                  roleFilter === r
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <WorkspaceSkeleton rows={6} />
      ) : members.length === 0 ? (
        <ChannelEmptyState
          icon={Users}
          title="Members"
          description="Member roster will appear once community memberships load."
        />
      ) : filtered.length === 0 ? (
        <ChannelEmptyState
          icon={Users}
          title="No matches"
          description="Try another name or role filter."
          className="py-10"
        />
      ) : (
        <>
          <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
            {slice.map((m) => {
              const role = (m.role ?? "member").toLowerCase();
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[var(--color-surface-secondary)]"
                >
                  {m.avatarUrl ? (
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--color-border)]">
                      <Image
                        src={m.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                        unoptimized
                      />
                    </span>
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[13px] font-bold text-[var(--color-accent)]">
                      {m.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                        {m.name}
                      </p>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          ROLE_STYLE[role] ?? ROLE_STYLE.member
                        )}
                      >
                        {m.role ?? "Member"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                      {m.status === "active" ? "Active" : m.status ?? "Member"}
                      {m.joinedAt
                        ? ` · joined ${formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}`
                        : ""}
                      {m.username ? ` · @${m.username}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
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
        </>
      )}
    </div>
  );
}
