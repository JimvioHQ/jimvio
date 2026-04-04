"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Eye, Heart, TrendingUp, DollarSign, MousePointer, ShoppingBag,
  Loader2, ArrowUpRight, Clock, CheckCircle, BarChart3, Video,
  Wallet, Play, Users, Zap, MessageCircle,
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
  totalLikes: number;
  totalClips: number;
  totalUGCPosts: number;
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

interface TopClip {
  id: string;
  title: string;
  thumbnail_url: string | null;
  total_views: number;
  total_likes: number;
  total_conversions: number;
  earnings: number;
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

// ─────────────────────────────────────────────────────────────
// DAYS SELECTOR
// ─────────────────────────────────────────────────────────────
const DAY_OPTIONS = [7, 14, 30, 90];

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function CreatorAnalyticsPage() {
  const { formatMoney } = useCurrency();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topClips, setTopClips] = useState<TopClip[]>([]);
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
      setTopClips(json.topClips ?? []);
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

  // Format timeline for chart (show last 14 labels)
  const chartData = timeline.slice(-14).map((t) => ({
    date: new Date(t.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    earnings: t.earnings,
    conversions: t.conversions,
    views: Math.round(t.views / 10), // scale for readability
  }));

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Creator Analytics</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Your clips, UGC, and affiliate performance in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Days filter */}
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
            <Link href="/dashboard/clips/new">
              <Video className="h-4 w-4 mr-1.5" /> New Clip
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Main KPI Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Views" value={formatNum(stats?.totalViews ?? 0)}
          icon={<Eye className="h-4 w-4" />} gradient="from-blue-500 to-cyan-500"
          change={8.4}
        />
        <StatCard
          title="Total Likes" value={formatNum(stats?.totalLikes ?? 0)}
          icon={<Heart className="h-4 w-4" />} gradient="from-pink-500 to-rose-500"
          change={12.1}
        />
        <StatCard
          title="Conversions" value={formatNum(stats?.totalConversions ?? 0)}
          sub={`${(stats?.conversionRate ?? 0).toFixed(1)}% rate`}
          icon={<ShoppingBag className="h-4 w-4" />} gradient="from-emerald-500 to-teal-500"
          change={5.3}
        />
        <StatCard
          title="Total Earned" value={formatMoney(stats?.totalEarned ?? 0, "USD")}
          sub={`${formatMoney(stats?.availableBalance ?? 0, "USD")} available`}
          icon={<DollarSign className="h-4 w-4" />} gradient="from-violet-500 to-purple-500"
          change={19.7}
        />
      </div>

