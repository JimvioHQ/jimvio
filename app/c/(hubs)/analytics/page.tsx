"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3, Users, Radio, Layers, Heart, MessageSquare,
  DollarSign, Loader2, TrendingUp, ChevronRight,
} from "lucide-react";
import { HubCard, HubLinkButton, HubSectionTitle, HubStatCard } from "@/components/community/hub/hub-ui";

type AnalyticsData = {
  stats: {
    membersOnline: number;
    liveSessions: number;
    voiceRooms: number;
    activeCommunities: number;
  };
  insights: {
    postCount30d: number;
    engagement30d: number;
    communitiesJoined: number;
  };
  earnings: {
    total: number;
    monthChangePct: number | null;
    currency: string;
  };
  challenge: {
    title: string;
    description: string;
    completed: number;
    target: number;
  } | null;
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function HubAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/c/analytics");
        if (!res.ok) return;
        const json = (await res.json()) as AnalyticsData;
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const challengePct = useMemo(() => {
    if (!data?.challenge || data.challenge.target <= 0) return 0;
    return Math.round((data.challenge.completed / data.challenge.target) * 100);
  }, [data?.challenge]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const stats = data?.stats;
  const insights = data?.insights;

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="mx-auto max-w-[960px] space-y-4 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <BarChart3 className="h-5 w-5 text-[#fd5000]" />
              Analytics
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Creator performance across your communities
            </p>
          </div>
          <HubLinkButton href="/dashboard/community/analytics" variant="secondary">
            Full dashboard <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </HubLinkButton>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <HubStatCard label="Online now" value={String(stats?.membersOnline ?? 0)} icon={<Users className="h-4 w-4" />} accent="#22c55e" />
          <HubStatCard label="Live sessions" value={String(stats?.liveSessions ?? 0)} icon={<Radio className="h-4 w-4" />} accent="#ef4444" />
          <HubStatCard label="Voice rooms" value={String(stats?.voiceRooms ?? 0)} icon={<Radio className="h-4 w-4" />} accent="#8b5cf6" />
          <HubStatCard label="Communities" value={String(stats?.activeCommunities ?? 0)} icon={<Layers className="h-4 w-4" />} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <HubCard>
            <HubSectionTitle title="Creator Insights" badge="Last 30 days" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Posts", value: insights?.postCount30d ?? 0, icon: MessageSquare },
                { label: "Engagement", value: insights?.engagement30d ?? 0, icon: Heart },
                { label: "Communities", value: insights?.communitiesJoined ?? 0, icon: Layers },
                { label: "Live rooms", value: stats?.liveSessions ?? 0, icon: Radio },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl bg-[var(--color-surface-secondary)] p-3">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#fd5000]/10 text-[#fd5000]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
                  <p className="text-[18px] font-black">{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </HubCard>

          <HubCard>
            <HubSectionTitle title="Earnings" badge="Overview" />
            <div className="flex items-end gap-2">
              <p className="text-[28px] font-black tracking-tight">
                {formatMoney(data?.earnings.total ?? 0, data?.earnings.currency ?? "USD")}
              </p>
              {data?.earnings.monthChangePct != null && (
                <span className={`mb-1 text-[11px] font-bold ${data.earnings.monthChangePct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {data.earnings.monthChangePct >= 0 ? "+" : ""}
                  {data.earnings.monthChangePct.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Affiliate + creator earnings</p>
            <HubLinkButton href="/c/wallet" className="mt-4 w-full">
              <DollarSign className="mr-1 inline h-3.5 w-3.5" />
              Open Wallet
            </HubLinkButton>
          </HubCard>
        </div>

        {data?.challenge && (
          <HubCard>
            <HubSectionTitle title="Weekly Challenge" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-bold">{data.challenge.title}</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">{data.challenge.description}</p>
              </div>
              <span className="text-[12px] font-bold text-[#fd5000]">
                {data.challenge.completed}/{data.challenge.target}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
              <div className="h-full rounded-full bg-[#fd5000]" style={{ width: `${challengePct}%` }} />
            </div>
          </HubCard>
        )}

        <HubCard>
          <HubSectionTitle title="Growth tips" />
          <ul className="space-y-2 text-[12px] text-[var(--color-text-secondary)]">
            <li className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              Post clips during peak hours to boost reach in your spaces.
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              Go live weekly — live sessions drive the highest engagement.
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              Complete missions to unlock community rewards faster.
            </li>
          </ul>
        </HubCard>
      </div>
    </div>
  );
}
