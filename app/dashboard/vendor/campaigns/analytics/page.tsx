'use client';

import React, { useEffect, useState, useCallback } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { BarChart3, Megaphone, Flag, Wallet, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/context/CurrencyContext";

export default function CampaignAnalyticsPage() {
  const { formatMoney } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/campaigns/analytics");
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
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">Mission Intelligence</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Audit your UGC Escrow budget allocation and content verification throughput.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500"><Megaphone className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Active Missions</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)]">{data?.activeCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500"><Flag className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Total Submissions</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)]">{data?.totalSubmissions ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500"><CheckCircle className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Network Quality</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)]">{data?.qualityRate ?? 0}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500"><Wallet className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Escrow Burn</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)] truncate max-w-[140px]">
                  {formatMoney(data?.totalSpent ?? 0, "RWF")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-[var(--color-border)] overflow-hidden shadow-sm">
          <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/30 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Escrow Efficiency by Campaign
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[450px]">
            {data?.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} layout="vertical" margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v > 1000 ? (v/1000).toFixed(1) + 'k' : v}`} />
                  <YAxis dataKey="campaign" type="category" width={150} tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface-secondary)' }}
                    contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, fontSize: 13, fontWeight: "bold" }}
                  />
                  <Bar dataKey="deployed" name="Escrow Value" fill="var(--color-accent)" radius={[0, 6, 6, 0]} barSize={24} />
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
