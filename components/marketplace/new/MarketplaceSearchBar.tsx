"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { marketplaceSearchPlaceholders } from "@/lib/marketplace/experience";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  loading?: boolean;
  type: "physical" | "digital";
  inputId?: string;
};

export function MarketplaceSearchBar({
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onClear,
  loading = false,
  type,
  inputId = "marketplace-search-input",
}: Props) {
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  const suggestions = useMemo(() => marketplaceSearchPlaceholders(type), [type]);
  const current = suggestions[index % suggestions.length];
  const showRotating = value.length === 0 && !focused;
  const showClear = value.length > 0 && Boolean(onClear) && !loading;

  useEffect(() => {
    setIndex(0);
  }, [type]);

  useEffect(() => {
    if (!showRotating) return;
    const id = setInterval(() => {
      setExiting(true);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % suggestions.length);
        setExiting(false);
      }, 350);
    }, 3000);
    return () => clearInterval(id);
  }, [showRotating, suggestions.length]);

  return (
    <div className="relative min-w-0 flex-1">
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true);
          onFocus();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur();
        }}
        onKeyDown={onKeyDown}
        placeholder=" "
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={
          type === "digital"
            ? "Search digital products"
            : "Search physical products"
        }
        aria-busy={loading}
        className={cn(
          "relative z-10 min-w-0 w-full bg-transparent text-sm font-medium text-[var(--color-text-primary)] outline-none",
          "placeholder:text-transparent",
          "focus-visible:ring-0",
        )}
      />

      {showRotating && (
        <div
          className="pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden"
          aria-hidden
        >
          <span
            key={index}
            className="truncate text-sm text-[var(--color-text-muted)]"
            style={{
              transform: exiting ? "translate3d(0, -100%, 0)" : "translate3d(0, 0, 0)",
              opacity: exiting ? 0 : 1,
              transition: exiting
                ? "transform 350ms ease, opacity 350ms ease"
                : undefined,
              animation: exiting ? undefined : "marketplaceSearchPlaceholderIn 350ms ease",
              willChange: "transform, opacity",
            }}
          >
            {current.prefix}{" "}
            <span className="font-semibold text-[var(--color-text-secondary)]">
              {current.label}
            </span>
            ...
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex items-center gap-1">
        {loading && (
          <Loader2
            className="size-4 animate-spin text-[var(--color-accent)]"
            aria-hidden
          />
        )}
        {showClear && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClear}
            className={cn(
              "pointer-events-auto grid size-7 place-items-center rounded-lg text-[var(--color-text-muted)]",
              "transition-[transform,background-color,color] duration-200",
              "hover:scale-105 hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35",
            )}
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function MarketplaceSearchIcon({ active, loading }: { active: boolean; loading?: boolean }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 600);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return <Loader2 className="size-4 shrink-0 animate-spin text-[var(--color-accent)]" />;
  }

  return (
    <Search
      className={cn(
        "size-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-300",
        active ? "text-[var(--color-accent)]" : pulse ? "scale-110" : "scale-100",
      )}
      style={{ willChange: "transform" }}
    />
  );
}

export function marketplaceSearchBarClassName(focused: boolean) {
  return cn(
    "flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm transition-[border-color,box-shadow] duration-300 sm:gap-3 sm:px-4",
    "bg-[var(--color-surface)]/95 backdrop-blur-md",
    focused
      ? "border-[var(--color-accent)]/50 shadow-[0_0_0_3px_rgba(253,80,0,0.1),0_8px_24px_rgba(0,0,0,0.06)]"
      : "border-[var(--color-border)] hover:border-[var(--color-border-strong,var(--color-border))]",
  );
}
