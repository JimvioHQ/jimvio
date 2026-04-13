"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DollarSign, ArrowUpRight, Clock, CheckCircle, Filter, Download, Wallet, TrendingUp, Zap, ArrowRight, ShieldCheck, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
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
      <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "#f8f7f5" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-[32px] bg-white border border-white shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
            <DollarSign className="h-10 w-10 text-stone-900" />
          </div>
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-[14px] font-black text-stone-900 uppercase tracking-[0.4em] pl-[0.4em]">Earnings Hub</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Reconciling Your Commissions</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-700 pb-24 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(16,185,129,0.05) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(99,102,241,0.05) 0%, transparent 55%), #f8f7f5",
      }}
    >
      <GlassAmbientGlow color="emerald" position="top-right" />
      <GlassAmbientGlow color="indigo" position="bottom-left" />

      <div className="max-w-[1440px] mx-auto space-y-12 px-8 pt-12 relative z-10">
        
        {/* Header Protocol */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-[20px] bg-white border border-white shadow-2xl shrink-0">
                    <TrendingUp className="h-8 w-8 text-emerald-500" />
                 </div>
                 My Earnings
              </h1>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Track your commissions and payout history
              </p>
           </div>
           <div className="flex items-center gap-3">
              <Button variant="outline" className="h-14 px-8 rounded-full bg-white text-stone-900 border-white shadow-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all hover:bg-stone-50">
                 <Download className="h-4 w-4 mr-3" /> Export Report
              </Button>
              <Button asChild className="h-14 px-8 rounded-full bg-stone-900 text-white shadow-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all hover:bg-black">
                 <Link href="/dashboard/withdrawals"><Wallet className="h-4 w-4 mr-3" /> Withdraw Funds</Link>
              </Button>
           </div>
        </div>

        {/* Breakdown Protocol */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-amber-50 border border-amber-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <Clock className="h-7 w-7 text-amber-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 tracking-tighter leading-none tabular-nums">{formatMoney(stats.pending, "USD")}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Pending Earnings</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 tracking-tighter leading-none tabular-nums">{formatMoney(stats.available, "USD")}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Available Balance</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <ArrowUpRight className="h-7 w-7 text-indigo-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 tracking-tighter leading-none tabular-nums">{formatMoney(stats.paid, "USD")}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Total Paid Out</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-sky-50 border border-sky-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <Zap className="h-7 w-7 text-sky-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 tracking-tighter leading-none tabular-nums">{formatMoney(stats.total, "USD")}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Lifetime Earnings</p>
              </div>
           </GlassCard>
        </div>

        {/* Global Registry Table */}
        <GlassCard className="rounded-[48px] border-white bg-white/60 shadow-xl overflow-hidden">
           <div className="p-10 border-b border-stone-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                 <h3 className="text-3xl font-black text-stone-900 tracking-tighter">Commission Log</h3>
                 <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">Detailed referral income mapping</p>
              </div>
              <div className="flex items-center gap-3 bg-white/60 p-1.5 rounded-[22px] border border-white shadow-lg backdrop-blur-3xl overflow-x-auto">
                 {["All Time", "This Month", "Pending", "Settled"].map((label, i) => (
                    <button key={i} className={cn(
                       "h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                       i === 0 ? "bg-stone-900 text-white shadow-xl" : "text-stone-400 hover:text-stone-900"
                    )}>{label}</button>
                 ))}
                 <div className="w-px h-6 bg-stone-200 mx-2" />
                 <Button variant="ghost" className="h-11 px-4 text-stone-400 hover:text-stone-900"><Filter className="h-4 w-4" /></Button>
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50/40">
                    <th className="py-8 pl-10 pr-6 text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100">Order Ref</th>
                    <th className="py-8 px-6 text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 text-center">Date</th>
                    <th className="py-8 px-6 text-right text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100">Sale Amount</th>
                    <th className="py-8 px-6 text-right text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500 border-b border-stone-100">My Commission</th>
                    <th className="py-8 px-6 text-center text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100">Status</th>
                    <th className="py-8 pr-10 border-b border-stone-100" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {earnings.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="py-24 text-center space-y-4">
                          <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-white shadow-xl text-stone-100">
                             <DollarSign className="h-10 w-10 text-stone-100" />
                          </div>
                          <p className="text-xl font-black text-stone-900 tracking-tighter">No Commissions Yet</p>
                          <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed">Promote products and complete missions to start earning.</p>
                       </td>
                    </tr>
                  ) : (
                    earnings.map(e => (
                      <tr key={e.id} className="hover:bg-white/80 transition-all duration-500 group">
                        <td className="pl-10 pr-6 py-10 font-black text-xl text-stone-900 tracking-tighter">
                           #{e.orders?.order_number || String(e.id).slice(0, 8)}
                        </td>
                        <td className="px-6 py-10 text-center">
                           <p className="text-[12px] font-black text-stone-900 tracking-tighter">{new Date(e.created_at).toLocaleDateString()}</p>
                           <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mt-1">Order Date</p>
                        </td>
                        <td className="px-6 py-10 text-right">
                           <p className="text-lg font-black text-stone-400 tabular-nums tracking-tighter">{formatMoney(Number(e.orders?.total_amount || 0), (e.orders?.currency as string) || "USD")}</p>
                           <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest mt-1">Sale Vol</p>
                        </td>
                        <td className="px-6 py-10 text-right">
                           <p className="text-2xl font-black text-emerald-500 tabular-nums tracking-tighter">{formatMoney(Number(e.commission_amount ?? e.amount ?? 0), "USD")}</p>
                           <p className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest mt-1">Commission</p>
                        </td>
                        <td className="px-6 py-10 text-center">
                           <GlassPill color={e.status === "paid" ? "emerald" : e.status === "cancelled" ? "red" : "orange"} className="mx-auto px-4 py-2 font-black border-white shadow-sm ring-1 ring-white">
                              {e.status?.toUpperCase() || "PENDING"}
                           </GlassPill>
                        </td>
                        <td className="pr-10 py-10 text-right">
                           <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white border border-transparent group-hover:bg-stone-900 group-hover:text-white transition-all shadow-lg active:scale-90">
                              <ArrowRight className="h-5 w-5" />
                           </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
           </div>
        </GlassCard>

        {/* Settlement Registry */}
        <GlassCard className="rounded-[48px] border-white bg-white/60 shadow-xl overflow-hidden mt-12">
           <div className="p-10 border-b border-stone-100 flex items-center justify-between">
              <div className="space-y-1">
                 <h3 className="text-3xl font-black text-stone-900 tracking-tighter">Payout History</h3>
                 <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">All successful settlements to your accounts</p>
              </div>
              <History className="h-8 w-8 text-stone-100" />
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50/40">
                    <th className="py-8 pl-10 pr-6 text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100">Payout Date</th>
                    <th className="py-8 px-6 text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100">Payment Method</th>
                    <th className="py-8 px-6 text-right text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100">Amount</th>
                    <th className="py-8 px-6 text-center text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100">Status</th>
                    <th className="py-8 pr-10 border-b border-stone-100" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {payouts.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="py-20 text-center text-[11px] font-black text-stone-400 uppercase tracking-widest">
                          No payout history. <Link href="/dashboard/withdrawals" className="text-emerald-500 hover:text-emerald-600 underline ml-2">Request your first withdrawal</Link>
                       </td>
                    </tr>
                  ) : (
                    payouts.map(p => (
                      <tr key={p.id} className="hover:bg-white/80 transition-all duration-500 group">
                        <td className="pl-10 pr-6 py-8 font-black text-lg text-stone-900 tracking-tighter">
                           {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-8">
                           <p className="text-[14px] font-black text-stone-900 tracking-tight capitalize">{String(p.payout_method || "—").replace(/_/g, " ")}</p>
                           <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest mt-1">Payment Hub</p>
                        </td>
                        <td className="px-6 py-8 text-right font-black text-2xl text-emerald-500 tabular-nums tracking-tighter">
                           {formatMoney(Number(p.amount ?? 0), "USD")}
                        </td>
                        <td className="px-6 py-8 text-center text-center">
                           <GlassPill color={p.status === "paid" ? "emerald" : p.status === "failed" ? "red" : "orange"} className="mx-auto px-4 py-2 font-black border-white shadow-sm ring-1 ring-white">
                              {p.status?.toUpperCase() || "PENDING"}
                           </GlassPill>
                        </td>
                        <td className="pr-10 py-8 text-right">
                           <div className="w-12 h-12 rounded-2xl bg-white border border-stone-50 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ShieldCheck className="h-5 w-5 text-emerald-400" />
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
