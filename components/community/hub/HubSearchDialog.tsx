"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Layers,
  Loader2,
  MessageSquare,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SearchType = "posts" | "members" | "spaces" | "rooms";

type SearchResult = {
  id: string;
  type: SearchType;
  title: string;
  subtitle: string | null;
  href: string;
};

const TYPE_META: Record<SearchType, { label: string; icon: typeof Search }> = {
  posts: { label: "Posts", icon: FileText },
  members: { label: "Members", icon: Users },
  spaces: { label: "Spaces", icon: Layers },
  rooms: { label: "Rooms", icon: MessageSquare },
};

export function HubSearchDialog({
  open,
  onClose,
  communityId,
}: {
  open: boolean;
  onClose: () => void;
  communityId?: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) return;

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q, limit: "24" });
        if (communityId) params.set("communityId", communityId);
        const res = await fetch(`/api/c/search?${params}`, { signal: ac.signal });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          setError(json.error ?? "Search failed");
          setResults([]);
          return;
        }
        const json = (await res.json()) as { results: SearchResult[] };
        setResults(json.results ?? []);
        setActive(0);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, open, communityId]);

  const close = useCallback(() => {
    setQuery("");
    setResults([]);
    setActive(0);
    setError(null);
    onClose();
  }, [onClose]);

  const go = useCallback(
    (item: SearchResult) => {
      close();
      router.push(item.href);
    },
    [close, router]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = results[active];
        if (item) go(item);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active, close, go]);

  if (!open) return null;

  const visibleResults = query.trim().length < 1 ? [] : results;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[14vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        aria-label="Close search"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search communities"
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4">
          <Search className="h-4 w-4 shrink-0 text-[#fd5000]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                setResults([]);
                setActive(0);
                setError(null);
              }
            }}
            placeholder="Search posts, members, spaces, rooms…"
            className="h-12 w-full bg-transparent text-[14px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#fd5000]" />
          ) : (
            <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)] sm:inline">
              esc
            </kbd>
          )}
        </div>

        <ul className="max-h-[360px] overflow-y-auto p-1.5">
          {error && (
            <li className="px-3 py-6 text-center text-[12px] text-red-500">{error}</li>
          )}
          {!error && query.trim().length === 0 && (
            <li className="px-3 py-8 text-center text-[12px] text-[var(--color-text-muted)]">
              Type to search across your communities
            </li>
          )}
          {!error && query.trim().length > 0 && !loading && visibleResults.length === 0 && (
            <li className="px-3 py-8 text-center text-[12px] text-[var(--color-text-muted)]">
              No matches for “{query.trim()}”
            </li>
          )}
          {visibleResults.map((item, i) => {
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            return (
              <li key={`${item.type}-${item.id}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    i === active
                      ? "bg-[#fd5000]/10 text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      i === active ? "bg-[#fd5000]/15 text-[#fd5000]" : "bg-[var(--color-surface-secondary)]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="block truncate text-[11px] text-[var(--color-text-muted)]">
                        {item.subtitle}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {meta.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
