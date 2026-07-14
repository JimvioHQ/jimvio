"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3, Users, Radio, Layers, Heart, MessageSquare,
  DollarSign, Loader2, TrendingUp, ChevronRight, Sparkles, Zap, Trophy, Clock, Target,
} from "lucide-react";
import { HubCard, HubLinkButton, HubSectionTitle, HubStatCard, HubBadge } from "@/components/community/hub/hub-ui";

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
    maximumFractionDigits: 0,
  }).format(amount);
}

function FeatureStatCard({ label, value, delta, icon: Icon, color }: { label: string; value: string | number; delta?: string | null; icon: typeof Users; color: string }) {
  const colorVar = `var(--color-${color})`;
  return (
    <div className="relative group hover-lift animate-in animate-fade-in-up rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)] p-4 transition-all duration-300"
         style={{ background: `linear-gradient(135deg, var(--color-surface), var(--color-surface-secondary))` }}>
      <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
           style={{ background: `radial-gradient(circle at top right, ${colorVar}15, transparent 60%)` }} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{label}</p>
          <p className="mt-1 text-[20px] font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>{value}</p>
          {delta && (
            <p className="mt-1 text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> {delta}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
             style={{ background: `${colorVar}15`, color: colorVar }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
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
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  const stats = data?.stats;
  const insights = data?.insights;

  return (
    <div className="min-h-full bg-[var(--color-bg)]"
         style={{
           backgroundImage: `radial-gradient(circle at 50% -20%, var(--color-accent)/5, transparent 50%), radial-gradient(circle at 100% 100%, var(--color-social)/3, transparent 40%)`,
         }}>
      <div className="mx-auto flex max-w-[960px] flex-col gap-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 animate-in animate-fade-in-up">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-live)]/15 text-[var(--color-live)]">
                <BarChart3 className="h-5 w-5" />
              </div>
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

        {/* Stat cards - mood board style */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-in stagger-children">
          <FeatureStatCard label="Online now" value={stats?.membersOnline ?? 0} delta={null} icon={Users} color="growth" />
          <FeatureStatCard label="Live sessions" value={stats?.liveSessions ?? 0} delta={null} icon={Radio} color="live" />
          <FeatureStatCard label="Voice rooms" value={stats?.voiceRooms ?? 0} delta={null} icon={Radio} color="social" />
          <FeatureStatCard label="Communities" value={stats?.activeCommunities ?? 0} delta={null} icon={Layers} color="events" />
        </div>

        {/* Creator Insights + Earnings */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift animate-in animate-fade-in-up">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Creator Insights</h3>
              <HubBadge variant="default">This month</HubBadge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Posts", value: insights?.postCount30d ?? 0, icon: MessageSquare, color: "growth" },
                { label: "Engagement", value: insights?.engagement30d ?? 0, icon: Heart, color: "live" },
                { label: "Communities", value: insights?.communitiesJoined ?? 0, icon: Layers, color: "events" },
                { label: "Live rooms", value: stats?.liveSessions ?? 0, icon: Radio, color: "social" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="relative rounded-xl p-3 hover-lift"
                     style={{ background: `var(--color-${color})/5`, border: "1px solid var(--color-border)/20" }}>
                  <div className="flex items-center justify-between mb-1">
                    <Icon className="h-3.5 w-3.5" style={{ color: `var(--color-${color})` }} />
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
                  <p className="text-[18px] font-black text-[var(--color-text-primary)]">{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift animate-in animate-fade-in-up"
               style={{ background: "linear-gradient(135deg, var(--color-growth)/10, var(--color-accent)/10)" }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Earnings Overview</h3>
              <HubBadge variant="orange">Overview</HubBadge>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-[28px] font-black tracking-tight text-[var(--color-text-primary)]">
                {formatMoney(data?.earnings.total ?? 0, data?.earnings.currency ?? "USD")}
              </p>
              {data?.earnings.monthChangePct != null && (
                <span className={`mb-1 text-[11px] font-bold ${data.earnings.monthChangePct >= 0 ? "text-emerald-500" : "text-red-400"}`}>
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
          </div>
        </div>

        {/* Weekly Challenge */}
        {data?.challenge && (
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-secondary)] p-4 hover-lift animate-in animate-fade-in-up"
               style={{ background: "linear-gradient(135deg, var(--color-social)/5, var(--color-events)/5)" }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Weekly Challenge</h3>
              <HubBadge variant="orange">{data.challenge.completed}/{data.challenge.target}</HubBadge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[var(--color-text-primary)]">{data.challenge.title}</p>
                <p className="text-[11px] text-[var(--color-text-secondary)]">{data.challenge.description}</p>
              </div>
              <span className="text-[12px] font-bold text-[var(--color-accent)]">
                {data.challenge.completed}/{data.challenge.target}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
              <div className="h-full rounded-full transition-all duration-500"
                   style={{ width: `${challengePct}%`, background: "linear-gradient(90deg, var(--color-growth), var(--color-accent))" }} />
            </div>
          </div>
        )}

        {/* Growth Tips */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift animate-in animate-fade-in-up"
             style={{ background: "linear-gradient(135deg, var(--color-growth)/5, var(--color-live)/5)" }}>
          <h3 className="mb-3 text-[13px] font-black text-[var(--color-text-primary)]">Growth tips</h3>
          <ul className="space-y-2 text-[12px] text-[var(--color-text-secondary)]">
            <li className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-events)]" />
              Post clips during peak hours to boost reach in your spaces.
            </li>
            <li className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-events)]" />
              Go live weekly — live sessions drive the highest engagement.
            </li>
            <li className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-events)]" />
              Complete missions to unlock community rewards faster.
            </li>
            <li className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-events)]" />
              Invite collaborators to cross-promote and grow together.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}