import type { LucideIcon } from "lucide-react";
import { Briefcase, Calendar, TrendingUp, Users } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/components/identity/identity-ui";

export type IdentityStatItem = {
  label: string;
  value: string;
  icon?: LucideIcon;
};

export function computeIdentityStats(input: {
  totalFollowers: number;
  avgEngagementRate: number;
  portfolioCount: number;
  joinedAt: string | null;
}): IdentityStatItem[] {
  const joined = input.joinedAt
    ? new Date(input.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "—";

  return [
    { label: "Audience reach", value: formatNumber(input.totalFollowers), icon: Users },
    {
      label: "Avg. engagement",
      value: input.avgEngagementRate > 0 ? `${input.avgEngagementRate.toFixed(1)}%` : "—",
      icon: TrendingUp,
    },
    { label: "Portfolio items", value: String(input.portfolioCount), icon: Briefcase },
    { label: "Member since", value: joined, icon: Calendar },
  ];
}

export function IdentityStatsGrid({ stats, className }: { stats: IdentityStatItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-4", className)}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3.5 text-center sm:text-left"
          >
            {Icon && <Icon className="mx-auto mb-1.5 h-3.5 w-3.5 text-[#FF5A1F] sm:mx-0" />}
            <p className="font-[var(--font-identity-serif)] text-[19px] font-medium text-[#161512]">{stat.value}</p>
            <p className="mt-0.5 text-[11px] text-[#9A9388]">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
