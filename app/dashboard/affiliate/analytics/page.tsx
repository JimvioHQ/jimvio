"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MousePointer, ShoppingCart, DollarSign,
  TrendingUp, BarChart3, Package, ShieldCheck, Activity,
  Loader2, ArrowUpRight, Percent, Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/* ── Types ────────────────────────────────────────────────────────────────── */
interface AffLink {
  id: string;
  total_clicks: number;
  total_conversions: number;
  total_earnings: number;
  products: { id: string; name: string; slug: string; images: string[] } | null;
}

/* ── Custom tooltip ───────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-[var(--color-text-primary)] mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: p.fill }} />
          <span className="text-[var(--color-text-muted)] capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon, label, value, sub, accent = false, iconColor
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  iconColor: string;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-4 sm:p-5 flex flex-col gap-4 transition-colors",
      accent
        ? "border-orange-500/20 bg-orange-500/5"
        : "border-[var(--color-border)] bg-[var(--color-surface)]"
    )}>
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className={cn(
          "text-2xl font-bold tabular-nums tracking-tight leading-none",
          accent ? "text-orange-500" : "text-[var(--color-text-primary)]"
        )}>
          {value}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1.5">{label}</p>
        {sub && (
          <p className="text-[10px] text-[var(--color-text-muted)] opacity-60 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function AffiliateAnalyticsPage() {
  const { formatMoney } = useCurrency();
  const [affiliate, setAffiliate] = useState<{ id: string } | null>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBar, setActiveBar] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: aff } = await supabase
        .from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      setAffiliate(aff ?? null);

      if (aff) {
        const { data } = await supabase
          .from("affiliate_links")
          .select("id, total_clicks, total_conversions, total_earnings, products(id, name, slug, images)")
          .eq("affiliate_id", aff.id)
          .order("total_clicks", { ascending: false });
        console.log(data);

        setLinks((data ?? []) as any[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
        <p className="text-xs font-semibold text-[var(--color-text-muted)] tracking-widest uppercase">Loading…</p>
      </div>
    </div>
  );

  /* ── Not affiliate ── */
  if (!affiliate) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="h-14 w-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center mx-auto">
          <ShieldCheck className="h-6 w-6 text-[var(--color-text-muted)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">Access Restricted</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Activate your affiliate account to view analytics.
          </p>
        </div>
        <Button asChild className="w-full h-10 rounded-lg bg-orange-500 text-white hover:bg-orange-600 border-none text-sm font-semibold">
          <Link href="/dashboard/roles">Activate Now</Link>
        </Button>
      </div>
    </div>
  );

  /* ── Aggregates ── */
  const totalClicks = links.reduce((s, l) => s + (l.total_clicks ?? 0), 0);
  const totalConversions = links.reduce((s, l) => s + (l.total_conversions ?? 0), 0);
  const totalEarnings = links.reduce((s, l) => s + Number(l.total_earnings ?? 0), 0);
  const convRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0.0";

  const chartData = links.slice(0, 8).map((l, i) => {
    const name = l.products?.name ?? `Link ${i + 1}`;
    return {
      name: name.length > 14 ? name.slice(0, 13) + "…" : name,
      clicks: l.total_clicks ?? 0,
      conversions: l.total_conversions ?? 0,
    };
  });

  const topByEarnings = [...links]
    .sort((a, b) => Number(b.total_earnings ?? 0) - Number(a.total_earnings ?? 0))
    .slice(0, 5);

  const hasData = links.length > 0;

  /* ── Render ── */
  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/links"
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
                "border border-[var(--color-border)] bg-[var(--color-surface)]",
                "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight leading-none">
                Analytics
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {links.length} active link{links.length !== 1 ? "s" : ""} tracked
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={MousePointer}
            label="Total Clicks"
            value={totalClicks.toLocaleString()}
            iconColor="bg-sky-500/10 text-sky-500"
          />
          <StatCard
            icon={ShoppingCart}
            label="Conversions"
            value={totalConversions.toLocaleString()}
            sub={`${convRate}% rate`}
            iconColor="bg-emerald-500/10 text-emerald-500"
          />
          <StatCard
            icon={DollarSign}
            label="Total Earnings"
            value={formatMoney(totalEarnings, "USD")}
            accent
            iconColor="bg-orange-500/10 text-orange-500"
          />
          <StatCard
            icon={Link2}
            label="Active Links"
            value={String(links.length)}
            sub={totalConversions > 0 ? `${(totalEarnings / totalConversions).toFixed(2)} avg/sale` : undefined}
            iconColor="bg-violet-500/10 text-violet-500"
          />
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">
                Clicks vs Conversions
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                By product · top {Math.min(links.length, 8)} links
              </p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-semibold text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-sky-400 inline-block" /> Clicks
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-emerald-400 inline-block" /> Conversions
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-6 h-[240px] sm:h-[280px]">
            {!hasData ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <BarChart3 className="h-8 w-8 text-[var(--color-border)]" />
                <p className="text-sm font-medium text-[var(--color-text-muted)]">No link activity yet</p>
                <p className="text-xs text-[var(--color-text-muted)] opacity-60">
                  Share your affiliate links to start tracking
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ left: -20, right: 0, top: 4, bottom: 0 }}
                  barGap={3}
                  onMouseLeave={() => setActiveBar(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)", fontWeight: 500 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)", fontWeight: 500 }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-surface-secondary)", radius: 4 }} />
                  <Bar dataKey="clicks" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={32}
                    onMouseEnter={(_, i) => setActiveBar(i)}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={activeBar === i ? "#0ea5e9" : "#38bdf8"} fillOpacity={activeBar !== null && activeBar !== i ? 0.5 : 1} />
                    ))}
                  </Bar>
                  <Bar dataKey="conversions" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={32}
                    onMouseEnter={(_, i) => setActiveBar(i)}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={activeBar === i ? "#10b981" : "#34d399"} fillOpacity={activeBar !== null && activeBar !== i ? 0.5 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Conversion rate callout — only when there's data */}
        {hasData && totalClicks > 0 && (
          <div className={cn(
            "rounded-xl border px-5 py-4 flex items-center justify-between",
            Number(convRate) >= 3
              ? "border-emerald-500/20 bg-emerald-500/5"
              : Number(convRate) >= 1
                ? "border-amber-500/20 bg-amber-500/5"
                : "border-[var(--color-border)] bg-[var(--color-surface)]"
          )}>
            <div className="flex items-center gap-3">
              <Percent className={cn(
                "h-4 w-4",
                Number(convRate) >= 3 ? "text-emerald-500" : Number(convRate) >= 1 ? "text-amber-500" : "text-[var(--color-text-muted)]"
              )} />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Conversion rate: <span className={Number(convRate) >= 3 ? "text-emerald-500" : Number(convRate) >= 1 ? "text-amber-500" : "text-[var(--color-text-primary)]"}>{convRate}%</span>
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {Number(convRate) >= 3
                    ? "Great performance — above industry average"
                    : Number(convRate) >= 1
                      ? "Decent — try featuring higher-intent products"
                      : "Low — consider improving your link placement"}
                </p>
              </div>
            </div>
            <TrendingUp className={cn(
              "h-5 w-5 shrink-0 hidden sm:block",
              Number(convRate) >= 3 ? "text-emerald-500" : Number(convRate) >= 1 ? "text-amber-500" : "text-[var(--color-text-muted)]"
            )} />
          </div>
        )}

        {/* Top products table */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">
                Top Products
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Sorted by revenue generated
              </p>
            </div>
            <Activity className="h-4 w-4 text-[var(--color-text-muted)]" />
          </div>

          {topByEarnings.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="h-8 w-8 text-[var(--color-border)] mx-auto mb-3" />
              <p className="text-sm font-medium text-[var(--color-text-muted)]">No sales yet</p>
              <p className="text-xs text-[var(--color-text-muted)] opacity-60 mt-1">
                Your top-earning products will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {["Product", "Clicks", "Conv.", "Conv. Rate", "Revenue"].map((h, i) => (
                      <th key={h} className={cn(
                        "px-5 sm:px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
                        i > 0 && "text-right"
                      )}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {topByEarnings.map((l) => {
                    const product = l.products;
                    const imgSrc = product?.images?.[0] ?? null;
                    const rate = l.total_clicks > 0
                      ? ((l.total_conversions / l.total_clicks) * 100).toFixed(1)
                      : "0.0";
                    const isTopRate = Number(rate) >= 3;

                    return (
                      <tr key={l.id} className="hover:bg-[var(--color-surface-secondary)] transition-colors group">
                        <td className="px-5 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden flex items-center justify-center">
                              {imgSrc
                                ? <img src={imgSrc} alt="" className="h-full w-full object-cover" />
                                : <Package className="h-4 w-4 text-[var(--color-text-muted)]" />
                              }
                            </div>
                            <div className="min-w-0">
                              {product?.slug ? (
                                <Link
                                  href={`/marketplace/${product.slug}`}
                                  className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-orange-500 transition-colors truncate block max-w-[140px] sm:max-w-[200px]"
                                >
                                  {product.name}
                                </Link>
                              ) : (
                                <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate block max-w-[140px]">
                                  {product?.name ?? "Manual Link"}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums">
                            {(l.total_clicks ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums">
                            {l.total_conversions ?? 0}
                          </span>
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right">
                          <span className={cn(
                            "inline-flex items-center justify-end gap-1 text-xs font-semibold tabular-nums",
                            isTopRate ? "text-emerald-500" : "text-[var(--color-text-muted)]"
                          )}>
                            {isTopRate && <TrendingUp className="h-3 w-3" />}
                            {rate}%
                          </span>
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right">
                          <span className="text-sm font-bold text-emerald-500 tabular-nums">
                            {formatMoney(Number(l.total_earnings ?? 0), "USD")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer summary row */}
              {topByEarnings.length > 0 && (
                <div className="px-5 sm:px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Showing top {topByEarnings.length} of {links.length} links
                  </span>
                  <span className="text-xs font-bold text-emerald-500">
                    Total: {formatMoney(totalEarnings, "USD")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}