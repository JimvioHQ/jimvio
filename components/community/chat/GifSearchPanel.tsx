"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { GifResult } from "@/types";
import { cn } from "@/lib/utils";

interface GifSearchPanelProps {
  onSelect: (gif: GifResult) => void;
  disabled?: boolean;
}

export function GifSearchPanel({ onSelect, disabled }: GifSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const controller = new AbortController();
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/c/chat/gifs?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (res.ok) {
          setResults(data.results ?? []);
          setEnabled(data.enabled !== false);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs…"
          disabled={disabled}
          className={cn(
            "w-full rounded-sm border py-2 pl-9 pr-3 text-sm outline-none",
            "border-[var(--color-border)] bg-[var(--color-surface)]",
            "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
          )}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {!enabled ? (
          <p className="px-2 py-6 text-center text-xs text-[var(--color-text-muted)]">
            GIF search isn&apos;t configured for this community yet.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : results.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-[var(--color-text-muted)]">
            {query ? "No GIFs found." : "Search for a GIF to send."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(gif)}
                className={cn(
                  "overflow-hidden rounded-sm border border-[var(--color-border)]",
                  "transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-50"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- external animated GIFs; next/image would strip animation without unoptimized+remote config */}
                <img
                  src={gif.previewUrl}
                  alt={gif.title}
                  className="h-24 w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
