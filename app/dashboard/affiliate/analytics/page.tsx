"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MousePointer, ShoppingCart, DollarSign, TrendingUp, BarChart3, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function AffiliateAnalyticsPage() {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<{ id: string } | null>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: aff } = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      setAffiliate(aff ?? null);
      if (aff) {
        const { data } = await supabase
          .from("affiliate_links")
          .select("id, total_clicks, total_conversions, total_earnings, products(id, name, slug, images)")
          .eq("affiliate_id", aff.id)
          .order("total_clicks", { ascending: false });
        setLinks(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (!loading && !affiliate) {
    router.replace("/dashboard/activate/affiliate");
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-[var(--color-text-muted)]">Redirecting…</p>
      </div>
    );
  }

  const totalClicks = links.reduce((s, l) => s + (l.total_clicks ?? 0), 0);
  const totalConversions = links.reduce((s, l) => s + (l.total_conversions ?? 0), 0);
  const totalEarnings = links.reduce((s, l) => s + Number(l.total_earnings ?? 0), 0);

  const chartData = links.slice(0, 12).map((l, i) => {
    const name = (l.products as { name?: string })?.name ?? `Link ${i + 1}`;
    return {
      month: name.length > 15 ? name.slice(0, 12) + "…" : name,
      clicks: l.total_clicks ?? 0,
      conversions: l.total_conversions ?? 0,
      earnings: Number(l.total_earnings ?? 0),
    };
  });

  const topByEarnings = [...links].sort((a, b) => Number(b.total_earnings ?? 0) - Number(a.total_earnings ?? 0)).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-xl">
            <Link href="/dashboard/links"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Affiliate Analytics</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Clicks, conversions, and top-performing products.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clicks" value={loading ? "—" : totalClicks.toLocaleString()} icon={<MousePointer className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" />
        <StatCard title="Conversions" value={loading ? "—" : totalConversions.toLocaleString()} icon={<ShoppingCart className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
        <StatCard title="Commission Earned" value={loading ? "—" : formatCurrency(totalEarnings)} icon={<DollarSign className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
        <StatCard title="Active Links" value={loading ? "—" : links.length.toString()} icon={<TrendingUp className="h-4 w-4" />} iconColor="from-purple-600 to-pink-600" />
      </div>

      <Card className="border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 py-4 px-5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[var(--color-accent)]" />
            Clicks by product
          </CardTitle>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Compare click volume across your promoted products.</p>
        </CardHeader>
        <CardContent className="pt-5 pb-5 px-5">
          <div className="w-full overflow-x-auto" style={{ minHeight: 280, WebkitOverflowScrolling: "touch" }}>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-10 w-10 text-[var(--color-text-muted)] mb-2 opacity-50" />
                <p className="text-sm text-[var(--color-text-muted)]">No data yet. Generate links to see performance.</p>
              </div>
            ) : (
              <RevenueChart data={chartData} type="bar" dataKey="clicks" labelKey="month" height={280} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 py-4 px-5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-[var(--color-accent)]" />
            Top performing products (by earnings)
          </CardTitle>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Your best earners from affiliate referrals.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="w-full min-w-[440px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <th className="text-left font-medium text-[var(--color-text-muted)] py-3.5 pl-5 pr-3">Product</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 px-3 w-20">Clicks</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 px-3 w-24">Conversions</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 pl-3 pr-5 w-28">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {loading ? null : topByEarnings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-[var(--color-text-muted)]">
                      No links yet. <Link href="/dashboard/links" className="text-[var(--color-accent)] hover:underline">Create affiliate links</Link> to see top products.
                    </td>
                  </tr>
                ) : topByEarnings.map((l) => {
                  const product = l.products as { name?: string; slug?: string; images?: string[] } | null;
                  const imgSrc = product && Array.isArray(product.images) && product.images[0] ? product.images[0] : null;
                  return (
                    <tr key={l.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-secondary)]/50 transition-colors">
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden bg-[var(--color-surface-secondary)]">
                            {imgSrc ? (
                              <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]"><Package className="h-4 w-4" /></div>
                            )}
                          </div>
                          {product?.slug ? (
                            <Link href={`/marketplace/${product.slug}`} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] truncate block min-w-0">
                              {product?.name ?? "—"}
                            </Link>
                          ) : (
                            <span className="font-medium text-[var(--color-text-primary)]">{product?.name ?? "—"}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-medium tabular-nums">{l.total_clicks ?? 0}</td>
                      <td className="py-3.5 px-3 text-right font-medium tabular-nums">{l.total_conversions ?? 0}</td>
                      <td className="py-3.5 pl-3 pr-5 text-right font-semibold text-[var(--color-accent)] tabular-nums">{formatCurrency(Number(l.total_earnings ?? 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
