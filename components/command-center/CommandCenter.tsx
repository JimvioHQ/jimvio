"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Command, Loader2, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { pushCommandRecent, clearCommandRecents, readCommandRecents } from "@/lib/command-center/recents";
import { pushRecentAction } from "@/lib/jimvio-os/workspace-memory";
import { getStaticCommandById } from "@/lib/command-center/commands";
import { NL_SUGGESTION_CHIPS, ACTION_SUGGESTION_CHIPS } from "@/lib/command-center/suggestion-chips";
import type { CommandResult } from "@/lib/command-center/types";
import {
  useCommandCenterStore,
  type CommandCenterFilter,
} from "@/lib/store/use-command-center-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { addNavSearchHistory } from "@/lib/marketplace-search-history";
import { CommandCenterResultItem } from "./CommandCenterResultItem";
import { useCommandCenterSearch } from "./use-command-center-search";

const FILTERS: Array<{ id: CommandCenterFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "commands", label: "Commands" },
  { id: "products", label: "Products" },
  { id: "campaigns", label: "Campaigns" },
  { id: "communities", label: "Communities" },
  { id: "members", label: "Creators" },
  { id: "orders", label: "Orders" },
  { id: "messages", label: "Messages" },
  { id: "content", label: "Spaces & Live" },
  { id: "ai", label: "AI" },
];

const EMPTY_SHORTCUTS: Array<{ label: string; href?: string; query?: string; actionId?: string }> = [
  { label: "Search Marketplace", href: "/marketplace" },
  { label: "Browse Communities", href: "/communities" },
  { label: "Browse Campaigns", href: "/ugc" },
  { label: "Jump to Orders", href: "/orders" },
  { label: "Open Wallet", href: "/wallet" },
  { label: "Run a command", query: "go live" },
];

