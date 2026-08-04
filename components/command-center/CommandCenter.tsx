"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Command, Loader2, Search, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { pushCommandRecent, clearCommandRecents } from "@/lib/command-center/recents";
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

function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function CommandCenter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
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

  const { groups, flat, loading } = useCommandCenterSearch(query, filter, refreshKey);

  const hasQuery = query.trim().length > 0;
  const recentGroup = groups.find((g) => g.id === "recent");
  const hasRecents = (recentGroup?.items.length ?? 0) > 0;

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
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
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
    // Tab / Shift+Tab always cycles the filter pills — this also acts as
    // the dialog's focus trap since focus never leaves the search input.
    if (e.key === "Tab") {
      e.preventDefault();
      const idx = FILTERS.findIndex((f) => f.id === filter);
      const next = e.shiftKey
        ? FILTERS[(idx - 1 + FILTERS.length) % FILTERS.length]
        : FILTERS[(idx + 1) % FILTERS.length];
      setFilter(next.id);
      return;
    }

    // Optional digit shortcuts (1-9) for filters — only when the user isn't
    // actively typing in the search field, so plain typing is never hijacked.
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
  const showZeroResults = !loading && hasQuery && flat.length === 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center px-3 pt-[10vh] sm:px-4 sm:pt-[12vh]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeCommandCenter();
      }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xl"
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
          "relative z-10 flex w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-white/20",
          "bg-white/85 shadow-2xl backdrop-blur-2xl dark:bg-[var(--color-surface)]/90",
        )}
        style={{
          maxHeight: "min(72vh, 640px)",
          animation: "jimvio-command-center-enter 220ms ease-out",
          willChange: "transform, opacity",
        }}
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-3 sm:px-4">
          <Search className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything or run a command — Create Campaign, Go Live, Withdraw…"
            aria-label="Universal search and commands"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="command-center-listbox"
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
          {loading && <Loader2 className="size-4 shrink-0 animate-spin text-[var(--color-text-muted)]" />}
          <kbd className="hidden rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)] sm:inline">
            {modKey}K
          </kbd>
          <button
            type="button"
            onClick={closeCommandCenter}
            aria-label="Close command center"
            className="grid size-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)]"
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
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-[transform,background-color] duration-150",
                filter === f.id
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:scale-[1.02]",
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
          className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3"
        >
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
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">No results</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Try another keyword, or jump straight to a quick action.
              </p>
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
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition-[transform,background-color] duration-150 hover:scale-[1.02] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
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
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[var(--color-border)] px-1">↑</kbd>
              <kbd className="rounded border border-[var(--color-border)] px-1">↓</kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[var(--color-border)] px-1">↵</kbd>
              select
            </span>
            <span className="inline-flex items-center gap-1">
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
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-[var(--color-accent)] transition-[transform] hover:scale-[1.02]"
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
