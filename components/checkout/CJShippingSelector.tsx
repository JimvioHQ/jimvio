// components/checkout/CJShippingSelector.tsx
"use client";

import React, { useState } from "react";
import {
  Loader2, AlertCircle, Check, Globe, AlertTriangle,
  Clock, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CJShippingOption } from "@/types";
import { CurrencyCode } from "@/lib/currency/config";

interface CJShippingSelectorProps {
  options: CJShippingOption[];
  selected: CJShippingOption | null;
  onSelect: (opt: CJShippingOption) => void;
  loading: boolean;
  error: string;
  formatMoney: (v: number, c: CurrencyCode) => string;
  /** Optional retry callback when error is set */
  onRetry?: () => void;
}

type SortKey = "price" | "speed" | "name";
type SortDir = "asc" | "desc";

export function CJShippingSelector({
  options, selected, onSelect, loading, error, formatMoney, onRetry,
}: CJShippingSelectorProps) {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Loading
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] py-10">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
          <p className="text-[12.5px] text-[var(--color-text-muted)]">
            Calculating shipping rates…
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)]/70">
            This usually takes a few seconds
          </p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-rose-700 dark:text-rose-300">
              Couldn't load shipping rates
            </p>
            <p className="text-[12px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
              Please try again in a moment. If the problem continues, contact support.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 text-[12px] font-semibold text-rose-700 dark:text-rose-300 hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!options.length) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-[var(--color-text-muted)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              No shipping options available
            </p>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
              We couldn't find any shipping methods for your destination. Try a different address, or contact support if this looks wrong.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] text-[12px] font-semibold text-[var(--color-text-primary)] transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Sort
  const sorted = [...options].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "price") cmp = a.priceUSD - b.priceUSD;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    if (sortKey === "speed") {
      const aDays = parseInt(a.arrivalDays?.split(/[-–]/)[0] ?? "999", 10) || 999;
      const bDays = parseInt(b.arrivalDays?.split(/[-–]/)[0] ?? "999", 10) || 999;
      cmp = aDays - bDays;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
  
  const cheapestPrice = Math.min(...options.map((o) => o.priceUSD));
  const fastestDays = Math.min(
    ...options.map((o) =>
      parseInt(o.arrivalDays?.split(/[-–]/)[0] ?? "999", 10) || 999
    )
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="rounded-md border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
      <div className="grid grid-cols-[1fr_120px_80px_110px_44px] gap-2 px-4 py-2.5 bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)] text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        <SortHeader
          label="Shipping method"
          active={sortKey === "name"}
          dir={sortDir}
          onClick={() => toggleSort("name")}
        />
        <SortHeader
          label="Delivery"
          active={sortKey === "speed"}
          dir={sortDir}
          onClick={() => toggleSort("speed")}
          align="left"
        />
        <span>Tracking</span>
        <SortHeader
          label="Cost"
          active={sortKey === "price"}
          dir={sortDir}
          onClick={() => toggleSort("price")}
          align="right"
        />
        <span className="sr-only">Select</span>
      </div>

      {/* Rows */}
      <div role="radiogroup" aria-label="Shipping method">
        {sorted.map((opt, idx) => {
          const isSelected = selected?.optionId === opt.optionId;
          const isCheapest = opt.priceUSD === cheapestPrice && cheapestPrice >= 0;
          const optDays = parseInt(opt.arrivalDays?.split(/[-–]/)[0] ?? "999", 10) || 999;
          const isFastest = optDays === fastestDays;
          const isFree = opt.priceUSD === 0;
          const isLast = idx === sorted.length - 1;

          return (
            <button
              key={opt.optionId}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(opt)}
              className={cn(
                "w-full grid grid-cols-[1fr_120px_80px_110px_44px] gap-2 px-4 py-3.5 text-left transition-colors",
                !isLast && "border-b border-[var(--color-border)]",
                isSelected
                  ? "bg-orange-50/60 dark:bg-orange-950/20"
                  : "bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]/60"
              )}
            >
              {/* Method name + badges */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn(
                    "text-[13px] font-semibold truncate",
                    isSelected ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-primary)]"
                  )}>
                    {opt.name}
                  </span>
                  {isCheapest && options.length > 1 && (
                    <Badge tone="emerald">Cheapest</Badge>
                  )}
                  {isFastest && options.length > 1 && !isCheapest && (
                    <Badge tone="blue">Fastest</Badge>
                  )}
                </div>
                {opt.channelId && opt.channelId !== opt.name && (
                  <p className="text-[10.5px] text-[var(--color-text-muted)] mt-0.5 truncate font-mono">
                    {opt.channelId}
                  </p>
                )}
              </div>

              {/* Delivery time */}
              <div className="flex items-center gap-1 min-w-0">
                <Clock className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
                <span className="text-[12.5px] text-[var(--color-text-primary)] tabular-nums truncate">
                  {opt.arrivalDays
                    ? `${opt.arrivalDays} days`
                    : <span className="text-[var(--color-text-muted)]">Varies</span>}
                </span>
              </div>

              {/* Tracking */}
              <div className="flex items-center">
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                  <Globe className="h-3 w-3" />
                  Full
                </span>
              </div>

              {/* Cost */}
              <div className="text-right">
                {isFree ? (
                  <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    Free
                  </span>
                ) : (
                  <span className="text-[13px] font-bold text-[var(--color-text-primary)] tabular-nums">
                    {formatMoney(opt.priceUSD, "USD")}
                  </span>
                )}
              </div>

              {/* Radio indicator */}
              <div className="flex items-center justify-end">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected
                    ? "border-orange-500 bg-orange-500"
                    : "border-[var(--color-border-strong)] bg-transparent"
                )}>
                  {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer info — appears under the table */}
      <div className="px-4 py-2.5 bg-[var(--color-surface-secondary)]/60 border-t border-[var(--color-border)] flex items-center justify-between gap-3 text-[10.5px] text-[var(--color-text-muted)]">
        <span>
          <strong className="text-[var(--color-text-primary)]">{options.length}</strong> shipping {options.length === 1 ? "option" : "options"} available
        </span>
        <span>Prices in USD · converted at checkout</span>
      </div>
    </div>
  );
}

// ─── Sortable column header ─────────────────────────────────────────────────

function SortHeader({
  label, active, dir, onClick, align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 transition-colors hover:text-[var(--color-text-primary)] cursor-pointer",
        active && "text-[var(--color-text-primary)]",
        align === "right" && "justify-end ml-auto"
      )}
    >
      <span>{label}</span>
      <ArrowUpDown className={cn(
        "h-2.5 w-2.5 transition-opacity",
        active ? "opacity-100" : "opacity-30"
      )} />
    </button>
  );
}

// ─── Badge ──────────────────────────────────────────────────────────────────

function Badge({ children, tone }: { children: React.ReactNode; tone: "emerald" | "blue" | "amber" }) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  };
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
      tones[tone]
    )}>
      {children}
    </span>
  );
}