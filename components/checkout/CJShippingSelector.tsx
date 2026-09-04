// components/checkout/CJShippingSelector.tsx
"use client";

import React, { useState } from "react";
import {
  Loader2, AlertCircle, Check, Globe, AlertTriangle,
  Clock, ArrowUpDown, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CJShippingOption } from "@/types";
import { CurrencyCode } from "@/lib/currency/config";
import { sanitizeShippingMethodName } from "@/lib/cj/customer-facing";

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
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--color-border)]" />
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent)]" />
          <p className="text-[12.5px] font-medium text-[var(--color-text-muted)]">
            Calculating shipping rates…
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)]/70">
            This usually takes a few seconds
          </p>
        </div>
      </div>
    );
  }

  // Error — distinguish temporary failure vs coverage (message comes from API).
  if (error) {
    const isCoverage = /isn't available to this destination|no shipping|coverage/i.test(error);
    const isTemporary = /temporarily unavailable|taking longer|try again shortly/i.test(error);
    return (
      <div
        className={cn(
          "rounded-xl border p-4",
          isCoverage
            ? "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20"
            : "border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20"
        )}
      >
        <div className="flex items-start gap-3">
          <AlertCircle
            className={cn(
              "h-4 w-4 flex-shrink-0 mt-0.5",
              isCoverage ? "text-amber-600" : "text-rose-600"
            )}
          />
          <div className="flex-1">
            <p
              className={cn(
                "text-[13px] font-semibold",
                isCoverage
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-rose-700 dark:text-rose-300"
              )}
            >
              {isCoverage
                ? "No shipping coverage"
                : isTemporary
                  ? "Shipping temporarily unavailable"
                  : "Couldn't load shipping rates"}
            </p>
            <p
              className={cn(
                "text-[12px] mt-0.5",
                isCoverage
                  ? "text-amber-700/80 dark:text-amber-400/80"
                  : "text-rose-600/80 dark:text-rose-400/80"
              )}
            >
              {error}
            </p>
            {onRetry && !isCoverage && (
              <button
                onClick={onRetry}
                className={cn(
                  "mt-2 text-[12px] font-semibold hover:underline",
                  isTemporary
                    ? "text-rose-700 dark:text-rose-300"
                    : "text-rose-700 dark:text-rose-300"
                )}
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
      <div className="rounded-md border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/15 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              No shipping coverage for this destination
            </p>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
              We couldn&apos;t find a shipping route for these items to your address. Try a different country or contact support.
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
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] max-lg:border-0 max-lg:bg-transparent max-lg:overflow-visible lg:overflow-hidden">
      {/* Mobile premium cards */}
      <div className="space-y-3 max-lg:space-y-3 lg:hidden" role="radiogroup" aria-label="Shipping method">
        {sorted.map((opt) => {
          const isSelected = selected?.optionId === opt.optionId;
          const isCheapest = opt.priceUSD === cheapestPrice && cheapestPrice >= 0;
          const optDays = parseInt(opt.arrivalDays?.split(/[-–]/)[0] ?? "999", 10) || 999;
          const isFastest = optDays === fastestDays;
          const isFree = opt.priceUSD === 0;
          const methodName = sanitizeShippingMethodName(opt.name);

          return (
            <button
              key={opt.optionId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(opt)}
              className={cn(
                "w-full rounded-2xl border-2 p-4 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 active:scale-[0.99]",
                isSelected
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]/55 shadow-[0_6px_24px_rgba(253,80,0,0.14)] ring-2 ring-[var(--color-accent)]/15"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_2px_10px_rgba(0,0,0,0.04)]",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                      : "border-[var(--color-border-strong)] bg-[var(--color-surface)]",
                  )}
                  aria-hidden
                >
                  {isSelected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-accent-light)]">
                  <Truck className="h-5 w-5 text-[var(--color-accent)]" strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[15px] font-semibold leading-snug text-[var(--color-text-primary)]">
                      {methodName}
                    </span>
                    {isCheapest && options.length > 1 && <Badge tone="emerald">Cheapest</Badge>}
                    {isFastest && options.length > 1 && !isCheapest && <Badge tone="blue">Fastest</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                      <Clock className="h-3 w-3 shrink-0" />
                      {opt.arrivalDays ? `${opt.arrivalDays} days` : "Varies"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/80 bg-blue-50/80 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                      <Globe className="h-3 w-3 shrink-0" />
                      Full tracking
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-[var(--color-border)]/80 pt-3">
                <span className="text-[12px] font-medium text-[var(--color-text-muted)]">
                  {isSelected ? "Selected" : "Tap to select"}
                </span>
                {isFree ? (
                  <span className="text-[16px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">Free</span>
                ) : (
                  <span className="text-[16px] font-bold tabular-nums tracking-[-0.02em] text-[var(--color-text-primary)]">
                    {formatMoney(opt.priceUSD, "USD")}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 px-4 py-3 text-[11px] text-[var(--color-text-muted)] lg:hidden">
        <span>
          <strong className="text-[var(--color-text-primary)]">{options.length}</strong> shipping {options.length === 1 ? "option" : "options"} · Prices in USD
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
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
                "w-full grid grid-cols-[1fr_120px_80px_110px_44px] gap-2 px-4 py-3.5 text-left transition-[background-color,transform] duration-200",
                !isLast && "border-b border-[var(--color-border)]",
                isSelected
                  ? "bg-[var(--color-accent-light)]/50"
                  : "bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]/60 hover:scale-[1.002]",
              )}
            >
              {/* Method name + badges */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn(
                    "text-[13px] font-semibold truncate",
                    isSelected ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-primary)]"
                  )}>
                    {sanitizeShippingMethodName(opt.name)}
                  </span>
                  {isCheapest && options.length > 1 && (
                    <Badge tone="emerald">Cheapest</Badge>
                  )}
                  {isFastest && options.length > 1 && !isCheapest && (
                    <Badge tone="blue">Fastest</Badge>
                  )}
                </div>
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
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
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
      <div className="px-4 py-2.5 bg-[var(--color-surface-secondary)]/60 border-t border-[var(--color-border)] flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[10.5px] text-[var(--color-text-muted)]">
        <span>
          <strong className="text-[var(--color-text-primary)]">{options.length}</strong> shipping {options.length === 1 ? "option" : "options"} available
        </span>
        <span>Prices in USD · converted at checkout</span>
      </div>
      </div>
    </div>
  );
}

// ─── Sortable column header ─────────────────────────────────────────────────

function SortHeader({
  label, active, dir: _dir, onClick, align = "left",
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