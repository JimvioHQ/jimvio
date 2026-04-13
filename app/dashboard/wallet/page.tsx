"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { 
  Wallet, DollarSign, ArrowUpRight, ArrowDownRight, 
  Clock, CheckCircle2, Filter, Download, 
  Store, Users, Sparkles, TrendingUp, History,
  ArrowLeft, RefreshCw, ChevronRight, ShieldCheck, ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { useCurrency } from "@/context/CurrencyContext";
import { getUserWalletData } from "@/lib/actions/wallet";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function WalletDashboardPage() {
  const { formatMoney } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    async function load() {
      const res = await getUserWalletData();
      if (res.success) {
        setData(res);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "#f8f7f5" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 capitalize pl-1">Accessing Wallet...</p>
      </div>
    );
  }

  const wallet = data?.wallet || { available_balance: 0, pending_balance: 0, total_earned: 0 };
  const transactions = data?.transactions || [];
  const agg = data?.aggregation || { vendor: 0, affiliate: 0, creator: 0, other: 0 };

  const filteredTransactions = transactions.filter((tx: any) => {
    if (activeTab === "all") return true;
    if (activeTab === "vendor") return tx.type === "vendor_earning";
    if (activeTab === "affiliate") return tx.type === "affiliate_commission" || tx.type === "affiliate_earning";
    if (activeTab === "creator") return tx.type === "community_earning";
    return true;
  });

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.03) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.03) 0%, transparent 55%), #f8f7f5",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-8 px-6 pt-10 relative z-10">
        
        {/* Header - Simpler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-xl bg-white border border-stone-100 shadow-sm hover:bg-white active:scale-95 transition-all text-stone-500">
                <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <div className="space-y-1">
                 <h1 className="text-2xl font-bold text-stone-900 tracking-tight">My Wallet</h1>
                 <p className="text-[11px] font-bold text-stone-400 capitalize pl-0.5">Manage your earnings and transfers</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
               <Button asChild variant="orange" className="h-11 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-sm">
                <Link href="/dashboard/withdrawals">Withdraw Funds</Link>
              </Button>
           </div>
        </div>

        {/* Balance Card - Softer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <GlassCard className="lg:col-span-2 p-10 rounded-[32px] border-white bg-white/60 shadow-sm relative overflow-hidden group">
              <div className="space-y-10 relative z-10">
                 <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                       <span className="text-[10px] font-bold text-stone-400 capitalize">Available to Withdraw</span>
                    </div>
                    <p className="text-6xl font-black text-stone-900 tracking-tight leading-none tabular-nums">
                       {formatMoney(wallet.available_balance, "USD")}
                    </p>
                 </div>
                 
                 <div className="flex flex-wrap gap-4">
                    <div className="px-6 py-4 rounded-2xl bg-white border border-stone-50 shadow-sm min-w-[140px]">
                       <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1">Pending Clearance</p>
                       <p className="text-xl font-bold text-stone-900 tabular-nums">{formatMoney(wallet.pending_balance, "USD")}</p>
                    </div>
                    <div className="px-6 py-4 rounded-2xl bg-white border border-stone-50 shadow-sm min-w-[140px]">
                       <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1">Total Earned</p>
                       <p className="text-xl font-bold text-stone-900 tabular-nums">{formatMoney(wallet.total_earned, "USD")}</p>
                    </div>
                 </div>
              </div>
              
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
                 <Wallet className="h-40 w-40 text-stone-900" />
              </div>
           </GlassCard>

           <GlassCard className="p-8 rounded-[32px] bg-white border border-stone-100 shadow-sm flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-3">
                 <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <ShieldCheck className="h-4 w-4" />
                 </div>
                 <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Secure Escrow</h3>
              </div>
              <p className="text-[13px] font-medium text-stone-500 leading-relaxed">
                 Your funds are held securely until the order is successfully delivered to the buyer.
              </p>
              <Button asChild variant="outline" className="w-full h-11 rounded-xl border-stone-100 text-stone-900 font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                 <Link href="/dashboard/orders">View Active Orders</Link>
              </Button>
           </GlassCard>
        </div>

        {/* Earning Breakdown - Simple Row */}
        <div className="space-y-4">
           <h2 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-1">Earning Sources</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                 { label: "Product Sales", value: agg.vendor, icon: Store, color: "text-sky-500", bg: "bg-sky-50" },
                 { label: "Affiliate Earnings", value: agg.affiliate, icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
                 { label: "Creator Bonuses", value: agg.creator, icon: Sparkles, color: "text-amber-500", bg: "bg-amber-50" },
              ].map((stat, i) => (
                 <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-stone-50 shadow-sm">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white shadow-sm", stat.bg, stat.color)}>
                       <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                       <p className="text-lg font-bold text-stone-900 tracking-tight leading-none">{formatMoney(stat.value, "USD")}</p>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1.5 truncate">{stat.label}</p>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Transaction History - Soft Table */}
        <GlassCard className="rounded-[32px] border-white bg-white/60 shadow-sm overflow-hidden">
           <div className="p-8 border-b border-stone-50 bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                 <div className="p-2 rounded-lg bg-white border border-stone-50 shadow-sm text-stone-300">
                    <History className="h-4 w-4" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-stone-900 tracking-tight">Transaction History</h3>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Recent account activity</p>
                 </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 items-center no-scrollbar">
                 {["all", "vendor", "affiliate", "creator"].map((tab) => (
                   <button 
                     key={tab}
                     className={cn(
                       "px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border", 
                       activeTab === tab 
                         ? "bg-stone-900 border-transparent text-white shadow-md" 
                         : "bg-stone-50 border-stone-50 text-stone-400 hover:text-stone-900 hover:bg-white"
                     )}
                     onClick={() => setActiveTab(tab)}
                   >
                     {tab}
                   </button>
                 ))}
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-stone-50/40">
                       <th className="px-8 py-5 text-[10px] font-bold capitalize text-stone-400">Description</th>
                       <th className="px-8 py-5 text-[10px] font-bold capitalize text-stone-400">Date</th>
                       <th className="px-8 py-5 text-right text-[10px] font-bold capitalize text-stone-400">Amount</th>
                       <th className="px-8 py-5 text-center text-[10px] font-bold capitalize text-stone-400">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-50">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                         <td colSpan={4} className="py-20 text-center">
                            <p className="text-[11px] font-bold text-stone-300 uppercase tracking-widest">No activities found</p>
                         </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-white/60 transition-all duration-300 group">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className={cn(
                                   "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 shadow-sm",
                                   tx.type === "vendor_earning" ? "bg-sky-50 border-sky-100 text-sky-600" :
                                   tx.type === "affiliate_commission" ? "bg-purple-50 border-purple-100 text-purple-600" :
                                   "bg-stone-50 border-stone-100 text-stone-400"
                                 )}>
                                    {tx.type === "vendor_earning" ? <Store className="h-4 w-4" /> : 
                                     tx.type === "affiliate_commission" ? <Users className="h-4 w-4" /> :
                                     <Sparkles className="h-4 w-4" />}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="font-bold text-sm text-stone-900 truncate max-w-[180px] tracking-tight capitalize">
                                      {tx.type.replace(/_/g, " ")}
                                    </p>
                                    <p className="text-[10px] text-stone-400 font-bold capitalize truncate max-w-[140px]">{tx.reference}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6 text-sm font-bold text-stone-400 tabular-nums">
                              {new Date(tx.created_at).toLocaleDateString()}
                           </td>
                           <td className="px-8 py-6 text-right">
                              <span className={cn(
                                 "font-bold text-base tabular-nums tracking-tight",
                                 tx.type.includes('earning') || tx.type.includes('commission') ? "text-emerald-600" : "text-stone-900"
                              )}>
                                 +{formatMoney(tx.amount, tx.currency || "USD")}
                              </span>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex justify-center">
                                 <GlassPill color={tx.status === "completed" ? "emerald" : "orange"} className="font-bold text-[9px] px-4 py-1.5 uppercase tracking-widest border-none shadow-none">
                                    {tx.status}
                                 </GlassPill>
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
