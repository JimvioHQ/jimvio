'use client';

import React, { useEffect, useState, useCallback } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { BarChart3, ShoppingCart, DollarSign, Video, Heart, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass";
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
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-12"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.07) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.07) 0%, transparent 55%), #f0ede8",
      }}
    >
      <div className="max-w-[1400px] mx-auto space-y-6 px-4 sm:px-6 pt-5">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 flex items-center gap-3">
             <div className="p-2 rounded-[14px] bg-white/60 border border-white/80 shadow-sm shrink-0">
               <BarChart3 className="h-6 w-6 text-orange-500" />
             </div>
             Buyer Insights
          </h1>
          <p className="text-[12px] font-semibold text-stone-500 mt-1 uppercase tracking-widest pl-14">Track your spending, digital purchases, and library engagement</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-5 flex flex-col justify-center">
             <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 flex items-center gap-1.5"><ShoppingCart className="h-4 w-4 text-blue-500" /> Total Purchases</p>
             <p className="text-[28px] font-bold text-stone-900 tabular-nums leading-none">{data?.totalPurchases ?? 0}</p>
          </GlassCard>
          <GlassCard className="p-5 flex flex-col justify-center">
             <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 flex items-center gap-1.5"><DollarSign className="h-4 w-4 text-emerald-500" /> Total Spent</p>
             <p className="text-[28px] font-bold text-emerald-600 tabular-nums leading-none truncate max-w-full">{formatMoney(data?.totalSpent ?? 0, "RWF")}</p>
          </GlassCard>
          <GlassCard className="p-5 flex flex-col justify-center">
             <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 flex items-center gap-1.5"><Video className="h-4 w-4 text-purple-500" /> Library Assets</p>
             <p className="text-[28px] font-bold text-stone-900 tabular-nums leading-none">{data?.libraryCount ?? 0}</p>
          </GlassCard>
          <GlassCard className="p-5 flex flex-col justify-center">
             <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 flex items-center gap-1.5"><Heart className="h-4 w-4 text-pink-500" /> Wishlist</p>
             <p className="text-[28px] font-bold text-stone-900 tabular-nums leading-none">{data?.wishlistCount ?? 0}</p>
          </GlassCard>
        </div>

        <GlassCard className="overflow-hidden bg-white/40">
          <div className="border-b border-stone-200/50 bg-white/40 py-4 px-6 flex flex-col">
            <h3 className="text-[14px] font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              Spending & Purchase History
            </h3>
            <p className="text-[12px] font-semibold text-stone-500 uppercase tracking-widest mt-1">Monthly breakdown of your marketplace activity.</p>
          </div>
          <div className="pt-6 pb-6 px-6 h-[400px]">
            {data?.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716c", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#78716c", fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v > 1000 ? (v/1000).toFixed(1) + 'k' : v}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#78716c", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.4)' }}
                    contentStyle={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, fontSize: 12, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
                  />
                  <Bar yAxisId="left" dataKey="spent" name="Amount Spent" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="right" dataKey="purchases" name="Purchases" fill="#3b82f6" opacity={0.6} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 text-[12px] font-semibold text-stone-500 uppercase tracking-widest">
                 <BarChart3 className="h-10 w-10 text-stone-300 mb-3" />
                 <p>No historical data available yet.</p>
              </div>
            )}
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
