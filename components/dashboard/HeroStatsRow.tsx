import { TrendingUp, TrendingDown, ShoppingBag, Users, Link2, Star } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { cn } from "@/lib/utils";

interface HeroStatProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  heading: string;        // bold top line, includes the number e.g. "3 new" / "$124 today"
  subtitle: string;       // muted line below e.g. "campaign opportunities"
  trend?: string;         // e.g. "18% vs yesterday"
  up?: boolean;
  spark?: number[];
  sparkColor?: string;
  xpValue?: string;       // e.g. "320 / 500 XP" — shown in accent color
  xpPercent?: number;
}

function HeroStat({
  icon, iconBg, iconColor,
  heading, subtitle, trend, up = true,
  spark, sparkColor = "#30a46c",
  xpValue, xpPercent,
}: HeroStatProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
      {/* Top row: icon + heading */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg, color: iconColor }}
          >
            {icon}
          </div>
          <div>
            <p className="text-[14px] font-extrabold text-text-primary leading-tight">{heading}</p>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">{subtitle}</p>
          </div>
        </div>
        {/* Mini sparkline */}
        {spark && spark.length > 1 && (
          <div className="flex-shrink-0 self-center">
            <Sparkline data={spark} color={sparkColor} width={52} height={28} />
          </div>
        )}
      </div>

      {/* XP value + bar */}
      {xpValue && (
        <p className="text-[13px] font-bold" style={{ color: "#fd5000" }}>{xpValue}</p>
      )}
      {xpPercent !== undefined && (
        <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${xpPercent}%`, background: "#f0b429" }}
          />
        </div>
      )}

      {/* Trend */}
      {trend && (
        <div className={cn("flex items-center gap-1 text-[11px] font-semibold", up ? "text-[#30a46c]" : "text-[#e5484d]")}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {trend}
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HeroStatsRowProps {
  earnedToday: string;
  newCampaigns: number;
  affiliateClicks: number;
  xpCurrent: number;
  xpMax: number;
  level: number;
  // real trend strings
  earnedTrend?: string;
  campaignsTrend?: string;
  linksTrend?: string;
  // optional real sparklines
  sparkEarned?: number[];
  sparkCampaigns?: number[];
  sparkLinks?: number[];
}

const FALLBACK_UP   = [3, 5, 4, 6, 7, 8, 9];
const FALLBACK_FLAT = [4, 5, 4, 5, 4, 5, 5];

export function HeroStatsRow({
  earnedToday, newCampaigns, affiliateClicks, xpCurrent, xpMax, level,
  earnedTrend, campaignsTrend, linksTrend,
  sparkEarned, sparkCampaigns, sparkLinks,
}: HeroStatsRowProps) {
  const xpPercent = Math.round((xpCurrent / xpMax) * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-5">
      {/* 1 — Earnings */}
      <HeroStat
        icon={<ShoppingBag size={16} />}
        iconBg="#e9f9ef"
        iconColor="#30a46c"
        heading="You earned"
        subtitle={earnedToday}
        trend={earnedTrend ?? "vs yesterday"}
        up
        spark={sparkEarned ?? FALLBACK_UP}
        sparkColor="#30a46c"
      />

      {/* 2 — Campaigns */}
      <HeroStat
        icon={<Users size={16} />}
        iconBg="#ede9ff"
        iconColor="#8b5cf6"
        heading={`${newCampaigns} new`}
        subtitle="campaign opportunities"
        trend={campaignsTrend ?? "UGC campaigns"}
        up
        spark={sparkCampaigns ?? FALLBACK_FLAT}
        sparkColor="#8b5cf6"
      />

      {/* 3 — Affiliate Links */}
      <HeroStat
        icon={<Link2 size={16} />}
        iconBg="#e0f2fe"
        iconColor="#0284c7"
        heading={`${affiliateClicks} affiliate clicks`}
        subtitle="in the last hour"
        trend={linksTrend ?? "active links"}
        up
        spark={sparkLinks ?? FALLBACK_UP}
        sparkColor="#0284c7"
      />

      {/* 4 — Creator Level */}
      <HeroStat
        icon={<Star size={16} />}
        iconBg="#fff3ee"
        iconColor="#fd5000"
        heading={`Level ${level} Creator`}
        subtitle="your creator rank"
        xpValue={`${xpCurrent} / ${xpMax} XP`}
        xpPercent={xpPercent}
      />
    </div>
  );
}
