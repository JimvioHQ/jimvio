'use client';

import React, { useEffect, useState, useCallback } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { BarChart3, ShoppingCart, DollarSign, Video, Heart, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/context/CurrencyContext";

export default function BuyerAnalyticsPage() {
  const { formatMoney } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/buyer/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">Buyer Insights</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Track your spending, digital purchases, and library engagement.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500"><ShoppingCart className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Total Purchases</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)]">{data?.totalPurchases ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500"><DollarSign className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Total Spent</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)] truncate max-w-[140px]">
                  {formatMoney(data?.totalSpent ?? 0, "RWF")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500"><Video className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Library Assets</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)]">{data?.libraryCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-pink-500/10 text-pink-500"><Heart className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Wishlist</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)]">{data?.wishlistCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-[var(--color-border)] overflow-hidden shadow-sm">
          <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/30 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
              <BarChart3 className="h-5 w-5 text-[var(--color-accent)]" />
              Spending & Purchase History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[380px]">
            {data?.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v > 1000 ? (v/1000).toFixed(1) + 'k' : v}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface-secondary)' }}
                    contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, fontSize: 13, fontWeight: "bold" }}
                  />
                  <Bar yAxisId="left" dataKey="spent" name="Amount Spent" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="right" dataKey="purchases" name="Purchases" fill="#3B82F6" opacity={0.5} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center p-20 text-center text-[var(--color-text-muted)]">No historical data available</div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
