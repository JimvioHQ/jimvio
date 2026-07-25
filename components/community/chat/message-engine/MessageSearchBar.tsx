"use client";

import { cn } from "@/lib/utils";
import type { MessageSearchScope } from "@/lib/community/chat/message-experience";
import { Loader2, Search, X } from "lucide-react";

const SCOPES: { id: MessageSearchScope; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "knowledge", label: "Knowledge" },
  { id: "threads", label: "Threads" },
  { id: "files", label: "Files" },
  { id: "media", label: "Media" },
  { id: "members", label: "Members" },
  { id: "groups", label: "Spaces" },
  { id: "channels", label: "Rooms" },
  { id: "courses", label: "Courses" },
  { id: "products", label: "Products" },
  { id: "services", label: "Services" },
  { id: "affiliates", label: "Affiliates" },
  { id: "creators", label: "Creators" },
  { id: "communities", label: "Communities" },
  { id: "events", label: "Events" },
  { id: "pinned", label: "Pinned" },
];

export function MessageSearchBar({
  open,
  query,
  scope,
  searching,
  onQueryChange,
  onScopeChange,
  onClose,
}: {
  open: boolean;
  query: string;
  scope: MessageSearchScope;
  searching?: boolean;
  onQueryChange: (q: string) => void;
  onScopeChange: (s: MessageSearchScope) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 border-b border-[var(--color-border)] px-3 py-2",
        "bg-[var(--color-surface-secondary)]"
      )}
      role="search"
      aria-label="Search channel"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--color-accent)]" />
          )}
          <input
            type="search"
            placeholder={`Search ${scope}…`}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoFocus
            aria-label={`Search ${scope}`}
            className={cn(
              "w-full rounded-lg border-0 py-2 pl-10 pr-10 text-sm outline-none",
              "bg-[var(--color-surface)] text-[var(--color-text-primary)]",
              "placeholder:text-[var(--color-text-muted)]",
              "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            )}
          />
        </div>
        <button
          type="button"
          className="shrink-0 text-sm font-semibold text-[var(--color-accent)]"
          onClick={onClose}
          aria-label="Close search"
        >
          <span className="inline-flex items-center gap-1">
            <X className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Cancel</span>
          </span>
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Search scope"
        className="flex gap-1 overflow-x-auto scrollbar-hide"
      >
        {SCOPES.map((s) => {
          const active = scope === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onScopeChange(s.id)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                active
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
