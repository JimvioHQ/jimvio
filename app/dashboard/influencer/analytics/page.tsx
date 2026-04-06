"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Eye, Heart, TrendingUp, DollarSign, MousePointer, ShoppingBag,
  Loader2, ArrowUpRight, Clock, CheckCircle, BarChart3, Video,
  Wallet, Play, Users, Zap, MessageCircle, Send, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/context/CurrencyContext";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface DashboardStats {
  totalViews: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  totalComments: number;
  totalShares: number;
  pendingEarnings: number;
  availableBalance: number;
  totalEarned: number;
  paidEarnings: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
}

interface TopSubmission {
  id: string;
  title: string;
  thumbnail_url: string | null;
  total_views: number;
  total_clicks: number;
  total_conversions: number;
  earnings: number;
  platform: string;
}

interface TimelinePoint {
  date: string;
  earnings: number;
  conversions: number;
  views: number;
}

interface AffiliateLink {
  id: string;
  link_code: string;
  total_clicks: number;
  unique_clicks: number;
  total_conversions: number;
  total_earnings: number;
  is_active: boolean;
  products?: { name: string; images: unknown };
}

interface Commission {
  id: string;
  commission_amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
  orders?: { order_number: string; total_amount: number };
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function formatNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function StatCard({
  title, value, sub, icon, gradient, change,
}: {
  title: string; value: string; sub?: string;
  icon: React.ReactNode; gradient: string; change?: number;
}) {
  return (
    <Card className="overflow-hidden border-[var(--color-border)]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">{title}</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">{value}</p>
            {sub && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${gradient}`}>
            {icon}
          </div>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            <ArrowUpRight className={`h-3 w-3 ${change < 0 && "rotate-180"}`} />
            {Math.abs(change).toFixed(1)}% this month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const DAY_OPTIONS = [7, 14, 30, 90];

export default function CreatorAnalyticsPage() {
  const { formatMoney } = useCurrency();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topSubmissions, setTopSubmissions] = useState<TopSubmission[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/analytics?days=${d}`);
      if (!res.ok) return;
      const json = await res.json();
      setStats(json.stats);
      setTopSubmissions(json.topClips ?? []); // API might still use 'topClips' key
      setTimeline(json.timeline ?? []);
      setAffiliateLinks(json.affiliateLinks ?? []);
      setCommissions(json.recentCommissions ?? []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  const chartData = timeline.slice(-14).map((t) => ({
    date: new Date(t.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    earnings: t.earnings,
    conversions: t.conversions,
    views: Math.round(t.views / 10),
  }));

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Creator Analytics</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Your campaign submissions and content performance tracked in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  days === d
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <Button asChild size="sm">
            <Link href="/ugc">
              <Globe className="h-4 w-4 mr-1.5" /> Browse Campaigns
            </Link>
          </Button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Views" value={formatNum(stats?.totalViews ?? 0)}
          icon={<Eye className="h-4 w-4" />} gradient="from-blue-500 to-cyan-500"
          change={8.4}
        />
        <StatCard
          title="Approved Subs" value={formatNum(stats?.approvedSubmissions ?? 0)}
          sub={`${stats?.totalSubmissions ?? 0} total submissions`}
          icon={<CheckCircle className="h-4 w-4" />} gradient="from-pink-500 to-rose-500"
          change={12.1}
        />
        <StatCard
          title="Conversions" value={formatNum(stats?.totalConversions ?? 0)}
          sub={`${(stats?.conversionRate ?? 0).toFixed(1)}% rate`}
          icon={<ShoppingBag className="h-4 w-4" />} gradient="from-emerald-500 to-teal-500"
          change={5.3}
        />
        <StatCard
          title="Total Earned" value={formatMoney(stats?.totalEarned ?? 0, "RWF")}
          sub={`${formatMoney(stats?.availableBalance ?? 0, "RWF")} available`}
          icon={<DollarSign className="h-4 w-4" />} gradient="from-violet-500 to-purple-500"
          change={19.7}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Submissions", value: stats?.totalSubmissions ?? 0, icon: <Send className="h-4 w-4" /> },
          { label: "Approved", value: stats?.approvedSubmissions ?? 0, icon: <CheckCircle className="h-4 w-4" /> },
          { label: "Comments", value: stats?.totalComments ?? 0, icon: <MessageCircle className="h-4 w-4" /> },
          { label: "Shares", value: stats?.totalShares ?? 0, icon: <RefreshCcw className="h-4 w-4" /> },
          { label: "Campaigns", value: topSubmissions?.length ?? 0, icon: <Video className="h-4 w-4" /> },
          { label: "Pending", value: formatMoney(stats?.pendingEarnings ?? 0, "RWF"), icon: <Clock className="h-4 w-4" />, isText: true },
        ].map((item: any) => (
          <div key={item.label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center text-[var(--color-text-muted)] mb-1.5">
              {item.icon}
            </div>
            <div className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">
              {item.isText ? item.value : formatNum(Number(item.value))}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Earnings Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 border-[var(--color-border)]">
          <CardHeader className="pb-3 px-5 pt-5 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Earnings Over Time</CardTitle>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-violet-500" />Earnings</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />Conversions</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ left: -10, right: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface-secondary)' }}
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="earnings" stackId="a" fill="#7C3AED" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="conversions" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-[var(--color-text-muted)] text-sm">
                No earnings data yet. Start promoting products!
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-[var(--color-accent)]" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2.5">
            {[
              { href: "/ugc", label: "Browse Campaigns", icon: "🎬", desc: "Start earning per view" },
              { href: "/dashboard/submissions", label: "My Submissions", icon: "⭐", desc: "Track approval status" },
              { href: "/dashboard/withdrawals", label: "Request Payout", icon: "💸", desc: `${formatMoney(stats?.availableBalance ?? 0, "RWF")} available` },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--color-surface-secondary)] transition-all group"
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors truncate">{item.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{item.desc}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Submissions */}
      {topSubmissions.length > 0 && (
        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-3 px-5 pt-5 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Play className="h-4 w-4 text-[var(--color-accent)]" /> Top Performing Submissions
            </CardTitle>
            <Link href="/dashboard/submissions" className="text-xs text-[var(--color-accent)] font-semibold hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="space-y-3">
              {topSubmissions.map((sub, idx) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-surface-secondary)] transition-all"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: idx === 0 ? "#F59E0B" : idx === 1 ? "#9CA3AF" : idx === 2 ? "#D97706" : "var(--color-surface-secondary)" }}
                  >
                    {idx + 1}
                  </div>
                  <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{sub.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {formatNum(sub.total_views)}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 uppercase font-bold text-[10px]">
                        {sub.platform}
                      </span>
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" /> {sub.total_conversions} sales
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{formatMoney(sub.earnings, "RWF")}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">earned</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}



      {/* Start creating & earning CTA */}
      {!stats?.totalSubmissions && (
        <div
          className="rounded-3xl p-8 text-white text-center"
          style={{ background: "linear-gradient(135deg,#4B2D8F,#7C3AED,#DB2777)" }}
        >
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-xl font-bold mb-2">Start creating & earning</h2>
          <p className="text-white/80 text-sm mb-6 max-w-md mx-auto">
            Browse active campaigns and submit your content links. Every view and click earns you real money.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="bg-white text-purple-700 hover:bg-white/90 font-bold rounded-2xl px-6">
              <Link href="/ugc">🎬 Browse Campaigns</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/40 text-white hover:bg-white/10 rounded-2xl px-6">
              <Link href="/dashboard/submissions">📄 My Submissions</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const RefreshCcw = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);
