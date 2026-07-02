"use client";

import { useRef, useState } from "react";
import { Clock, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SmartSearchBar({
  value,
  onChange,
  onSearch,
  suggestions = [],
  recentSearches = [],
  loading,
  placeholder = "Search by name, PID, SKU, supplier, warehouse, category…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
  suggestions?: string[];
  recentSearches?: string[];
  loading?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const showDropdown = focused && (suggestions.length > 0 || (recentSearches.length > 0 && !value));

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={ref}
        inputSize="sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
          if (e.key === "Escape") {
            onChange("");
            ref.current?.blur();
          }
        }}
        placeholder={placeholder}
        icon={<Search className="h-4 w-4 shrink-0 opacity-60" strokeWidth={2} />}
        iconRight={
          value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex h-5 w-5 items-center justify-center rounded-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          ) : undefined
        }
        className="h-10 rounded-sm bg-[var(--color-surface)]/90 backdrop-blur-md border-[var(--color-border)]"
      />

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-lg overflow-hidden">
          {suggestions.length > 0 && (
            <div className="p-1">
              <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Suggestions
              </p>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-[12px] rounded-sm hover:bg-[var(--color-surface-secondary)] truncate"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(s);
                    onSearch();
                  }}
                >
                  <Search className="inline h-3 w-3 mr-1.5 opacity-50" />
                  {s}
                </button>
              ))}
            </div>
          )}
          {recentSearches.length > 0 && !value && (
            <div className="p-1 border-t border-[var(--color-border)]">
              <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Recent
              </p>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-[12px] rounded-sm hover:bg-[var(--color-surface-secondary)] truncate"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(s);
                    onSearch();
                  }}
                >
                  <Clock className="inline h-3 w-3 mr-1.5 opacity-50" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
      )}
    </div>
  );
}
