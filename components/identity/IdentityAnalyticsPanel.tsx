"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Loader2,
  Megaphone,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Trophy,
  Users2,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { IdentityCreatorStatsSnapshot, IdentityLevelProgress } from "@/lib/identity/types";
import { IdentityCard, IdentityEmptyState, IdentityProgressBar, cn } from "@/components/identity/identity-ui";

type AnalyticsResponse = {
  profile: { username: string | null; fullName: string | null; creatorLevel: string; overallRank: number | null };
  isOwner: boolean;
  stats: IdentityCreatorStatsSnapshot | null;
  levelProgress: IdentityLevelProgress;
  jimvioFollowers: number;
};

function formatMoney(value: number): string {
  return `$${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function IdentityAnalyticsPanel({ username }: { username?: string | null }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    const qs = username ? `?username=${encodeURIComponent(username)}` : "";
    fetch(`/api/identity/analytics${qs}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 403 || res.status === 401) return setStatus("forbidden");
        if (!res.ok) return setStatus("error");
        setData((await res.json()) as AnalyticsResponse);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [username]);

  if (status === "loading") {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[#FF5A1F]" />
      </div>
    );
  }

  if (status === "forbidden") {
    return <IdentityEmptyState icon={<BarChart3 className="h-6 w-6" />} title="Analytics are private" />;
  }

  if (status === "error" || !data) {
    return (
      <IdentityEmptyState
        icon={<BarChart3 className="h-6 w-6" />}
        title="Couldn't load analytics"
        description="Please try again in a moment."
      />
    );
  }

  const { stats } = data;

  if (!stats) {
    return (
      <IdentityEmptyState
        icon={<BarChart3 className="h-6 w-6" />}
        title="No analytics yet"
        description="Performance data will show up here once there's activity to measure."
      />
    );
  }

  const overallEarnings = stats.ugc.earningsPaid + stats.affiliate.totalEarnings + stats.marketplace.totalRevenue;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MetricCard icon={Sparkles} label="Total earned" value={formatMoney(overallEarnings)} accent />
        <MetricCard icon={Users2} label="Jimvio followers" value={formatNumber(data.jimvioFollowers)} />
        <MetricCard icon={TrendingUp} label="Social reach" value={formatNumber(stats.social.totalFollowers)} />
        <MetricCard icon={Trophy} label="Overall rank" value={data.profile.overallRank ? `#${data.profile.overallRank}` : "—"} />
      </div>

      <AnalyticsSection title="UGC campaigns" icon={Megaphone}>
        <BarRow label="Campaigns completed" value={stats.ugc.campaignsCompleted} max={Math.max(stats.ugc.campaignsJoined, 1)} suffix={`/ ${stats.ugc.campaignsJoined} joined`} />
        <BarRow label="Approval rate" value={stats.ugc.approvalRate} max={100} suffix="%" isPercent />
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <MiniStat label="Views generated" value={formatNumber(stats.ugc.totalViews)} />
          <MiniStat label="Earned" value={formatMoney(stats.ugc.earningsPaid)} />
          <MiniStat label="Pending" value={formatMoney(stats.ugc.earningsPending)} />
        </div>
      </AnalyticsSection>

      <AnalyticsSection title="Affiliate performance" icon={Users2}>
        <BarRow label="Conversion rate" value={stats.affiliate.conversionRate} max={100} suffix="%" isPercent />
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <MiniStat label="Clicks" value={formatNumber(stats.affiliate.totalClicks)} />
          <MiniStat label="Conversions" value={formatNumber(stats.affiliate.totalConversions)} />
          <MiniStat label="Earned" value={formatMoney(stats.affiliate.totalEarnings)} />
        </div>
      </AnalyticsSection>

      <AnalyticsSection title="Marketplace" icon={ShoppingBag}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <MiniStat label="Products" value={formatNumber(stats.marketplace.productsCount)} />
          <MiniStat label="Sales" value={formatNumber(stats.marketplace.totalSales)} />
          <MiniStat label="Revenue" value={formatMoney(stats.marketplace.totalRevenue)} />
        </div>
      </AnalyticsSection>

      <AnalyticsSection title="Community standing" icon={Trophy}>
        <BarRow label={`Level ${stats.community.level} progress`} value={data.levelProgress.progressPct} max={100} suffix="%" isPercent />
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <MiniStat label="Communities" value={formatNumber(stats.community.communitiesJoined)} />
          <MiniStat label="Points" value={formatNumber(stats.community.totalPoints)} />
          <MiniStat label="Streak" value={`${stats.community.streakDays}d`} />
        </div>
      </AnalyticsSection>
    </div>
  );
}

function AnalyticsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <IdentityCard className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#FF5A1F]" />
        <p className="text-[13.5px] font-semibold text-[#1C1B19]">{title}</p>
      </div>
      {children}
    </IdentityCard>
  );
}

function BarRow({
  label,
  value,
  max,
  suffix = "",
  isPercent = false,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  isPercent?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
        <span className="text-[#59544B]">{label}</span>
        <span className="font-semibold text-[#1C1B19]">
          {isPercent ? value.toFixed(1) : value}
          {suffix}
        </span>
      </div>
      <IdentityProgressBar value={pct} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.02] px-3 py-2.5">
      <p className="text-[13.5px] font-semibold text-[#1C1B19]">{value}</p>
      <p className="text-[10.5px] text-[#9A9388]">{label}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border p-4", accent ? "border-[#FFDCC7] bg-[#FFF1EA]" : "border-black/[0.06] bg-white")}>
      <Icon className={cn("mb-2 h-4 w-4", accent ? "text-[#D6480F]" : "text-[#FF5A1F]")} />
      <p className="font-[var(--font-identity-serif)] text-[18px] font-medium leading-tight text-[#161512]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#9A9388]">{label}</p>
    </div>
  );
}
