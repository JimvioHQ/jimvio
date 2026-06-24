import type { UGCCampaignStatus } from "@/types/ugc";
import { Search } from "lucide-react";
import { formatAdminAmount, ADMIN_PRIMARY_CURRENCY } from "@/lib/admin/format-money";
import { TabCountBadge } from "@/components/ui/tab-count-badge";
import { cn } from "@/lib/utils";

export const CAMPAIGN_STATUS_FILTERS: Array<{ key: "all" | UGCCampaignStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "paused", label: "Paused" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  clipping: "Clipping",
  ugc: "UGC",
  music_clipping: "Music",
  promotion: "Promotion",
};

export function formatCampaignUsd(amount: number) {
  return formatAdminAmount(amount, ADMIN_PRIMARY_CURRENCY, ADMIN_PRIMARY_CURRENCY);
}

export function compactCampaignViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function CampaignTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex rounded-md bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]">
      {CAMPAIGN_TYPE_LABELS[type] ?? type}
    </span>
  );
}

export function CampaignBudgetBar({
  spent,
  total,
  formatValue = formatCampaignUsd,
}: {
  spent: number;
  total: number;
  formatValue?: (amount: number) => string;
}) {
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;
  const tone =
    pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-[var(--color-accent)]";

  return (
    <div className="min-w-[120px] max-w-[160px]">
      <div className="mb-1 flex justify-between text-[10.5px] tabular-nums text-[var(--color-text-muted)]">
        <span>{formatValue(spent)}</span>
        <span>{formatValue(total)}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-[10px] tabular-nums text-[var(--color-text-muted)]">{pct.toFixed(0)}% used</p>
    </div>
  );
}

export function CampaignTableSkeleton() {
  return (
    <div className="divide-y divide-[var(--color-border)]/60">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-3.5">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-[var(--color-surface-secondary)]" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-48 rounded bg-[var(--color-surface-secondary)]" />
            <div className="h-2.5 w-28 rounded bg-[var(--color-surface-secondary)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

type CampaignFilterBarProps = {
  status: "all" | UGCCampaignStatus;
  onStatusChange: (status: "all" | UGCCampaignStatus) => void;
  counts: Record<string, number>;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sort?: "recent" | "budget" | "views";
  onSortChange?: (sort: "recent" | "budget" | "views") => void;
  showSort?: boolean;
};

export function CampaignFilterBar({
  status,
  onStatusChange,
  counts,
  search,
  onSearchChange,
  searchPlaceholder = "Search campaigns…",
  sort = "recent",
  onSortChange,
  showSort = false,
}: CampaignFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-1.5">
        {CAMPAIGN_STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onStatusChange(f.key)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors",
              status === f.key
                ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] ring-[0.5px] ring-[var(--color-border)] hover:text-[var(--color-text-primary)]",
            )}
          >
            {f.label}
            <TabCountBadge
              count={f.key === "all" ? counts.all ?? 0 : counts[f.key] ?? 0}
              active={status === f.key}
            />
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 lg:w-56 lg:flex-none">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-3 text-[12.5px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15"
          />
        </div>
        {showSort && onSortChange && (
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as typeof sort)}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-[12px] text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15"
            aria-label="Sort campaigns"
          >
            <option value="recent">Newest first</option>
            <option value="budget">Highest budget</option>
            <option value="views">Most views</option>
          </select>
        )}
      </div>
    </div>
  );
}

export function sortCampaigns<T extends {
  created_at: string;
  total_budget?: number | null;
  total_views_tracked?: number | null;
}>(rows: T[], sort: "recent" | "budget" | "views"): T[] {
  return [...rows].sort((a, b) => {
    if (sort === "budget") return (b.total_budget ?? 0) - (a.total_budget ?? 0);
    if (sort === "views") return (b.total_views_tracked ?? 0) - (a.total_views_tracked ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function countCampaignsByStatus(campaigns: Array<{ status: string }>) {
  const map: Record<string, number> = { all: campaigns.length };
  for (const c of campaigns) {
    map[c.status] = (map[c.status] ?? 0) + 1;
  }
  return map;
}
