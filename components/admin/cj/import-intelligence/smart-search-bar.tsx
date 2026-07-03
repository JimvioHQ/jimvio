"use client";

import { useRef, useState } from "react";
import { Clock, Search, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SmartSearchBar({
  value,
  onChange,
  onSearch,
  suggestions = [],
  recentSearches = [],
  loading,
  placeholder = "Search PID, SKU, name, supplier, warehouse, category…",
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
  const showDropdown =
    focused && (suggestions.length > 0 || (recentSearches.length > 0 && !value));

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-[12px] border bg-white px-3 transition-all",
          focused
            ? "border-[#FF5A1F]/40 shadow-[0_0_0_3px_rgba(255,90,31,0.08)]"
            : "border-[#E5E7EB]"
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-[#9CA3AF]" strokeWidth={2} />
        <input
          ref={ref}
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
          className="min-w-0 flex-1 bg-transparent text-[12px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex h-5 w-5 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111827]"
            aria-label="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {loading && (
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#FF5A1F] border-t-transparent" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-40 mt-1.5 overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white/95 shadow-[0_12px_40px_rgba(17,24,39,0.12)] backdrop-blur-xl">
          {suggestions.length > 0 && (
            <div className="p-1.5">
              <p className="flex items-center gap-1 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                <Sparkles className="h-3 w-3" />
                Suggestions
              </p>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="w-full truncate rounded-[10px] px-2.5 py-2 text-left text-[12px] text-[#374151] hover:bg-[#F9FAFB]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(s);
                    onSearch();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {recentSearches.length > 0 && !value && (
            <div className="border-t border-[#F3F4F6] p-1.5">
              <p className="flex items-center gap-1 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                <Clock className="h-3 w-3" />
                Recent
              </p>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="w-full truncate rounded-[10px] px-2.5 py-2 text-left text-[12px] text-[#374151] hover:bg-[#F9FAFB]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(s);
                    onSearch();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
