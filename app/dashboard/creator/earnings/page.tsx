"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DollarSign, Eye, ShoppingCart, Wallet, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill } from "@/components/ui/glass";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";

export default function CreatorEarningsPage() {
  const { formatMoney } = useCurrency();
  const router = useRouter();
  const [influencer, setInfluencer] = useState<Record<string, unknown> | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: inf } = await supabase.from("influencers").select("*").eq("user_id", user.id).maybeSingle();
      if (!inf) {
        router.replace("/dashboard/activate/creator");
        setLoading(false);
        return;
      }
      setInfluencer(inf as Record<string, unknown>);
      const { data: payoutsData } = await supabase.from("payouts").select("id, amount, status, payout_method, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      setPayouts(payoutsData ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  const totalEarnings = Number(influencer?.total_earnings ?? 0);
  const available = Number(influencer?.available_balance ?? 0);
  const pending = 0;
  const paid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0);

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-12"
      style={{
         background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.07) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.07) 0%, transparent 55%), #f0ede8",
      }}
    >
      <div className="max-w-[1400px] mx-auto space-y-6 px-4 sm:px-6 pt-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-3">
             <div className="p-2 rounded-none bg-white dark:bg-surface/60 border border-white/80 shadow-none shrink-0">
               <DollarSign className="h-6 w-6 text-emerald-500" />
             </div>
             Creator Earnings
          </h1>
          <p className="text-[12px] font-semibold text-stone-500 mt-1 uppercase tracking-widest pl-14">Earnings from product sales, views, and payouts</p>
        </div>
        <Button asChild className="h-11 px-6 rounded-none font-bold text-[11px] uppercase tracking-widest bg-stone-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] active:scale-95 transition-all">
          <Link href="/dashboard/withdrawals"><Wallet className="h-4 w-4 mr-2 text-emerald-400" /> Request Payout</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5 flex flex-col justify-center">
           <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 flex items-center gap-1.5"><ShoppingCart className="h-4 w-4 text-emerald-500" /> Earnings from sales</p>
           <p className="text-[24px] xl:text-[28px] font-black text-stone-900 dark:text-white tabular-nums leading-none tracking-tight break-all">{formatMoney(totalEarnings, "RWF")}</p>
        </GlassCard>
        <GlassCard className="p-5 flex flex-col justify-center">
           <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 flex items-center gap-1.5"><Eye className="h-4 w-4 text-blue-500" /> Earnings from views</p>
           <p className="text-[24px] xl:text-[28px] font-black text-stone-900 dark:text-white tabular-nums leading-none tracking-tight break-all">{formatMoney(0, "RWF")}</p>
        </GlassCard>
        <GlassCard className="p-5 flex flex-col justify-center">
           <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 flex items-center gap-1.5"><DollarSign className="h-4 w-4 text-orange-500" /> Pending / Available</p>
           <p className="text-[24px] xl:text-[28px] font-black text-stone-900 dark:text-white tabular-nums leading-none tracking-tight break-all">{formatMoney(available, "RWF")}</p>
        </GlassCard>
        <GlassCard className="p-5 flex flex-col justify-center">
           <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 flex items-center gap-1.5"><ArrowRight className="h-4 w-4 text-purple-500" /> Paid out</p>
           <p className="text-[24px] xl:text-[28px] font-black text-stone-900 dark:text-white tabular-nums leading-none tracking-tight break-all">{formatMoney(paid, "RWF")}</p>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden bg-white dark:bg-surface/40 p-0">
        <div className="border-b border-stone-200/50 bg-white dark:bg-surface/50 py-4 px-6 flex flex-col">
          <h3 className="text-[14px] font-bold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-500" />
            Payout history
          </h3>
          <p className="text-[12px] font-semibold text-stone-500 uppercase tracking-widest mt-1">Withdrawal requests and status.</p>
        </div>
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm text-left">
              <thead>
                <tr className="border-b border-stone-200/50 bg-stone-50/50">
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-stone-500">Date</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-stone-500">Method</th>
                  <th className="py-4 px-6 text-right text-[10px] font-bold uppercase tracking-widest text-stone-500">Amount</th>
                  <th className="py-4 px-6 text-center text-[10px] font-bold uppercase tracking-widest text-stone-500 w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/50">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-[12px] font-semibold text-stone-500 uppercase tracking-widest">
                       <div>No payouts yet.</div>
                       <Link href="/dashboard/withdrawals" className="text-emerald-500 hover:underline mt-1 inline-block">Request a payout</Link> when you have available balance.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-white dark:bg-surface/60 transition-colors group">
                      <td className="py-4 px-6 text-[13px] font-bold text-stone-900 dark:text-white">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-4 px-6 text-[13px] font-bold text-stone-600 capitalize">{String(p.payout_method || "").replace(/_/g, " ")}</td>
                      <td className="py-4 px-6 text-right font-black text-[14px] text-stone-900 dark:text-white tabular-nums">{formatMoney(Number(p.amount ?? 0), "RWF")}</td>
                      <td className="py-4 px-6 text-center">
                        <GlassPill color={p.status === "paid" ? "emerald" : p.status === "failed" ? "rose" : "orange"} className="text-[9px]">
                           {p.status || "pending"}
                        </GlassPill>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GlassCard>
      </div>
    </div>
  );
}

