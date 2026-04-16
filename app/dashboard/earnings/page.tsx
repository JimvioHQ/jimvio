"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DollarSign, ArrowUpRight, Clock, CheckCircle, Filter, Download, Wallet, TrendingUp, Zap, ArrowRight, ShieldCheck, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function AffiliateEarningsPage() {
  const { formatMoney } = useCurrency();
  const router = useRouter();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [stats, setStats]       = useState({ total: 0, available: 0, pending: 0, paid: 0 });
  const [loading, setLoading]   = useState(true);
  const [hasAffiliate, setHasAffiliate] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [affRes, commissionsRes, payoutsRes] = await Promise.all([
        supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("affiliate_commissions")
          .select("*, orders(order_number, total_amount, created_at, currency)")
          .order("created_at", { ascending: false }),
        supabase.from("payouts").select("id, amount, status, payout_method, created_at, processed_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50)
      ]);

      if (affRes.data) {
        const aff = affRes.data as Record<string, unknown>;
        setHasAffiliate(true);
        setStats({
          total: Number(aff.total_earnings ?? 0),
          available: Number(aff.available_balance ?? 0),
          pending: Number(aff.pending_earnings ?? 0),
          paid: Number(aff.paid_earnings ?? 0),
        });
      } else {
        setHasAffiliate(false);
      }

      setEarnings(commissionsRes.data || []);
      setPayouts(payoutsRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!loading && hasAffiliate === false) router.replace("/dashboard/roles");
  }, [loading, hasAffiliate, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "var(--color-bg)" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-[32px] bg-surface dark:bg-zinc-900 border border-border shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
            <DollarSign className="h-10 w-10 text-stone-900 dark:text-white" />
          </div>
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Earnings Hub</h2>
           <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest pl-[0.1em]">Reconciling Your Commissions</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-700 pb-24 relative overflow-hidden"
      style={{
        background: "var(--color-bg)",
      }}
    >
      <GlassAmbientGlow color="emerald" position="top-right" />
      <GlassAmbientGlow color="indigo" position="bottom-left" />

      <div className="max-w-[1440px] mx-auto space-y-8 px-6 pt-8 relative z-10">
        
        {/* Header Protocol */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-1">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight flex items-center gap-3">
                 <div className="p-2 rounded-xl bg-surface dark:bg-zinc-800 border border-border shadow-sm shrink-0">
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                 </div>
                 My Earnings
              </h1>
              <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest pl-12">
                 Track your commissions and payout history
              </p>
           </div>
           <div className="flex items-center gap-2">
              <Button variant="outline" className="h-11 px-6 rounded-lg bg-surface dark:bg-zinc-800 text-stone-900 dark:text-white border-border shadow-sm font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:bg-surface-secondary dark:hover:bg-zinc-700">
                 <Download className="h-4 w-4 mr-2" /> Export
              </Button>
              <Button asChild className="h-11 px-6 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-md font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:bg-black dark:hover:bg-stone-100 border-none">
                 <Link href="/dashboard/withdrawals"><Wallet className="h-4 w-4 mr-2" /> Withdraw</Link>
              </Button>
           </div>
        </div>

        {/* Breakdown Protocol */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="p-6 flex flex-col justify-between rounded-xl bg-surface/40 dark:bg-zinc-900/40 border border-border shadow-sm group">
              <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                 <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                 <p className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight leading-none tabular-nums">{formatMoney(stats.pending, "USD")}</p>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-2">Pending</p>
              </div>
           </div>
           <div className="p-6 flex flex-col justify-between rounded-xl bg-surface/40 dark:bg-zinc-900/40 border border-border shadow-sm group">
              <div className="w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                 <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                 <p className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight leading-none tabular-nums">{formatMoney(stats.available, "USD")}</p>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-2">Available</p>
              </div>
           </div>
           <div className="p-6 flex flex-col justify-between rounded-xl bg-surface/40 dark:bg-zinc-900/40 border border-border shadow-sm group">
              <div className="w-11 h-11 rounded-lg bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                 <ArrowUpRight className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                 <p className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight leading-none tabular-nums">{formatMoney(stats.paid, "USD")}</p>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-2">Total Paid</p>
              </div>
           </div>
           <div className="p-6 flex flex-col justify-between rounded-xl bg-surface/40 dark:bg-zinc-900/40 border border-border shadow-sm group">
              <div className="w-11 h-11 rounded-lg bg-sky-500/10 border border-sky-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                 <Zap className="h-6 w-6 text-sky-500" />
              </div>
              <div>
                 <p className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight leading-none tabular-nums">{formatMoney(stats.total, "USD")}</p>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-2">Lifetime</p>
              </div>
           </div>
        </div>

         {/* Global Registry Table */}
        <div className="rounded-xl border border-border bg-surface/40 dark:bg-zinc-900/40 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-border flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                 <h3 className="text-lg font-bold text-stone-900 dark:text-white">Commission Log</h3>
                 <p className="text-[10px] uppercase tracking-widest text-stone-400">Detailed referral income mapping</p>
              </div>
              <div className="flex items-center gap-2 bg-surface/40 dark:bg-zinc-900/40 p-1 rounded-lg border border-border shadow-sm">
                 {["All Time", "This Month", "Pending"].map((label, i) => (
                    <button key={i} className={cn(
                       "h-8 px-4 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
                       i === 0 ? "bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-900 dark:text-stone-600 dark:hover:text-white"
                    )}>{label}</button>
                 ))}
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface/20 dark:bg-zinc-900/10">
                    <th className="py-4 pl-6 pr-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Order Ref</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border text-center">Date</th>
                    <th className="py-4 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Sale</th>
                    <th className="py-4 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-emerald-500 border-b border-border">Earning</th>
                    <th className="py-4 px-4 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Status</th>
                    <th className="py-4 pr-6 border-b border-border" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {earnings.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="py-24 text-center space-y-4">
                          <div className="w-20 h-20 bg-surface dark:bg-zinc-800 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-border shadow-xl text-stone-100 dark:text-stone-800 dark:text-zinc-200">
                             <DollarSign className="h-10 w-10 text-stone-100 dark:text-stone-800 dark:text-zinc-200" />
                          </div>
                          <p className="text-xl font-black text-stone-900 dark:text-white tracking-tighter">No Commissions Yet</p>
                          <p className="text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed">Promote products and complete missions to start earning.</p>
                       </td>
                    </tr>
                  ) : (
                    earnings.map(e => (
                      <tr key={e.id} className="hover:bg-surface/60 dark:hover:bg-zinc-800/60 transition-colors group">
                        <td className="pl-6 pr-4 py-5 font-bold text-sm text-stone-900 dark:text-white">
                           #{e.orders?.order_number || String(e.id).slice(0, 8)}
                        </td>
                        <td className="px-4 py-5 text-center">
                           <p className="text-[12px] font-bold text-stone-900 dark:text-white">{new Date(e.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-5 text-right">
                           <p className="text-[13px] font-medium text-stone-400 tabular-nums">{formatMoney(Number(e.orders?.total_amount || 0), (e.orders?.currency as string) || "USD")}</p>
                        </td>
                        <td className="px-4 py-5 text-right">
                           <p className="text-base font-bold text-emerald-500 tabular-nums">{formatMoney(Number(e.commission_amount ?? e.amount ?? 0), "USD")}</p>
                        </td>
                        <td className="px-4 py-5 text-center">
                           <span className={cn(
                             "px-2 py-1 rounded text-[9px] font-bold uppercase",
                             e.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                           )}>
                              {e.status || "PENDING"}
                           </span>
                        </td>
                        <td className="pr-6 py-5 text-right">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-border hover:bg-stone-900 dark:hover:bg-white text-stone-400 hover:text-white dark:hover:text-stone-900 transition-all">
                              <ArrowRight className="h-4 w-4" />
                           </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
           </div>
        </div>

        {/* Settlement Registry */}
        <div className="rounded-xl border border-border bg-surface/40 dark:bg-zinc-900/40 shadow-sm overflow-hidden mt-8">
           <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="space-y-1">
                 <h3 className="text-lg font-bold text-stone-900 dark:text-white">Payout History</h3>
                 <p className="text-[10px] uppercase tracking-widest text-stone-400">Past settlements</p>
              </div>
              <History className="h-6 w-6 text-stone-300" />
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface/20 dark:bg-zinc-900/10">
                    <th className="py-4 pl-6 pr-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Date</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Method</th>
                    <th className="py-4 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Amount</th>
                    <th className="py-4 px-4 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Status</th>
                    <th className="py-4 pr-6 border-b border-border" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payouts.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="py-20 text-center text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                          No payout history. <Link href="/dashboard/withdrawals" className="text-emerald-500 hover:text-emerald-600 underline ml-2">Request your first withdrawal</Link>
                       </td>
                    </tr>
                  ) : (
                    payouts.map(p => (
                      <tr key={p.id} className="hover:bg-surface/80 dark:hover:bg-zinc-800/80 transition-all duration-500 group">
                        <td className="pl-10 pr-6 py-8 font-black text-lg text-stone-900 dark:text-white tracking-tighter">
                           {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-8">
                           <p className="text-[14px] font-black text-stone-900 dark:text-white tracking-tight capitalize">{String(p.payout_method || "—").replace(/_/g, " ")}</p>
                           <p className="text-[9px] font-black text-stone-300 dark:text-stone-700 uppercase tracking-widest mt-1">Payment Hub</p>
                        </td>
                        <td className="px-6 py-8 text-right font-black text-2xl text-emerald-500 tabular-nums tracking-tighter">
                           {formatMoney(Number(p.amount ?? 0), "USD")}
                        </td>
                        <td className="px-6 py-8 text-center">
                           <GlassPill color={p.status === "paid" ? "emerald" : p.status === "failed" ? "red" : "orange"} className="mx-auto px-4 py-2 font-black border-border shadow-sm ring-1 ring-border bg-surface/40 dark:bg-zinc-900/40">
                              {p.status?.toUpperCase() || "PENDING"}
                           </GlassPill>
                        </td>
                        <td className="pr-10 py-8 text-right">
                           <div className="w-12 h-12 rounded-2xl bg-surface dark:bg-zinc-800 border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ShieldCheck className="h-5 w-5 text-emerald-400" />
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}
