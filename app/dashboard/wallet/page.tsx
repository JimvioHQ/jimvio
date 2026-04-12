"use client";

import React, { useEffect, useState } from "react";
import { 
  Wallet, DollarSign, ArrowUpRight, ArrowDownRight, 
  Clock, CheckCircle2, Filter, Download, 
  Store, Users, Sparkles, TrendingUp, History
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
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

  if (loading) return <div className="py-20 text-center animate-pulse text-[var(--color-text-muted)]">Loading your financial hub...</div>;

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
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-text-primary)] flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              <Wallet className="h-8 w-8" />
            </div>
            My Wallet
          </h1>
          <p className="text-[var(--color-text-muted)] mt-1 font-medium">Manage your earnings across all Jimvio roles</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl border-[var(--color-border)] shadow-sm">
            <Download className="h-4 w-4 mr-2" />
            Report
          </Button>
          <Button className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-lg shadow-[var(--color-accent)]/20 px-6 font-bold" asChild>
            <Link href="/dashboard/withdrawals">Withdraw Funds</Link>
          </Button>
        </div>
      </div>

      {/* Main Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] text-white shadow-2xl shadow-[var(--color-accent)]/20 overflow-hidden relative rounded-[2rem]">
           <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
             <TrendingUp className="h-48 w-48" />
           </div>
           <CardHeader className="relative z-10 pb-2">
             <CardDescription className="text-white/70 font-bold uppercase tracking-[0.2em] text-[10px]">Net Available Balance</CardDescription>
             <CardTitle className="text-5xl font-black tabular-nums tracking-tighter mt-1">
               {formatMoney(wallet.available_balance, "USD")}
             </CardTitle>
           </CardHeader>
           <CardContent className="relative z-10 pt-4 flex flex-wrap gap-6">
             <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
               <p className="text-[10px] font-black uppercase text-white/60 mb-1">Pending Review</p>
               <p className="text-xl font-black tabular-nums">{formatMoney(wallet.pending_balance, "USD")}</p>
             </div>
             <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
               <p className="text-[10px] font-black uppercase text-white/60 mb-1">Lifetime Earned</p>
               <p className="text-xl font-black tabular-nums">{formatMoney(wallet.total_earned, "USD")}</p>
             </div>
           </CardContent>
           <div className="absolute bottom-0 left-0 w-full px-8 py-4 bg-black/5 backdrop-blur-sm border-t border-white/5 flex justify-between items-center">
              <span className="text-[10px] font-bold text-white/80 uppercase">Next Payout Cycle: 24h</span>
              <span className="text-[10px] font-bold text-white/80 uppercase">Verified Account</span>
           </div>
        </Card>

        <Card className="border-[var(--color-border)] shadow-xl rounded-[2rem] bg-[var(--color-surface)] flex flex-col justify-center p-8 border-dashed border-2">
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Escrow Security</span>
                <Clock className="h-4 w-4 text-amber-500" />
             </div>
             <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
               Funds are held in <span className="text-[var(--color-text-primary)] font-bold">Pending</span> until 
               orders are marked as completed by the buyer or system. 
               This ensures marketplace integrity and safe releases.
             </p>
             <Button variant="outline" className="w-full rounded-xl font-bold" asChild>
                <Link href="/dashboard/orders">View Fulfilled Orders</Link>
             </Button>
          </div>
        </Card>
      </div>

      {/* Breakdown by Role */}
      <h2 className="text-xl font-black text-[var(--color-text-primary)] uppercase tracking-widest pt-4">Earnings Breakdown</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Vendor Sales" 
          value={formatMoney(agg.vendor, "USD")} 
          icon={<Store className="h-5 w-5" />} 
          iconColor="from-blue-600 to-cyan-400"
          className="rounded-[1.5rem] shadow-lg border-none bg-gradient-to-br from-white to-[var(--color-surface-secondary)]/30"
        />
        <StatCard 
          title="Affiliate Earnings" 
          value={formatMoney(agg.affiliate, "USD")} 
          icon={<Users className="h-5 w-5" />} 
          iconColor="from-purple-600 to-pink-400"
          className="rounded-[1.5rem] shadow-lg border-none bg-gradient-to-br from-white to-[var(--color-surface-secondary)]/30"
        />
        <StatCard 
          title="Creator Rewards" 
          value={formatMoney(agg.creator, "USD")} 
          icon={<Sparkles className="h-5 w-5" />} 
          iconColor="from-amber-600 to-yellow-400"
          className="rounded-[1.5rem] shadow-lg border-none bg-gradient-to-br from-white to-[var(--color-surface-secondary)]/30"
        />
      </div>

      {/* Transaction History */}
      <Card className="border-[var(--color-border)]/50 shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-[var(--color-surface-secondary)]/50 border-b border-[var(--color-border)]/50 px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <History className="h-5 w-5 text-[var(--color-accent)]" />
                Transaction Ledger
              </CardTitle>
              <CardDescription>Real-time record of all earnings and releases</CardDescription>
            </div>
            <div className="flex items-center gap-2 p-1 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]/50">
              {["all", "vendor", "affiliate", "creator"].map((tab) => (
                <Button 
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  className={cn("rounded-lg px-4 text-[10px] font-black uppercase", activeTab === tab ? "bg-[var(--color-accent)]" : "")}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--color-border)]/30 bg-[var(--color-surface-secondary)]/20">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Type / Reference</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Date</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-right">Amount</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/30">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center grayscale opacity-50">
                      <History className="h-12 w-12 mx-auto mb-4" />
                      <p className="font-bold">No transactions found</p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-[var(--color-surface-secondary)]/10 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            tx.type === "vendor_earning" ? "bg-blue-100 text-blue-600" :
                            tx.type === "affiliate_commission" ? "bg-purple-100 text-purple-600" :
                            tx.type === "community_earning" ? "bg-amber-100 text-amber-600" :
                            "bg-gray-100 text-gray-400"
                          )}>
                             {tx.type === "vendor_earning" ? <Store className="h-4 w-4" /> : 
                              tx.type === "affiliate_commission" ? <Users className="h-4 w-4" /> :
                              <Sparkles className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-[var(--color-text-primary)] leading-none text-sm capitalize">
                              {tx.type.replace(/_/g, " ")}
                            </p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium">{tx.reference}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-medium text-[var(--color-text-muted)]">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className={cn(
                          "font-black text-lg tabular-nums",
                          tx.type.includes('earning') || tx.type.includes('commission') ? "text-emerald-500" : "text-rose-500"
                        )}>
                          +{formatMoney(tx.amount, tx.currency || "USD")}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex justify-center">
                            <Badge variant={tx.status === "completed" ? "success" : "warning"} className="rounded-full px-3 py-1 font-black uppercase text-[9px] tracking-widest">
                               {tx.status}
                            </Badge>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
