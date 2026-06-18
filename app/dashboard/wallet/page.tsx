"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import {
   Wallet, ArrowLeft, Loader2, Store, Users, Sparkles,
   History, ShieldCheck, TrendingUp, CheckCircle, Clock,
   ArrowUpRight,
   NotepadText,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { getUserWalletData } from "@/lib/actions/wallet";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/admin";
import { Tile } from "@/components/ui/admin-tile";
import { DashboardPage, DashboardPanel, DashboardActionLink } from "@/components/dashboard/dashboard-page";

/* ── tx type meta ── */
const TX_META: Record<string, { icon: React.ElementType; label: string; color: string; bg: string; border: string }> = {
   vendor_earning: { icon: Store, label: "Product Sale", color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20" },
   affiliate_commission: { icon: Users, label: "Affiliate Commission", color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" },
   affiliate_earning: { icon: Users, label: "Affiliate Earning", color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" },
   community_earning: { icon: Sparkles, label: "Creator Bonus", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
};

const TABS = [
   { id: "all", label: "All" },
   { id: "vendor", label: "Sales" },
   { id: "affiliate", label: "Affiliate" },
   { id: "creator", label: "Creator" },
] as const;

type TabId = typeof TABS[number]["id"];

/* ── stat card ── */
function BalanceStat({ label, value }: { label: string; value: string }) {
   return (
      <div
         className="rounded-xl px-4 py-3.5 flex-1"
         style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
      >
         <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
            {label}
         </p>
         <p className="text-lg font-bold tabular-nums tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {value}
         </p>
      </div>
   );
}

/* ── source card ── */
function SourceCard({ icon: Icon, label, value, color, bg, border }: {
   icon: React.ElementType; label: string; value: string;
   color: string; bg: string; border: string;
}) {
   return (
      <div
         className="flex items-center gap-4 p-4 rounded-md"
         style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
         <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border", bg, color, border)}>
            <Icon className="h-4 w-4" />
         </div>
         <div className="min-w-0">
            <p className="text-base font-bold tabular-nums tracking-tight leading-none" style={{ color: "var(--color-text-primary)" }}>
               {value}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider mt-1 truncate" style={{ color: "var(--color-text-muted)" }}>
               {label}
            </p>
         </div>
      </div>
   );
}

/* ── page ── */
export default function WalletDashboardPage() {
   const { formatMoney } = useCurrency();
   const [loading, setLoading] = useState(true);
   const [data, setData] = useState<any>(null);
   const [activeTab, setActiveTab] = useState<TabId>("all");

   useEffect(() => {
      async function load() {
         const res = await getUserWalletData();
         if (res.success) setData(res);
         setLoading(false);
      }
      load();
   }, []);

   /* ── loading ── */
   if (loading) return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--color-accent)" }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
               Loading wallet…
            </p>
         </div>
      </div>
   );

   const wallet = data?.wallet || { available_balance: 0, pending_balance: 0, total_earned: 0 };
   const transactions: any[] = data?.transactions || [];
   const agg = data?.aggregation || { vendor: 0, affiliate: 0, creator: 0 };

   const filteredTx = transactions.filter(tx => {
      if (activeTab === "all") return true;
      if (activeTab === "vendor") return tx.type === "vendor_earning";
      if (activeTab === "affiliate") return tx.type === "affiliate_commission" || tx.type === "affiliate_earning";
      if (activeTab === "creator") return tx.type === "community_earning";
      return true;
   });

   return (
      <DashboardPage className="pb-24">
         <PageHeader
            eyebrow="Finance"
            title="My Wallet"
            subtitle="Earnings, transfers and history"
            actions={
               <DashboardActionLink href="/dashboard/withdrawals" variant="primary">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Withdraw
               </DashboardActionLink>
            }
         />

         <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Tile
               label="Available"
               value={formatMoney(wallet.available_balance, "USD")}
               icon={Wallet}
               tone="success"
            />
            <Tile
               label="Pending"
               value={formatMoney(wallet.pending_balance, "USD")}
               icon={Clock}
               tone="warn"
            />
            <Tile
               label="Total earned"
               value={formatMoney(wallet.total_earned, "USD")}
               icon={TrendingUp}
            />
         </div>

         <DashboardPanel padding={false} className="space-y-0">
            <div className="space-y-3 p-4 sm:p-5 border-b border-[var(--color-border)]">
               <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Earning sources
               </p>
               <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SourceCard
                     icon={Store} label="Product Sales" value={formatMoney(agg.vendor, "USD")}
                     color="text-sky-500" bg="bg-sky-500/10" border="border-sky-500/20"
                  />
                  <SourceCard
                     icon={Users} label="Affiliate Earnings" value={formatMoney(agg.affiliate, "USD")}
                     color="text-violet-500" bg="bg-violet-500/10" border="border-violet-500/20"
                  />
                  <SourceCard
                     icon={Sparkles} label="Creator Bonuses" value={formatMoney(agg.creator, "USD")}
                     color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20"
                  />
               </div>
            </div>

            <div className="flex items-start gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
               <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
               <div className="min-w-0 flex-1">
                  <p className="mb-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                     Funds held in escrow
                  </p>
                  <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                     Your earnings are secured until orders are confirmed delivered.{" "}
                     <Link href="/dashboard/orders" className="font-semibold underline underline-offset-2 text-[var(--color-accent)]">
                        View active orders
                     </Link>
                  </p>
               </div>
            </div>

            {/* Transaction history */}
               {/* Header + tabs */}
               <div
                  className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
               >
                  <div className="flex items-center gap-3">
                     <History className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
                     <div>
                        <h2 className="text-sm font-semibold leading-none" style={{ color: "var(--color-text-primary)" }}>
                           Transaction History
                        </h2>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                           {filteredTx.length} record{filteredTx.length !== 1 ? "s" : ""}
                        </p>
                     </div>
                  </div>

                  {/* Filter tabs */}
                  <div
                     className="flex items-center gap-0.5 p-1 rounded-xl self-start sm:self-auto"
                     style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
                  >
                     {TABS.map(tab => (
                        <button
                           key={tab.id}
                           onClick={() => setActiveTab(tab.id)}
                           className="px-3 h-7 rounded-lg text-xs font-semibold transition-all duration-150"
                           style={activeTab === tab.id
                              ? { background: "var(--color-text-primary)", color: "var(--color-bg)" }
                              : { color: "var(--color-text-muted)" }
                           }
                           onMouseEnter={e => { if (activeTab !== tab.id) (e.currentTarget.style.color = "var(--color-text-primary)"); }}
                           onMouseLeave={e => { if (activeTab !== tab.id) (e.currentTarget.style.color = "var(--color-text-muted)"); }}
                        >
                           {tab.label}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Table */}
               {filteredTx.length === 0 ? (
                  <div className="py-16 text-center">
                     <NotepadText className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--color-border)" }} />
                     <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
                        No transactions yet
                     </p>
                     <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>
                        Your activity will appear here
                     </p>
                  </div>
               ) : (
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                              {["Transaction", "Date", "Amount", "Status"].map((h, i) => (
                                 <th
                                    key={h}
                                    className={cn(
                                       "px-5 sm:px-6 py-3 text-[10px] font-semibold uppercase tracking-wider",
                                       i === 2 && "text-right",
                                       i === 3 && "text-center"
                                    )}
                                    style={{ color: "var(--color-text-muted)" }}
                                 >
                                    {h}
                                 </th>
                              ))}
                           </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                           {filteredTx.map((tx: any) => {
                              const meta = TX_META[tx.type] ?? { icon: Sparkles, label: tx.type.replace(/_/g, " "), color: "text-[var(--color-text-muted)]", bg: "bg-[var(--color-surface-secondary)]", border: "border-[var(--color-border)]" };
                              const Icon = meta.icon;
                              const isPos = tx.type.includes("earning") || tx.type.includes("commission");

                              return (
                                 <tr
                                    key={tx.id}
                                    className="transition-colors"
                                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-secondary)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                 >
                                    {/* Description */}
                                    <td className="px-5 sm:px-6 py-4">
                                       <div className="flex items-center gap-3">
                                          <div className={cn(
                                             "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
                                             meta.bg, meta.color, meta.border
                                          )}>
                                             <Icon className="h-3.5 w-3.5" />
                                          </div>
                                          <div className="min-w-0">
                                             <p className="text-sm font-semibold leading-none capitalize truncate max-w-[140px] sm:max-w-[200px]" style={{ color: "var(--color-text-primary)" }}>
                                                {meta.label}
                                             </p>
                                             {tx.reference && (
                                                <p className="text-[10px] mt-0.5 truncate max-w-[140px] sm:max-w-[180px]" style={{ color: "var(--color-text-muted)" }}>
                                                   {tx.reference}
                                                </p>
                                             )}
                                          </div>
                                       </div>
                                    </td>

                                    {/* Date */}
                                    <td className="px-5 sm:px-6 py-4 whitespace-nowrap">
                                       <span className="text-sm tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                                          {new Date(tx.created_at).toLocaleDateString(undefined, {
                                             month: "short", day: "numeric", year: "numeric",
                                          })}
                                       </span>
                                    </td>

                                    {/* Amount */}
                                    <td className="px-5 sm:px-6 py-4 text-right whitespace-nowrap">
                                       <span
                                          className="text-sm font-bold tabular-nums"
                                          style={{ color: isPos ? "var(--color-success)" : "var(--color-text-primary)" }}
                                       >
                                          {isPos ? "+" : ""}{formatMoney(tx.amount, tx.currency || "USD")}
                                       </span>
                                    </td>

                                    {/* Status */}
                                    <td className="px-5 sm:px-6 py-4">
                                       <div className="flex justify-center">
                                          <span className={cn(
                                             "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide",
                                             tx.status === "completed"
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                          )}>
                                             {tx.status === "completed"
                                                ? <CheckCircle className="h-3 w-3" />
                                                : <Clock className="h-3 w-3" />
                                             }
                                             {tx.status}
                                          </span>
                                       </div>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>

                     {/* Footer summary */}
                     <div
                        className="px-5 sm:px-6 py-3 flex items-center justify-between"
                        style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}
                     >
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                           Showing {filteredTx.length} transaction{filteredTx.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>
                           Total: {formatMoney(
                              filteredTx.filter((tx: any) => tx.type.includes("earning") || tx.type.includes("commission"))
                                 .reduce((s: number, tx: any) => s + Number(tx.amount ?? 0), 0),
                              "USD"
                           )}
                        </span>
                     </div>
                  </div>
               )}
         </DashboardPanel>
      </DashboardPage>
   );
}