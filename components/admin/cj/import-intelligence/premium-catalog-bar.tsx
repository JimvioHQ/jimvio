"use client";

import { cn } from "@/lib/utils";
import type { CatalogTierCounts } from "@/lib/cj/import-intelligence/quality-engine";
import { CATALOG_TIER_STYLES } from "@/lib/cj/import-intelligence/quality-engine";
import type { CatalogTier } from "@/lib/cj/import-intelligence/types";
import { Switch } from "@/components/ui/switch";

const ADMIN_TIERS: CatalogTier[] = [
  "ELITE",
  "PREMIUM",
  "STANDARD",
  "PENDING",
  "HIDDEN",
];

export function PremiumCatalogBar({
  counts,
  visibleTiers,
  onToggleTier,
  showAllTiers,
  onShowAllTiersChange,
  visibleCount,
  syncing = false,
  lastSyncAt,
  className,
}: {
  counts: CatalogTierCounts;
  visibleTiers: Set<CatalogTier>;
  onToggleTier: (tier: CatalogTier) => void;
  showAllTiers: boolean;
  onShowAllTiersChange: (value: boolean) => void;
  visibleCount: number;
  syncing?: boolean;
  lastSyncAt?: string | null;
  className?: string;
}) {
  const tierKey = (t: CatalogTier) => {
    switch (t) {
      case "ELITE": return counts.elite;
      case "PREMIUM": return counts.premium;
      case "STANDARD": return counts.standard;
      case "PENDING": return counts.pending;
      case "HIDDEN": return counts.hidden;
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-white px-2.5 py-2",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
          Jimvio Intelligence
          {syncing && (
            <span className="ml-1.5 font-normal normal-case text-[#FF5A1F]">
              syncing…
            </span>
          )}
        </span>
        {ADMIN_TIERS.map((tier) => {
          const style = CATALOG_TIER_STYLES[tier];
          const count = tierKey(tier);
          const active = visibleTiers.has(tier);
          return (
            <button
              key={tier}
              type="button"
              onClick={() => onToggleTier(tier)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-opacity",
                !active && "opacity-40"
              )}
              style={{ background: style.bg, color: style.color }}
            >
              <span>{style.emoji}</span>
              <span>{style.label}</span>
              <span className="tabular-nums opacity-90">{count}</span>
            </button>
          );
        })}
        <span className="text-[10px] tabular-nums text-[#9CA3AF]">
          {visibleCount.toLocaleString()} shown
          {lastSyncAt && (
            <span className="hidden sm:inline">
              {" "}
              · synced {new Date(lastSyncAt).toLocaleString()}
            </span>
          )}
        </span>
      </div>

      <label className="flex shrink-0 cursor-pointer items-center gap-2">
        <span className="text-[10px] font-medium text-[#6B7280]">
          Show all tiers
        </span>
        <Switch
          checked={showAllTiers}
          onCheckedChange={onShowAllTiersChange}
          className="scale-90"
        />
      </label>
    </div>
  );
}
