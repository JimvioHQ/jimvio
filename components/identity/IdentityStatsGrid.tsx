import type { LucideIcon } from "lucide-react";
import { Briefcase, Calendar, DollarSign, TrendingUp, Users } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { IdentityCreatorStatsSnapshot } from "@/lib/identity/types";
import { cn } from "@/components/identity/identity-ui";

export type IdentityStatItem = {
  label: string;
  value: string;
  icon?: LucideIcon;
  accent?: boolean;
};

function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function computeIdentityStats(input: {
  totalFollowers: number;
  avgEngagementRate: number;
  portfolioCount: number;
  joinedAt: string | null;
  /** Cross-surface earnings snapshot — when present and non-zero, replaces "Portfolio items" with "Total earned". */
  stats?: IdentityCreatorStatsSnapshot | null;
}): IdentityStatItem[] {
  const joined = input.joinedAt
    ? new Date(input.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "—";

  const totalEarned = input.stats
    ? input.stats.ugc.earningsPaid + input.stats.affiliate.totalEarnings + input.stats.marketplace.totalRevenue
    : 0;

  const items: IdentityStatItem[] = [
    { label: "Audience reach", value: formatNumber(input.totalFollowers), icon: Users },
    {
      label: "Avg. engagement",
      value: input.avgEngagementRate > 0 ? `${input.avgEngagementRate.toFixed(1)}%` : "—",
      icon: TrendingUp,
    },
  ];

  if (totalEarned > 0) {
    items.push({ label: "Total earned", value: formatMoney(totalEarned), icon: DollarSign, accent: true });
  } else {
    items.push({ label: "Portfolio items", value: String(input.portfolioCount), icon: Briefcase });
  }

  items.push({ label: "Member since", value: joined, icon: Calendar });

  return items;
}

export function IdentityStatsGrid({ stats, className }: { stats: IdentityStatItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-4", className)}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              "rounded-2xl border px-4 py-3.5 text-center sm:text-left",
              stat.accent ? "border-[#FFDCC7] bg-[#FFF1EA]" : "border-black/[0.06] bg-white",
            )}
          >
            {Icon && (
              <Icon className={cn("mx-auto mb-1.5 h-3.5 w-3.5 sm:mx-0", stat.accent ? "text-[#D6480F]" : "text-[#FF5A1F]")} />
            )}
            <p className="font-[var(--font-identity-serif)] text-[19px] font-medium text-[#161512]">{stat.value}</p>
            <p className="mt-0.5 text-[11px] text-[#9A9388]">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
