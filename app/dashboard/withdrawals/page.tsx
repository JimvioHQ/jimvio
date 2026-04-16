"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, ArrowDownRight, CreditCard, Banknote, History, Clock, CheckCircle, Smartphone, ArrowLeft, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { id: "bank", label: "Bank Transfer", desc: "2–3 business days", icon: CreditCard },
  { id: "mobile_money", label: "Mobile Money", desc: "MTN MoMo, Airtel, etc.", icon: Smartphone },
  { id: "paypal", label: "PayPal", desc: "PayPal email", icon: Banknote },
] as const;

export default function AffiliateWithdrawalsPage() {
  const { formatMoney } = useCurrency();
  const router = useRouter();
  const [balance, setBalance] = useState({ available: 0, pending: 0, paid: 0 });
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [payoutMethod, setPayoutMethod] = useState("bank");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [minPayout, setMinPayout] = useState(50);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: feeRow } = await supabase.from("platform_settings").select("value").eq("key", "fees").maybeSingle();
      const rawMin = (feeRow?.value as { min_payout_rwf?: number } | null)?.min_payout_rwf;
      if (rawMin != null && Number.isFinite(Number(rawMin)) && Number(rawMin) > 0) {
        setMinPayout(Number(rawMin));
      }

      const affRes = await supabase.from("affiliates").select("id, available_balance, pending_earnings, paid_earnings, payout_method, payout_account").eq("user_id", user.id).maybeSingle();
      if (affRes.data) {
        const a = affRes.data as Record<string, unknown>;
        setAffiliateId(a.id as string);
        setBalance({
          available: Number(a.available_balance ?? 0),
          pending: Number(a.pending_earnings ?? 0),
          paid: Number(a.paid_earnings ?? 0),
        });
        setPayoutMethod(String(a.payout_method ?? "bank"));
        setPayoutAccount(String(a.payout_account ?? ""));
      } else {
        router.replace("/dashboard/activate/affiliate");
      }

      const { data: payoutsData } = await supabase.from("payouts").select("id, amount, status, payout_method, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setPayouts(payoutsData ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function savePayoutMethod() {
    if (!affiliateId) return;
    const supabase = createClient();
    const { error } = await supabase.from("affiliates").update({
      payout_method: payoutMethod,
      payout_account: payoutAccount.trim() || null,
    }).eq("id", affiliateId);
    if (error) toast.error(error.message);
    else toast.success("Payout method saved.");
  }

  async function requestPayout() {
    const amount = parseFloat(requestAmount);
    if (amount < minPayout) {
      toast.error(`Minimum withdrawal is ${formatMoney(minPayout, "USD")}.`);
      return;
    }
    if (amount > balance.available) {
      toast.error("Amount exceeds available balance.");
      return;
    }
    if (!payoutAccount.trim()) {
      toast.error("Please add and save your payout account first.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }
    const { error } = await supabase.from("payouts").insert({
      user_id: user.id,
      type: "affiliate_withdrawal",
      amount,
      status: "pending",
      payout_method: payoutMethod,
      payout_account: payoutAccount.trim(),
    });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    toast.success("Withdrawal requested successfully.");
    setRequestAmount("");
    setSubmitting(false);
    router.refresh();
    const { data: payoutsData } = await supabase.from("payouts").select("id, amount, status, payout_method, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    setPayouts(payoutsData ?? []);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "var(--color-bg)" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest pl-1">Syncing Balance...</p>
      </div>
    );
  }

  const canRequest = balance.available >= minPayout && payoutAccount.trim();

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden"
      style={{
        background: "var(--color-bg)",
      }}
    >
      <div className="max-w-4xl mx-auto space-y-8 px-6 pt-10 relative z-10">
        
        {/* Header - Simpler */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <Button asChild variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-xl bg-surface dark:bg-zinc-800 border border-border shadow-sm hover:bg-surface dark:hover:bg-zinc-700 active:scale-95 transition-all text-stone-500 dark:text-stone-400">
                 <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
               </Button>
               <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">Withdraw Funds</h1>
                  <p className="text-[11px] font-bold text-stone-400 dark:text-stone-500 capitalize">Manage your earnings and payouts</p>
               </div>
            </div>
            
            <div className="flex items-center gap-3 bg-surface dark:bg-zinc-800 p-3 rounded-full border border-border shadow-sm px-5">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Secure Processing</span>
            </div>
         </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Withdrawal Panel */}
          <GlassCard className="lg:col-span-2 rounded-[32px] border-border bg-surface/60 dark:bg-zinc-800/40 shadow-sm overflow-hidden flex flex-col">
             <div className="p-8 sm:p-10 space-y-10 flex-1">
                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                       <Wallet className="h-4 w-4 text-orange-400" />
                       <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 capitalize leading-none">Available Balance</span>
                   </div>
                   <h2 className="text-5xl font-black text-stone-900 dark:text-white tracking-tight leading-none tabular-nums">{formatMoney(balance.available, "USD")}</h2>
                   <div className="flex flex-wrap items-center gap-3 pt-2">
                     <GlassPill color="orange" className="font-bold py-1.5 px-4 text-[9px] border-none shadow-none bg-orange-500/10 text-orange-600 dark:text-orange-400 uppercase tracking-wider"><Clock className="h-3 w-3 mr-1.5" /> {formatMoney(balance.pending, "USD")} Pending</GlassPill>
                     <GlassPill color="emerald" className="font-bold py-1.5 px-4 text-[9px] border-none shadow-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider"><CheckCircle className="h-3 w-3 mr-1.5" /> {formatMoney(balance.paid, "USD")} Paid</GlassPill>
                   </div>
                </div>

                <div className="p-8 rounded-[24px] bg-stone-900 dark:bg-zinc-950 text-white space-y-6 shadow-xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2" />
                   
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] block pl-1">Withdrawal Amount (USD)</label>
                      <Input 
                        type="number" 
                        min={minPayout} 
                        step="0.01" 
                        value={requestAmount} 
                        onChange={e => setRequestAmount(e.target.value)} 
                        placeholder={`Min: $${minPayout}`} 
                        className="rounded-xl h-14 bg-white dark:bg-zinc-900/5 border-white/10 font-bold text-xl shadow-inner text-white focus:ring-orange-500 px-6 transition-all focus:bg-white dark:bg-zinc-900/10" 
                      />
                   </div>
                   <Button 
                     className="w-full h-14 rounded-xl bg-orange-500 text-white shadow-[0_8px_24px_rgba(249,115,22,0.3)] hover:bg-orange-600 active:scale-95 transition-all text-sm font-bold capitalize border-none" 
                     disabled={!canRequest || submitting} 
                     onClick={requestPayout}
                   >
                     {submitting ? "Processing..." : "Confirm Withdrawal"}
                   </Button>
                   <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] text-center">
                     Min threshold: {formatMoney(minPayout, "USD")}
                   </p>
                </div>
             </div>
          </GlassCard>

          {/* Payout Method Sidebar */}
          <GlassCard className="rounded-[32px] border-border bg-surface/60 dark:bg-zinc-800/40 shadow-sm flex flex-col overflow-hidden">
             <div className="p-8 border-b border-border bg-surface/40 dark:bg-zinc-900/40">
                <h3 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">Payout Method</h3>
                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 capitalize mt-0.5">Where you'll receive your funds</p>
             </div>
             <div className="p-8 space-y-4 flex-1">
               {PAYMENT_METHODS.map((m) => {
                 const Icon = m.icon;
                 const active = payoutMethod === m.id;
                 return (
                   <button
                     key={m.id}
                     type="button"
                     onClick={() => setPayoutMethod(m.id)}
                     className={cn(
                       "group w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                       active 
                         ? "border-orange-500/20 bg-surface dark:bg-zinc-800 shadow-sm" 
                         : "border-border bg-surface/40 dark:bg-zinc-900/40 hover:border-orange-500/10 hover:bg-surface dark:hover:bg-zinc-800"
                     )}
                   >
                     <div className={cn(
                        "h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors shadow-sm",
                        active ? "bg-orange-500/10 border-orange-500/10 text-orange-500" : "bg-surface dark:bg-zinc-800 border-border text-stone-300 dark:text-stone-700 group-hover:text-stone-400 dark:group-hover:text-stone-600"
                     )}>
                       <Icon className="h-5 w-5" />
                     </div>
                     <div className="text-left min-w-0">
                       <p className="text-[13px] font-bold text-stone-900 dark:text-white tracking-tight">{m.label}</p>
                       <p className="text-[9px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest truncate">{m.desc}</p>
                     </div>
                   </button>
                 );
               })}
               
               <div className="bg-surface dark:bg-zinc-900/40 p-6 rounded-2xl border border-border shadow-sm mt-4 space-y-4">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 block pl-1">
                   {payoutMethod === "bank" ? "Account Details" : payoutMethod === "paypal" ? "PayPal Email" : "Phone Number"}
                 </label>
                 <Input 
                    value={payoutAccount} 
                    onChange={e => setPayoutAccount(e.target.value)} 
                    placeholder={payoutMethod === "paypal" ? "your@email.com" : "+250 ..."} 
                    className="rounded-xl h-11 bg-surface dark:bg-zinc-800 border-border text-sm font-bold shadow-none focus:ring-0 text-stone-900 dark:text-white" 
                 />
                 <Button 
                    variant="default"
                    size="sm" 
                    className="h-10 rounded-xl w-full bg-stone-900 dark:bg-white dark:bg-zinc-900 text-white dark:text-stone-900 dark:text-white text-[10px] font-bold uppercase tracking-widest shadow-md hover:bg-black dark:hover:bg-stone-200 transition-all active:scale-95 border-none" 
                    onClick={savePayoutMethod}
                 >
                    Save Method
                 </Button>
               </div>
             </div>
             <div className="p-6 bg-surface/50 dark:bg-zinc-900/20 border-t border-border text-center">
                <p className="text-[9px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                   Processing time: 2–3 business days
                </p>
             </div>
          </GlassCard>
        </div>

        {/* History Registry - Simpler padding */}
        <GlassCard className="rounded-[32px] border-border bg-surface/60 dark:bg-zinc-800/40 shadow-sm overflow-hidden">
           <div className="p-8 border-b border-border bg-surface/40 dark:bg-zinc-900/40 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface dark:bg-zinc-800 border border-border shadow-sm text-stone-300 dark:text-stone-700">
                 <History className="h-4 w-4" />
              </div>
              <div>
                 <h3 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">Withdrawal History</h3>
                 <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 capitalize mt-0.5">Your payout history</p>
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-surface/40 dark:bg-zinc-900/20">
                       <th className="px-8 py-5 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest border-b border-border">Date</th>
                       <th className="px-8 py-5 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest border-b border-border">Method</th>
                       <th className="px-8 py-5 text-right text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest border-b border-border">Amount</th>
                       <th className="px-8 py-5 text-center text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest border-b border-border">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border/60">
                    {payouts.length === 0 ? (
                      <tr>
                         <td colSpan={4} className="py-20 text-center">
                            <p className="text-[11px] font-bold text-stone-300 dark:text-stone-700 uppercase tracking-widest">No past withdrawals found</p>
                         </td>
                      </tr>
                    ) : payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-surface/60 dark:hover:bg-zinc-800/40 transition-all duration-300 group">
                         <td className="px-8 py-6 text-sm font-bold text-stone-400 dark:text-stone-500 tabular-nums">
                            {new Date(p.created_at).toLocaleDateString()}
                         </td>
                         <td className="px-8 py-6">
                            <span className="capitalize font-bold text-sm text-stone-900 dark:text-white tracking-tight">{String(p.payout_method || "—").replace(/_/g, " ")}</span>
                         </td>
                         <td className="px-8 py-6 text-right">
                            <span className="font-bold text-base text-stone-900 dark:text-white tabular-nums tracking-tight">{formatMoney(Number(p.amount ?? 0), "USD")}</span>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex justify-center">
                               <GlassPill color={p.status === "paid" ? "emerald" : p.status === "failed" ? "rose" : "orange"} className="font-bold text-[9px] px-4 py-1.5 uppercase tracking-widest border-none shadow-none">
                                  {p.status || "pending"}
                               </GlassPill>
                            </div>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
