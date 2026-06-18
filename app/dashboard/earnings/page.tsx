"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DollarSign, ArrowUpRight, Clock, CheckCircle, Download, Wallet, TrendingUp, Zap, ArrowRight, History } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { PageHeader, StatusPill } from "@/components/ui/admin";
import { Tile } from "@/components/ui/admin-tile";
import { DashboardPage, DashboardPanel, DashboardActionLink } from "@/components/dashboard/dashboard-page";

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
          <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-sm scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-sm bg-surface dark:bg-surface border border-border shadow-none flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-sm animate-spin m-2" />
            <DollarSign className="h-10 w-10 text-stone-900 dark:text-white" />
          </div>
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Earnings Hub</h2>
           <p className="text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest pl-[0.1em]">Reconciling Your Commissions</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardPage className="pb-24">
      <PageHeader
        eyebrow="Affiliate"
        title="My Earnings"
        subtitle="Track your commissions and payout history"
        actions={
          <>
            <DashboardActionLink href="#" onClick={(e) => e.preventDefault()}>
              <Download className="h-3.5 w-3.5" />
              Export
            </DashboardActionLink>
            <DashboardActionLink href="/dashboard/withdrawals" variant="primary">
              <Wallet className="h-3.5 w-3.5" />
              Withdraw
            </DashboardActionLink>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Pending" value={formatMoney(stats.pending, "USD")} icon={Clock} tone="warn" />
        <Tile label="Available" value={formatMoney(stats.available, "USD")} icon={CheckCircle} tone="success" />
        <Tile label="Total paid" value={formatMoney(stats.paid, "USD")} icon={ArrowUpRight} />
        <Tile label="Lifetime" value={formatMoney(stats.total, "USD")} icon={Zap} />
      </div>

      <DashboardPanel padding={false}>
           <div className="p-4 sm:p-6 border-b border-border flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5 sm:space-y-1 text-center md:text-left">
                 <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">Commission Log</h3>
                 <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-stone-400">Detailed referral income mapping</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 bg-surface/40 dark:bg-surface/40 p-1 rounded-xl border border-border shadow-sm overflow-x-auto no-scrollbar max-w-full">
                 {["All Time", "This Month", "Pending"].map((label, i) => (
                    <button key={i} className={cn(
                       "h-7 sm:h-8 px-3 sm:px-4 rounded-lg text-[8px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                       i === 0 ? "bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-900 dark:text-stone-600 dark:hover:text-white"
                    )}>{label}</button>
                 ))}
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-surface/20 dark:bg-surface/10">
                    <th className="py-3 sm:py-4 pl-4 sm:pl-6 pr-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Order Ref</th>
                    <th className="py-3 sm:py-4 px-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border text-center">Date</th>
                    <th className="py-3 sm:py-4 px-4 text-right text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border hidden sm:table-cell">Sale</th>
                    <th className="py-3 sm:py-4 px-4 text-right text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-500 border-b border-border">Earning</th>
                    <th className="py-3 sm:py-4 px-4 text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Status</th>
                    <th className="py-3 sm:py-4 pr-4 sm:pr-6 border-b border-border" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {earnings.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="py-16 sm:py-24 text-center space-y-4">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface dark:bg-surface-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-border shadow-sm text-stone-100 dark:text-stone-800 dark:text-text-secondary">
                             <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 text-stone-200 dark:text-stone-700" />
                          </div>
                          <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white tracking-tighter">No Commissions Yet</p>
                          <p className="text-[9px] sm:text-[11px] font-black text-stone-400 dark:text-text-muted uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed">Promote products and complete missions to start earning.</p>
                       </td>
                    </tr>
                  ) : (
                    earnings.map(e => (
                      <tr key={e.id} className="hover:bg-surface/60 dark:hover:bg-zinc-800/60 transition-colors group">
                        <td className="pl-4 sm:pl-6 pr-4 py-4 sm:py-5 font-bold text-[12px] sm:text-sm text-stone-900 dark:text-white">
                           #{e.orders?.order_number || String(e.id).slice(0, 8)}
                        </td>
                        <td className="px-4 py-4 sm:py-5 text-center">
                           <p className="text-[11px] sm:text-[12px] font-bold text-stone-900 dark:text-white">{new Date(e.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-4 sm:py-5 text-right hidden sm:table-cell">
                           <p className="text-[12px] sm:text-[13px] font-medium text-stone-400 tabular-nums">{formatMoney(Number(e.orders?.total_amount || 0), (e.orders?.currency as string) || "USD")}</p>
                        </td>
                        <td className="px-4 py-4 sm:py-5 text-right">
                           <p className="text-[14px] sm:text-base font-bold text-emerald-500 tabular-nums">{formatMoney(Number(e.commission_amount ?? e.amount ?? 0), "USD")}</p>
                        </td>
                        <td className="px-4 py-4 sm:py-5 text-center">
                           <span className={cn(
                             "px-2 py-1 rounded-lg text-[8px] sm:text-[9px] font-bold uppercase",
                             e.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                           )}>
                              {e.status || "PENDING"}
                           </span>
                        </td>
                        <td className="pr-4 sm:pr-6 py-4 sm:py-5 text-right">
                           <ArrowRight className="ml-auto h-4 w-4 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
           </div>
      </DashboardPanel>

      <DashboardPanel padding={false}>
           <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
              <div className="space-y-0.5 sm:space-y-1">
                 <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">Payout History</h3>
                 <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-stone-400">Past settlements</p>
              </div>
              <History className="h-5 w-5 sm:h-6 sm:w-6 text-stone-300" />
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-surface/20 dark:bg-surface/10">
                    <th className="py-3 sm:py-4 pl-4 sm:pl-6 pr-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Date</th>
                    <th className="py-3 sm:py-4 px-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Method</th>
                    <th className="py-3 sm:py-4 px-4 text-right text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Amount</th>
                    <th className="py-3 sm:py-4 px-4 text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-border">Status</th>
                    <th className="py-3 sm:py-4 pr-4 sm:pr-6 border-b border-border" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payouts.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="py-16 sm:py-20 text-center text-[10px] sm:text-[11px] font-black text-stone-400 dark:text-text-muted uppercase tracking-widest">
                          No payout history. <Link href="/dashboard/withdrawals" className="text-emerald-500 hover:text-emerald-600 underline ml-1 sm:ml-2">Request your first withdrawal</Link>
                       </td>
                    </tr>
                  ) : (
                    payouts.map(p => (
                      <tr key={p.id} className="hover:bg-surface/80 dark:hover:bg-zinc-800/80 transition-all duration-500 group">
                        <td className="pl-4 sm:pl-10 pr-4 sm:pr-6 py-6 sm:py-8 font-black text-base sm:text-lg text-stone-900 dark:text-white tracking-tighter">
                           {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 sm:px-6 py-6 sm:py-8">
                           <p className="text-[12px] sm:text-[14px] font-black text-stone-900 dark:text-white tracking-tight capitalize">{String(p.payout_method || "").replace(/_/g, " ")}</p>
                           <p className="text-[8px] sm:text-[9px] font-black text-stone-300 dark:text-stone-700 uppercase tracking-widest mt-1">Payment Hub</p>
                        </td>
                        <td className="px-4 sm:px-6 py-6 sm:py-8 text-right font-black text-xl sm:text-2xl text-emerald-500 tabular-nums tracking-tighter">
                           {formatMoney(Number(p.amount ?? 0), "USD")}
                        </td>
                        <td className="px-4 sm:px-6 py-6 sm:py-8 text-center">
                           <StatusPill status={p.status === "paid" ? "paid" : p.status === "failed" ? "failed" : "pending"} />
                        </td>
                        <td className="pr-4 sm:pr-10 py-6 sm:py-8 text-right">
                           <ArrowRight className="ml-auto h-4 w-4 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
           </div>
        </DashboardPanel>
    </DashboardPage>
  );
}