function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function ResultSkeleton() {
  return (
    <div className="space-y-2 px-1 py-1" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <div className="size-10 shrink-0 animate-pulse rounded-xl bg-[var(--color-surface-secondary)]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommandCenter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isOpen = useCommandCenterStore((s) => s.isOpen);
  const query = useCommandCenterStore((s) => s.query);
  const filter = useCommandCenterStore((s) => s.filter);
  const activeIndex = useCommandCenterStore((s) => s.activeIndex);
  const setQuery = useCommandCenterStore((s) => s.setQuery);
  const setFilter = useCommandCenterStore((s) => s.setFilter);
  const setActiveIndex = useCommandCenterStore((s) => s.setActiveIndex);
  const closeCommandCenter = useCommandCenterStore((s) => s.closeCommandCenter);
  const openAssistant = useAIStore((s) => s.openAssistant);

  const { groups, flat, loading, error, retry } = useCommandCenterSearch(query, filter, refreshKey);

  const hasQuery = query.trim().length > 0;
  const suggestedGroup = groups.find((g) => g.id === "suggested" || g.id === "recent");
  const hasRecents =
    (suggestedGroup?.items.length ?? 0) > 0 || readCommandRecents().length > 0;

  const execute = useCallback(
    (item: CommandResult) => {
      pushCommandRecent({
        id: item.id,
        kind: item.kind,
        title: item.title,
        subtitle: item.subtitle,
        href: item.href,
      });
      pushRecentAction({ id: item.id, label: item.title, href: item.href });

      if (
        item.actionId === "open-ai" ||
        item.kind === "ai" ||
        item.kind === "ai-answer"
      ) {
        closeCommandCenter();
        openAssistant(query.trim() || undefined);
        return;
      }

      if (query.trim()) addNavSearchHistory(query.trim());

      closeCommandCenter();

      if (item.href) {
        router.push(item.href);
      }
    },
    [closeCommandCenter, openAssistant, query, router],
  );

  useEffect(() => {
    if (activeIndex >= flat.length) {
      setActiveIndex(Math.max(0, flat.length - 1));
    }
  }, [activeIndex, flat.length, setActiveIndex]);

  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      const el = triggerRef.current;
      if (el instanceof HTMLElement) {
        requestAnimationFrame(() => el.focus?.());
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const active = el.querySelector('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, flat]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const idx = FILTERS.findIndex((f) => f.id === filter);
      const next = e.shiftKey
        ? FILTERS[(idx - 1 + FILTERS.length) % FILTERS.length]
        : FILTERS[(idx + 1) % FILTERS.length];
      setFilter(next.id);
      return;
    }

    if (
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      document.activeElement !== inputRef.current &&
      /^Digit[1-9]$/.test(e.code)
    ) {
      const target = FILTERS[Number(e.code.slice(5)) - 1];
      if (target) {
        e.preventDefault();
        setFilter(target.id);
        return;
      }
    }

    if (!flat.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(Math.min(activeIndex + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(flat.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) execute(item);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  const modKey = isMacPlatform() ? "⌘" : "Ctrl";
  const activeOptionId = flat[activeIndex] ? `command-center-option-${flat[activeIndex].id}` : undefined;
  const showZeroResults = !loading && hasQuery && flat.length === 0 && !error;
  const showSkeleton = loading && flat.length === 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-stretch justify-center sm:items-start sm:px-4 sm:pt-[10vh] md:pt-[12vh]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeCommandCenter();
      }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xl motion-reduce:backdrop-blur-none"
        style={{ willChange: "opacity" }}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Jimvio Universal Command Palette"
        onKeyDown={onKeyDown}
        className={cn(
          "relative z-10 flex h-[100dvh] w-full max-w-full flex-col overflow-hidden border border-white/20 dark:border-[var(--color-border)]",
          "rounded-none bg-[var(--color-surface)]/95 shadow-2xl backdrop-blur-2xl",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          "sm:h-auto sm:max-h-[min(72vh,640px)] sm:w-[min(820px,100%)] sm:max-w-[820px] sm:rounded-2xl sm:bg-[var(--color-surface)]/90 sm:pt-0 sm:pb-0",
          "motion-safe:animate-[jimvio-command-center-enter_220ms_ease-out]",
        )}
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-3 sm:px-4">
          <Search className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search globally or run a command…"
            aria-label="Search globally or run a command"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="command-center-listbox"
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
          {loading && <Loader2 className="size-4 shrink-0 animate-spin text-[var(--color-text-muted)]" aria-hidden />}
          <kbd className="hidden rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)] sm:inline">
            {modKey}K
          </kbd>
          <button
            type="button"
            onClick={closeCommandCenter}
            aria-label="Close command center"
            className="grid size-9 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] sm:size-8"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-3 py-2 sm:px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-[transform,background-color] duration-150 motion-reduce:transition-none",
                filter === f.id
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:scale-[1.02] motion-reduce:hover:scale-100",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div
          ref={listRef}
          id="command-center-listbox"
          role="listbox"
          aria-label="Command center results"
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-2 sm:px-3"
        >
          {error && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left dark:border-red-500/30 dark:bg-red-500/10">
              <p className="text-[12px] font-medium text-red-700 dark:text-red-300">
                Search hit a snag. Commands and navigation still work.
              </p>
              <button
                type="button"
                onClick={retry}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-red-700 shadow-sm dark:bg-red-500/20 dark:text-red-200"
              >
                <RefreshCw className="size-3" />
                Retry
              </button>
            </div>
          )}

          {showSkeleton && <ResultSkeleton />}

          {groups.length > 0 && (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id}>
                  <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const index = flat.findIndex((f) => f.id === item.id);
                      return (
                        <CommandCenterResultItem
                          key={item.id}
                          item={item}
                          active={index === activeIndex}
                          onHover={() => setActiveIndex(index)}
                          onSelect={() => execute(item)}
                          onPinToggle={() => setRefreshKey((k) => k + 1)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showZeroResults && (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <Command className="mb-3 size-8 text-[var(--color-text-muted)]" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">No results found</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Try another keyword, or jump to a useful destination.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                {EMPTY_SHORTCUTS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      if (s.query) {
                        setQuery(s.query);
                        return;
                      }
                      if (s.href) {
                        closeCommandCenter();
                        router.push(s.href);
                      }
                    }}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[#FF5A1F]/30 hover:text-[#FF5A1F]"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <SuggestionChipRail
                className="mt-4"
                onSetQuery={setQuery}
                onExecute={execute}
              />
            </div>
          )}

          {!loading && !hasQuery && (
            <div className="mt-1 px-2">
              <p className="mb-1.5 px-0 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Try asking
              </p>
              <div className="flex flex-wrap gap-1.5 pb-1">
                {NL_SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => chip.type === "query" && setQuery(chip.query)}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition-[transform,background-color] duration-150 hover:scale-[1.02] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] motion-reduce:hover:scale-100"
                  >
                    <Sparkles className="mr-1 inline size-3 -translate-y-px" />
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] px-3 py-2 text-[10px] text-[var(--color-text-muted)] sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1 sm:inline-flex">
              <kbd className="rounded border border-[var(--color-border)] px-1">↑</kbd>
              <kbd className="rounded border border-[var(--color-border)] px-1">↓</kbd>
              navigate
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              <kbd className="rounded border border-[var(--color-border)] px-1">↵</kbd>
              select
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              <kbd className="rounded border border-[var(--color-border)] px-1">Tab</kbd>
              filter
            </span>
            {hasRecents && (
              <button
                type="button"
                onClick={() => {
                  clearCommandRecents();
                  setRefreshKey((k) => k + 1);
                }}
                className="rounded-full px-2 py-0.5 font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              >
                Clear recents
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              closeCommandCenter();
              openAssistant();
            }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-[var(--color-accent)] transition-[transform] hover:scale-[1.02] motion-reduce:hover:scale-100"
          >
            <Sparkles className="size-3" />
            Open AI
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SuggestionChipRail({
  className,
  onSetQuery,
  onExecute,
}: {
  className?: string;
  onSetQuery: (query: string) => void;
  onExecute: (item: CommandResult) => void;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}>
      {ACTION_SUGGESTION_CHIPS.map((chip) => {
        const command = chip.type === "command" ? getStaticCommandById(chip.commandId) : undefined;
        if (!command) return null;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onExecute(command)}
            className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 px-3 py-1 text-[11px] font-semibold text-[var(--color-accent)] transition-[transform,background-color] duration-150 hover:scale-[1.02] hover:bg-[var(--color-accent)]/15"
          >
            {chip.label}
          </button>
        );
      })}
      {NL_SUGGESTION_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => chip.type === "query" && onSetQuery(chip.query)}
          className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition-[transform,background-color] duration-150 hover:scale-[1.02] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