      {/* ── Secondary KPIs ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Clips", value: stats?.totalClips ?? 0, icon: <Video className="h-4 w-4" /> },
          { label: "UGC Posts", value: stats?.totalUGCPosts ?? 0, icon: <Users className="h-4 w-4" /> },
          { label: "Comments", value: stats?.totalComments ?? 0, icon: <MessageCircle className="h-4 w-4" /> },
          { label: "Shares", value: stats?.totalShares ?? 0, icon: <ArrowUpRight className="h-4 w-4" /> },
          { label: "Link Clicks", value: stats?.totalClicks ?? 0, icon: <MousePointer className="h-4 w-4" /> },
          { label: "Pending", value: formatMoney(stats?.pendingEarnings ?? 0, "USD"), icon: <Clock className="h-4 w-4" />, isText: true },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center text-[var(--color-text-muted)] mb-1.5">
              {item.icon}
            </div>
            <div className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">
              {(item as any).isText ? item.value : formatNum(Number(item.value))}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── Earnings Chart ─────────────────────────────────── */}
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
                <AreaChart data={chartData} margin={{ left: -10, right: 0 }}>
                  <defs>
                    <linearGradient id="gradEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="earnings" stroke="#7C3AED" strokeWidth={2} fill="url(#gradEarnings)" />
                  <Area type="monotone" dataKey="conversions" stroke="#10B981" strokeWidth={2} fill="url(#gradConv)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-[var(--color-text-muted)] text-sm">
                No earnings data yet. Start promoting products!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-[var(--color-accent)]" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2.5">
            {[
              { href: "/dashboard/clips/new", label: "Create New Clip", icon: "🎬", desc: "Upload or record" },
              { href: "/ugc", label: "Write a Review", icon: "⭐", desc: "Tag & earn" },
              { href: "/dashboard/links", label: "Manage Links", icon: "🔗", desc: "View all links" },
              { href: "/dashboard/withdrawals", label: "Request Payout", icon: "💸", desc: `${formatMoney(stats?.availableBalance ?? 0, "USD")} available` },
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

      {/* ── Top Clips ─────────────────────────────────────── */}
      {topClips.length > 0 && (
        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-3 px-5 pt-5 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Play className="h-4 w-4 text-[var(--color-accent)]" /> Top Performing Clips
            </CardTitle>
            <Link href="/dashboard/clips" className="text-xs text-[var(--color-accent)] font-semibold hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="space-y-3">
              {topClips.map((clip, idx) => (
                <div
                  key={clip.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-surface-secondary)] transition-all"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: idx === 0 ? "#F59E0B" : idx === 1 ? "#9CA3AF" : idx === 2 ? "#D97706" : "var(--color-surface-secondary)" }}
                  >
                    {idx + 1}
                  </div>
                  {clip.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={clip.thumbnail_url} alt="" className="w-14 h-10 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
                      <Play className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{clip.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {formatNum(clip.total_views)}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {formatNum(clip.total_likes)}
                      </span>
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" /> {clip.total_conversions} sales
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{formatMoney(clip.earnings, "USD")}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">earned</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Affiliate Links Performance ───────────────────── */}
      {affiliateLinks.length > 0 && (
        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-3 px-5 pt-5 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-[var(--color-accent)]" /> Affiliate Links
            </CardTitle>
            <Link href="/dashboard/links" className="text-xs text-[var(--color-accent)] font-semibold hover:underline">
              Manage →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                    {["Product / Link", "Clicks", "Unique", "Conversions", "Earnings", "Status"].map((h) => (
                      <th key={h} className="text-left font-medium text-[var(--color-text-muted)] py-3 px-4 first:pl-5 last:pr-5 last:text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {affiliateLinks.slice(0, 8).map((link) => (
                    <tr key={link.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-secondary)]/40 transition-colors">
                      <td className="py-3.5 pl-5 pr-4">
                        <p className="font-semibold truncate max-w-[150px]">{link.products?.name ?? "Global"}</p>
                        <p className="text-[10px] font-mono text-[var(--color-accent)] mt-0.5">{link.link_code}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold">{formatNum(link.total_clicks)}</td>
                      <td className="py-3.5 px-4 text-[var(--color-text-muted)]">{formatNum(link.unique_clicks)}</td>
                      <td className="py-3.5 px-4 text-emerald-600 font-semibold">{link.total_conversions}</td>
                      <td className="py-3.5 px-4 font-bold">{formatMoney(link.total_earnings, "USD")}</td>
                      <td className="py-3.5 pr-5 text-center">
                        <Badge variant={link.is_active ? "success" : "secondary"} className="text-[10px]">
                          {link.is_active ? "Active" : "Paused"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recent Commissions ────────────────────────────── */}
      {commissions.length > 0 && (
        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-3 px-5 pt-5 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[var(--color-accent)]" /> Recent Commissions
            </CardTitle>
            <Link href="/dashboard/earnings" className="text-xs text-[var(--color-accent)] font-semibold hover:underline">
              Full history →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                    {["Order", "Rate", "Commission", "Status", "Date"].map((h) => (
                      <th key={h} className="text-left font-medium text-[var(--color-text-muted)] py-3 px-4 first:pl-5 last:pr-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-secondary)]/40 transition-colors">
                      <td className="py-3.5 pl-5 pr-4 font-semibold">#{c.orders?.order_number ?? c.id.slice(0, 8)}</td>
                      <td className="py-3.5 px-4 text-[var(--color-text-muted)]">{c.commission_rate}%</td>
                      <td className="py-3.5 px-4 font-bold text-[var(--color-accent)]">{formatMoney(c.commission_amount, "USD")}</td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={c.status === "paid" ? "success" : c.status === "cancelled" ? "destructive" : "warning"}
                          className="text-[10px]"
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 pr-5 text-[var(--color-text-muted)]">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty CTA */}
      {!stats?.totalClips && !stats?.totalUGCPosts && (
        <div
          className="rounded-3xl p-8 text-white text-center"
          style={{ background: "linear-gradient(135deg,#4B2D8F,#7C3AED,#DB2777)" }}
        >
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-xl font-bold mb-2">Start creating & earning</h2>
          <p className="text-white/80 text-sm mb-6 max-w-md mx-auto">
            Upload your first product clip or write a review. Every view, click, and sale earns you real money.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="bg-white text-purple-700 hover:bg-white/90 font-bold rounded-2xl px-6">
              <Link href="/dashboard/clips/new">🎬 Upload Clip</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/40 text-white hover:bg-white/10 rounded-2xl px-6">
              <Link href="/ugc">✍️ Write Review</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
