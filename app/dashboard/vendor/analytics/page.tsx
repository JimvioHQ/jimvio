"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Eye,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { groupOrderLineRowsToCartOrders } from "@/lib/currency/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function VendorAnalyticsPage() {
  const { formatMoney, formatCartTotalsLabel } = useCurrency();
  const supabase = createClient();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueLineItems, setRevenueLineItems] = useState<
    { total_price: number | string; orders?: { currency?: string | null } | null }[]
  >([]);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalOrders: 0,
    totalRevenue: 0,
    revenueDisplayCurrency: "RWF",
    conversionRate: 0,
    viewsByMonth: [] as { month: string; views: number }[],
    ordersByMonth: [] as { month: string; orders: number }[],
    revenueByMonth: [] as { month: string; revenue: number }[],
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: v } = await supabase.from("vendors").select("id").eq("user_id", user.id).single();
      if (!v) {
        setRevenueLineItems([]);
        setLoading(false);
        return;
      }
      setVendorId(v.id);

      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return { key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString("default", { month: "short" }) + " " + d.getFullYear() };
      });

      const [productsRes, orderItemsRes] = await Promise.all([
        supabase.from("products").select("id, view_count").eq("vendor_id", v.id).eq("is_active", true),
        supabase
          .from("order_items")
          .select("total_price, created_at, orders(currency)")
          .eq("vendor_id", v.id)
          .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const products = productsRes.data ?? [];
      const items = orderItemsRes.data ?? [];
      const totalViews = products.reduce((s, p) => s + (Number(p.view_count) ?? 0), 0);
      const totalOrders = items.length;
      const totalRevenue = items.reduce((s, i) => s + Number(i.total_price), 0);
      setRevenueLineItems(items as typeof revenueLineItems);
      const revenueDisplayCurrency = (items[0] as { orders?: { currency?: string } } | undefined)?.orders?.currency?.toUpperCase() || "RWF";
      const conversionRate = totalViews > 0 ? Math.round((totalOrders / totalViews) * 10000) / 100 : 0;

      const viewsByMonth = months.map((m) => ({ month: m.label, views: 0 }));
      const ordersByMonth = months.map((m) => ({ month: m.label, orders: 0 }));
      const revenueByMonth = months.map((m) => ({ month: m.label, revenue: 0 }));

      items.forEach((item: any) => {
        const d = new Date(item.created_at);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        const mi = months.findIndex((x) => x.key === key);
        if (mi >= 0) {
          ordersByMonth[mi].orders += 1;
          revenueByMonth[mi].revenue += Number(item.total_price);
        }
      });

      setStats({
        totalViews,
        totalOrders,
        totalRevenue,
        revenueDisplayCurrency,
        conversionRate,
        viewsByMonth,
        ordersByMonth,
        revenueByMonth,
      });
      setLoading(false);
    }
    load();
  }, []);

  const totalRevenueLabel = useMemo(() => {
    if (!revenueLineItems.length) return "—";
    return formatCartTotalsLabel(groupOrderLineRowsToCartOrders(revenueLineItems));
  }, [revenueLineItems, formatCartTotalsLabel]);

  if (!loading && !vendorId) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-14 w-14 text-[var(--color-border)] mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Vendor account required</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Apply to become a vendor to view analytics.</p>
        <Link href="/dashboard/activate/vendor"><button className="mt-4 px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium">Become a Vendor</button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard"><button className="p-2 rounded-lg hover:bg-[var(--color-surface-secondary)]"><ArrowLeft className="h-4 w-4" /></button></Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Vendor Analytics</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Product views, orders, revenue & conversion</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-[var(--color-border)]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600"><Eye className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">Product Views</p>
                  <p className="text-xl font-bold text-[var(--color-text-primary)]">{stats.totalViews.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[var(--color-border)]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-600"><ShoppingCart className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">Orders</p>
                  <p className="text-xl font-bold text-[var(--color-text-primary)]">{stats.totalOrders}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[var(--color-border)]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600"><DollarSign className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">Revenue (6 mo.)</p>
                  <p className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">{totalRevenueLabel}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[var(--color-border)]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-100 text-violet-600"><TrendingUp className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">Conversion Rate</p>
                  <p className="text-xl font-bold text-[var(--color-text-primary)]">{stats.conversionRate}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-[var(--color-border)]">
              <CardHeader><CardTitle className="text-base text-[var(--color-text-primary)]">Orders (last 6 months)</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.ordersByMonth} margin={{ left: -15, right: 0, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'var(--color-surface-secondary)' }}
                      contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="orders" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-[var(--color-border)]">
              <CardHeader><CardTitle className="text-base text-[var(--color-text-primary)]">Revenue (last 6 months)</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.revenueByMonth} margin={{ left: -15, right: 0, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val > 1000 ? (val/1000).toFixed(1) + 'k' : val}`} />
                    <Tooltip
                      cursor={{ fill: 'var(--color-surface-secondary)' }}
                      formatter={(val: number) => formatMoney(val, stats.revenueDisplayCurrency)}
                      contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
