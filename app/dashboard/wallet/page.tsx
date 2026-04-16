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
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "var(--color-bg)" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 dark:text-stone-500 capitalize pl-1">Accessing Wallet...</p>
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
    <div className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden bg-background">
      <div className="max-w-5xl mx-auto space-y-8 px-6 pt-10 relative z-10">
        
        {/* Header - Simpler */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <Button asChild variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-xl bg-surface dark:bg-zinc-800 border border-border shadow-sm hover:bg-surface dark:hover:bg-zinc-700 active:scale-95 transition-all text-stone-500 dark:text-stone-400">
                 <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
               </Button>
               <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">My Wallet</h1>
                  <p className="text-[11px] font-bold text-stone-400 dark:text-stone-500 capitalize pl-0.5">Manage your earnings and transfers</p>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
                <Button asChild variant="orange" className="h-11 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-sm">
                 <Link href="/dashboard/withdrawals">Withdraw Funds</Link>
               </Button>
            </div>
         </div>

        {/* Balance Card - Softer & Compact */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            <GlassCard className="lg:col-span-2 p-6 sm:p-10 rounded-2xl sm:rounded-[32px] border-border bg-surface/60 dark:bg-zinc-800/40 shadow-sm relative overflow-hidden group">
               <div className="space-y-6 sm:space-y-10 relative z-10">
                  <div className="space-y-2 sm:space-y-4">
                     <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[9px] sm:text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest opacity-80">Available to Withdraw</span>
                     </div>
                     <p className="text-3xl sm:text-5xl font-black text-stone-900 dark:text-white tracking-tight leading-none tabular-nums">
                        {formatMoney(wallet.available_balance, "USD")}
                     </p>
                  </div>
                 
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                     <div className="px-5 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl bg-surface dark:bg-zinc-900 border border-border shadow-sm min-w-[120px] sm:min-w-[140px]">
                        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-stone-300 dark:text-stone-700 mb-1">Pending Clearance</p>
                        <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white tabular-nums tracking-tight">{formatMoney(wallet.pending_balance, "USD")}</p>
                     </div>
                     <div className="px-5 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl bg-surface dark:bg-zinc-900 border border-border shadow-sm min-w-[120px] sm:min-w-[140px]">
                        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-stone-300 dark:text-stone-700 mb-1">Total Earned</p>
                        <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white tabular-nums tracking-tight">{formatMoney(wallet.total_earned, "USD")}</p>
                     </div>
                  </div>
              </div>
              
               <div className="absolute top-0 right-0 p-8 sm:p-12 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-1000">
                  <Wallet className="h-32 w-32 sm:h-40 sm:w-40 text-stone-900 dark:text-white" />
               </div>
           </GlassCard>
 
            <GlassCard className="p-6 sm:p-8 rounded-2xl sm:rounded-[32px] bg-surface/60 dark:bg-zinc-800/40 border border-border shadow-sm flex flex-col justify-center space-y-4 sm:space-y-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20">
                     <ShieldCheck className="h-4 w-4" />
                  </div>
                  <h3 className="text-[10px] sm:text-sm font-black text-stone-900 dark:text-white uppercase tracking-widest">Secure Escrow</h3>
               </div>
               <p className="text-[12px] sm:text-[13px] font-medium text-stone-500 dark:text-stone-400 leading-relaxed opacity-80">
                  Your funds are held securely until the order is successfully delivered to the buyer.
               </p>
               <Button asChild variant="outline" className="w-full h-10 sm:h-11 rounded-xl border-border text-stone-900 dark:text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                  <Link href="/dashboard/orders">View Active Orders</Link>
               </Button>
            </GlassCard>
        </div>

        {/* Earning Breakdown - Simple Row */}
         <div className="space-y-4">
            <h2 className="text-[10px] sm:text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest pl-1 opacity-60">Earning Sources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
               {[
                  { label: "Product Sales", value: agg.vendor, icon: Store, color: "text-sky-500", bg: "bg-sky-500/10" },
                  { label: "Affiliate Earnings", value: agg.affiliate, icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
                  { label: "Creator Bonuses", value: agg.creator, icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10" },
               ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl sm:rounded-2xl bg-surface/60 dark:bg-zinc-800/40 border border-border shadow-sm">
                     <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border shadow-sm", stat.bg, stat.color)}>
                        <stat.icon className="h-5 w-5" />
                     </div>
                     <div className="min-w-0">
                        <p className="text-lg font-black text-stone-900 dark:text-white tracking-tight leading-none tabular-nums">{formatMoney(stat.value, "USD")}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-1.5 truncate opacity-70">{stat.label}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>

        {/* Transaction History - Soft Table - Mobile Optimized */}
         <GlassCard className="rounded-2xl sm:rounded-[32px] border-border bg-surface/60 dark:bg-zinc-800/40 shadow-sm overflow-hidden max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0">
            <div className="p-5 sm:p-8 border-b border-border bg-surface/40 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-surface dark:bg-zinc-800 border border-border shadow-sm text-stone-300 dark:text-stone-700">
                     <History className="h-4 w-4" />
                  </div>
                  <div>
                     <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white tracking-tight leading-none">Transaction History</h3>
                     <p className="text-[9px] sm:text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1.5 opacity-60">Recent account activity</p>
                  </div>
               </div>
               <div className="flex gap-1 overflow-x-auto pb-1 items-center no-scrollbar">
                  {["all", "vendor", "affiliate", "creator"].map((tab) => (
                     <button 
                       key={tab}
                       className={cn(
                         "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border", 
                         activeTab === tab 
                           ? "bg-stone-900 dark:bg-white dark:bg-zinc-900 border-transparent text-white dark:text-stone-900 dark:text-white shadow-sm active:scale-95" 
                           : "bg-surface/60 dark:bg-zinc-800/60 border-border text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:text-white dark:hover:text-white hover:bg-surface dark:hover:bg-zinc-700"
                       )}
                       onClick={() => setActiveTab(tab)}
                     >
                       {tab}
                     </button>
                  ))}
               </div>
            </div>
           
            <div className="overflow-x-auto">
               <table className="w-full text-left whitespace-nowrap">
                  <thead>
                     <tr className="bg-surface/40 dark:bg-zinc-900/20 border-b border-border">
                        <th className="px-4 sm:px-8 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Description</th>
                        <th className="px-4 sm:px-8 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Date</th>
                        <th className="px-4 sm:px-8 py-4 text-right text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Amount</th>
                        <th className="px-4 sm:px-8 py-4 text-center text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                     {filteredTransactions.length === 0 ? (
                       <tr>
                          <td colSpan={4} className="py-16 text-center">
                             <p className="text-[10px] font-black text-stone-300 dark:text-stone-700 uppercase tracking-widest">No activities found</p>
                          </td>
                       </tr>
                     ) : (
                       filteredTransactions.map((tx: any) => (
                         <tr key={tx.id} className="hover:bg-surface/60 dark:hover:bg-zinc-800/40 transition-all duration-300 group">
                            <td className="px-4 sm:px-8 py-5">
                               <div className="flex items-center gap-3 sm:gap-4">
                                  <div className={cn(
                                    "w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center shrink-0 shadow-sm",
                                    tx.type === "vendor_earning" ? "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400" :
                                    tx.type === "affiliate_commission" ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400" :
                                    "bg-surface dark:bg-zinc-800 border-border text-stone-400 dark:text-stone-500"
                                  )}>
                                     {tx.type === "vendor_earning" ? <Store className="h-4 w-4" /> : 
                                      tx.type === "affiliate_commission" ? <Users className="h-4 w-4" /> :
                                      <Sparkles className="h-4 w-4" />}
                                  </div>
                                  <div className="min-w-0">
                                     <p className="font-black text-[13px] sm:text-sm text-stone-900 dark:text-white truncate max-w-[140px] sm:max-w-[180px] tracking-tight capitalize leading-none">
                                       {tx.type.replace(/_/g, " ")}
                                     </p>
                                     <p className="text-[9px] text-stone-300 dark:text-stone-700 font-bold capitalize truncate max-w-[140px] mt-1">{tx.reference}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-4 sm:px-8 py-5 text-[11px] font-black text-stone-400 dark:text-stone-500 tabular-nums">
                               {new Date(tx.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 sm:px-8 py-5 text-right">
                               <span className={cn(
                                  "font-black text-sm sm:text-base tabular-nums tracking-tight",
                                  tx.type.includes('earning') || tx.type.includes('commission') ? "text-emerald-600 dark:text-emerald-400" : "text-stone-900 dark:text-white"
                                )}>
                                  +{formatMoney(tx.amount, tx.currency || "USD")}
                               </span>
                            </td>
                            <td className="px-4 sm:px-8 py-5">
                               <div className="flex justify-center">
                                  <GlassPill color={tx.status === "completed" ? "emerald" : "orange"} className="font-black text-[8px] px-3.5 py-1 uppercase tracking-widest border-none shadow-none ring-1 ring-border">
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
