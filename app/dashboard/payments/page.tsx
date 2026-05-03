// "use client";
// export const dynamic = "force-dynamic";

// import React, { useEffect, useState } from "react";
// import {
//   DollarSign,
//   ArrowDownRight,
//   Clock,
//   CheckCircle,
//   Wallet,
//   ArrowRight,
//   Loader2,
//   Building,
//   CreditCard,
//   History,
//   TrendingUp,
//   Target,
//   ArrowUpRight,
//   ShieldCheck,
//   Smartphone,
//   CheckCircle2,
//   Activity,
//   Zap,
// } from "lucide-react";
// import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { useCurrency } from "@/context/CurrencyContext";
// import { createClient } from "@/lib/supabase/client";
// import { normalizeVendorPayoutMethod } from "@/lib/payout-method";
// import { cn } from "@/lib/utils";

// export default function PaymentsPage() {
//   const { formatMoney } = useCurrency();
//   const [wallet, setWallet]     = useState<Record<string, unknown> | null>(null);
//   const [payouts, setPayouts]   = useState<Record<string, unknown>[]>([]);
//   const [loading, setLoading]   = useState(true);
//   const [withdrawAmount, setWithdrawAmount] = useState("");
//   const [withdrawing, setWithdrawing]       = useState(false);
//   const [withdrawSuccess, setWithdrawSuccess] = useState(false);
//   const [vendorPayoutHint, setVendorPayoutHint] = useState<{ method: string; account: string } | null>(null);
//   const [syncOrderId, setSyncOrderId] = useState("");
//   const [syncingOrder, setSyncingOrder] = useState(false);
//   const [syncOrderMsg, setSyncOrderMsg] = useState<string | null>(null);

//   useEffect(() => {
//     async function load() {
//       const supabase = createClient();
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return;

//       const [walletRes, payoutsRes, vendorRes] = await Promise.all([
//         supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
//         supabase.from("payouts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
//         supabase.from("vendors").select("payout_method, payout_account").eq("user_id", user.id).maybeSingle(),
//       ]);
//       setWallet(walletRes.data ?? null);
//       setPayouts(payoutsRes.data ?? []);
//       if (vendorRes.data) {
//         setVendorPayoutHint({
//           method: String(vendorRes.data.payout_method ?? ""),
//           account: String(vendorRes.data.payout_account ?? ""),
//         });
//       } else {
//         setVendorPayoutHint(null);
//       }
//       setLoading(false);
//     }
//     load();
//   }, []);

//   async function requestWithdrawal() {
//     if (!wallet || !withdrawAmount) return;
//     const amount = parseFloat(withdrawAmount);
//     if (amount <= 0 || amount > Number(wallet.available_balance ?? 0)) return;

//     setWithdrawing(true);
//     const supabase = createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return;

//     const { data: vendor } = await supabase.from("vendors").select("payout_method, payout_account").eq("user_id", user.id).single();

//     const cur = String((wallet as { currency?: string } | null)?.currency ?? "USD");
//     await supabase.from("payouts").insert({
//       user_id:       user.id,
//       type:          "vendor_withdrawal",
//       amount,
//       currency:      cur,
//       status:        "pending",
//       payout_method: normalizeVendorPayoutMethod(vendor?.payout_method as string | null | undefined),
//       payout_account:vendor?.payout_account ?? "",
//     });

//     await supabase.from("wallets").update({
//       available_balance: Number(wallet.available_balance ?? 0) - amount,
//       pending_balance:   Number(wallet.pending_balance ?? 0) + amount,
//     }).eq("user_id", user.id);

//     setWallet(prev => prev ? {
//       ...prev,
//       available_balance: Number(prev.available_balance ?? 0) - amount,
//       pending_balance:   Number(prev.pending_balance ?? 0) + amount,
//     } : prev);
//     setWithdrawAmount("");
//     setWithdrawSuccess(true);
//     setWithdrawing(false);
//     setTimeout(() => setWithdrawSuccess(false), 3000);
//   }

//   async function syncCreditsForOrder() {
//     const id = syncOrderId.trim();
//     if (!id) return;
//     setSyncingOrder(true);
//     setSyncOrderMsg(null);
//     try {
//       const res = await fetch("/api/vendor/wallet/sync-order", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ orderId: id }),
//       });
//       const data = (await res.json()) as { error?: string; ok?: boolean };
//       if (!res.ok) throw new Error(data.error || "Request failed");
//       setSyncOrderMsg("Earnings synced successfully.");
//       setSyncOrderId("");
//       const supabase = createClient();
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();
//       if (user) {
//         const { data: w } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
//         setWallet(w);
//       }
//     } catch (e) {
//       setSyncOrderMsg(e instanceof Error ? e.message : "Failed");
//     } finally {
//       setSyncingOrder(false);
//     }
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "#f0ede8" }}>
//         <div className="relative">
//           <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-sm scale-150 animate-pulse" />
//           <div className="relative w-24 h-24 rounded-sm bg-white dark:bg-surface border border-white shadow-none flex items-center justify-center overflow-hidden">
//             <div className="absolute inset-0 border-2 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-sm animate-spin m-2" />
//             <Wallet className="h-10 w-10 text-stone-900 dark:text-white" />
//           </div>
//         </div>
//         <div className="text-center space-y-3">
//            <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Liquid Vault Activation</h2>
//            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Reconciling Global Settlement Streams</p>
//         </div>
//       </div>
//     );
//   }

//   const available = Number(wallet?.available_balance ?? 0);
//   const pending   = Number(wallet?.pending_balance ?? 0);
//   const earned    = Number(wallet?.total_earned ?? 0);
//   const paid      = Number(wallet?.total_paid ?? 0);
//   const walletCurrency = String((wallet as { currency?: string } | null)?.currency ?? "USD");

//   return (
//     <div
//       className="min-h-screen animate-in fade-in duration-700 pb-24 relative overflow-hidden"
//       style={{
//          background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(16,185,129,0.05) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(99,102,241,0.05) 0%, transparent 55%), #f0ede8",
//       }}
//     >
//       <GlassAmbientGlow color="emerald" position="top-right" />
//       <GlassAmbientGlow color="indigo" position="bottom-left" />

//       <div className="max-w-[1440px] mx-auto space-y-12 px-8 pt-12 relative z-10">

//         {/* Header Protocol */}
//         <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
//            <div className="space-y-2">
//               <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
//                  <div className="p-2.5 rounded-sm bg-white dark:bg-surface border border-white shadow-none shrink-0">
//                     <Activity className="h-8 w-8 text-emerald-500" />
//                  </div>
//                  Liquid Logic Vault
//               </h1>
//               <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
//                  Global Settlement Registry & Real-time Liquidity Matrix
//               </p>
//            </div>
//            <div className="flex items-center gap-3">
//               <GlassPill color="emerald" className="h-10 px-6 font-black text-[10px] border-white shadow-none">SETTLEMENTS_LIVE</GlassPill>
//               <GlassPill color="sky" className="h-10 px-6 font-black text-[10px] border-white shadow-none">PROTOCOL_SECURE</GlassPill>
//            </div>
//         </div>

//         {/* Global Asset Matrix */}
//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
//            <div className="lg:col-span-12">
//               <GlassCard className="relative p-0 overflow-hidden border-white bg-white dark:bg-surface/70 shadow-none rounded-sm">
//                  <div className="grid grid-cols-1 lg:grid-cols-3">
//                     <div className="lg:col-span-2 p-12 border-r border-stone-100 dark:border-border">
//                        <div className="flex items-center gap-6 mb-12">
//                           <div className="w-16 h-16 rounded-sm bg-stone-900 flex items-center justify-center text-white shadow-none group-hover:scale-110 transition-transform">
//                              <Wallet className="h-7 w-7" />
//                           </div>
//                           <div>
//                              <p className="text-[11px] font-black text-stone-400 uppercase tracking-[0.4em]">Available Liquidity</p>
//                              <p className="text-[12px] font-black text-emerald-500 uppercase tracking-widest mt-1">Multi-Currency Node Operational</p>
//                           </div>
//                        </div>

//                        <div className="relative">
//                           <h2 className="text-7xl font-black text-stone-900 dark:text-white tracking-tighter flex items-baseline gap-4 tabular-nums">
//                              {formatMoney(available, walletCurrency)}
//                              <span className="text-xl font-black text-stone-300 uppercase tracking-[0.4em]">{walletCurrency}</span>
//                           </h2>
//                        </div>

//                        <div className="mt-16 flex flex-wrap gap-12 pt-12 border-t border-stone-100 dark:border-border">
//                           <div className="space-y-2">
//                              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Pending Sync</p>
//                              <p className="text-3xl font-black text-amber-500 tracking-tighter tabular-nums">{formatMoney(pending, walletCurrency)}</p>
//                           </div>
//                           <div className="space-y-2">
//                              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Total Settled</p>
//                              <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter tabular-nums">{formatMoney(earned, walletCurrency)}</p>
//                           </div>
//                           <div className="space-y-2">
//                              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Settlement Outflow</p>
//                              <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter tabular-nums">{formatMoney(paid, walletCurrency)}</p>
//                           </div>
//                        </div>
//                     </div>

//                     <div className="p-12 bg-stone-50/30 flex flex-col justify-between items-start">
//                        <div className="space-y-6">
//                           <div className="w-14 h-14 rounded-sm bg-white dark:bg-surface border border-white shadow-none flex items-center justify-center text-emerald-500">
//                              <ShieldCheck className="h-7 w-7" />
//                           </div>
//                           <p className="text-[12px] font-bold text-stone-500 leading-relaxed uppercase tracking-wider">
//                              Real-time settlement enabled. All assets are audited via Jimvio Global Ledger protocols for maximum security and transparency.
//                           </p>
//                        </div>

//                        <button 
//                           onClick={() => document.getElementById('settlement-trigger')?.scrollIntoView({ behavior: 'smooth' })}
//                           className="group/btn flex items-center justify-between w-full h-20 px-10 rounded-sm bg-stone-900 text-white shadow-none shadow-stone-900/40 hover:scale-[1.02] transition-all border-none"
//                        >
//                           <span className="text-[12px] font-black uppercase tracking-[0.3em]">Execute Outflow</span>
//                           <ArrowUpRight className="h-6 w-6 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
//                        </button>
//                     </div>
//                  </div>
//               </GlassCard>
//            </div>
//         </div>

//         {/* Operational Nodes */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-12 border-t border-stone-100 dark:border-border" id="settlement-trigger">

//            {/* Outflow Protocol Node */}
//            <div className="space-y-8">
//               <div className="space-y-1">
//                  <h3 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
//                     <div className="p-2.5 rounded-sm bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none">
//                        <ArrowDownRight className="h-6 w-6" />
//                     </div>
//                     Request Settlement
//                  </h3>
//                  <p className="text-[11px] font-black text-stone-400 uppercase tracking-[0.4em] pl-16">Global Liquidity Distribution Protocol</p>
//               </div>

//               <GlassCard className="p-10 space-y-10 rounded-sm bg-white dark:bg-surface/60 border-white shadow-none">
//                  {withdrawSuccess && (
//                     <div className="flex items-center gap-6 p-6 rounded-sm bg-emerald-50 border border-emerald-100 text-emerald-600 animate-in slide-in-from-top-8 duration-700">
//                        <CheckCircle2 className="h-8 w-8 shrink-0" />
//                        <div className="space-y-1">
//                           <p className="text-[14px] font-black uppercase tracking-widest">Protocol Accepted</p>
//                           <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest leading-relaxed">System processing Window: 24—48 Hours</p>
//                        </div>
//                     </div>
//                  )}

//                  <div className="space-y-6">
//                     <Label className="text-[11px] font-black uppercase tracking-[0.4em] text-stone-400 pl-2">Allocation Quant ({walletCurrency})</Label>
//                     <div className="relative group">
//                        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-stone-300 font-black text-sm z-10 uppercase tracking-widest">{walletCurrency}</div>
//                        <Input
//                          type="number"
//                          placeholder={`AVAILABLE: ${available}`}
//                          min="1000"
//                          max={available}
//                          value={withdrawAmount}
//                          onChange={e => setWithdrawAmount(e.target.value)}
//                          className="h-20 rounded-sm bg-white dark:bg-surface border-stone-200 dark:border-border focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-400 text-4xl font-black tracking-tighter px-10 transition-all shadow-none tabular-nums placeholder:text-stone-100"
//                        />
//                     </div>

//                     <div className="flex items-center justify-between px-2">
//                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">MIN_PROTOCOL: 1,000 {walletCurrency}</p>
//                        <button 
//                           onClick={() => setWithdrawAmount(String(available))}
//                           className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors"
//                        >
//                           MAX_ALLOCATION
//                        </button>
//                     </div>
//                  </div>

//                  <Button
//                     onClick={requestWithdrawal}
//                     disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > available}
//                     className="h-20 w-full rounded-sm bg-stone-900 text-white font-black text-[12px] uppercase tracking-[0.4em] shadow-none shadow-stone-900/40 active:scale-95 transition-all hover:bg-black border-none"
//                  >
//                     {withdrawing ? (
//                        <Loader2 className="h-5 w-5 animate-spin" />
//                     ) : (
//                        <div className="flex items-center gap-3">
//                           <Zap className="h-4 w-4 text-orange-400" /> Execute Flux Payout
//                        </div>
//                     )}
//                  </Button>

//                  <div className="p-8 rounded-sm bg-stone-50/50 border border-stone-100 dark:border-border flex items-start gap-4">
//                     <div className="p-2 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border text-stone-300 shadow-none mt-1">
//                        <Clock className="h-4 w-4" />
//                     </div>
//                     <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest leading-[1.8] flex-1">
//                        Settlements are processed via supervised financial nodes. Current network latency: <span className="text-stone-900 dark:text-white">Optimal</span>. Delivery: <span className="text-stone-900 dark:text-white">48H Maximum</span>.
//                     </p>
//                  </div>
//               </GlassCard>
//            </div>

//            {/* Sync Node Cluster */}
//            <div className="space-y-8">
//               <div className="space-y-1">
//                  <h3 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
//                     <div className="p-2.5 rounded-sm bg-sky-50 text-sky-600 border border-sky-100 shadow-none">
//                        <Target className="h-6 w-6" />
//                     </div>
//                     Synchronization Hub
//                  </h3>
//                  <p className="text-[11px] font-black text-stone-400 uppercase tracking-[0.4em] pl-16">Manual Reconciliation & Signal Sync</p>
//               </div>

//               <GlassCard className="p-10 space-y-10 rounded-sm bg-white dark:bg-surface/40 border-white/80 h-[calc(100%-80px)] flex flex-col justify-between shadow-none">
//                  <div className="space-y-8">
//                     <div className="flex items-center gap-4">
//                        <Activity className="h-6 w-6 text-sky-500" />
//                        <p className="text-[12px] font-black text-stone-500 leading-relaxed uppercase tracking-widest flex-1">
//                           Manual reconciliation for pending order credits. Input the Order Registry UID to force signal alignment.
//                        </p>
//                     </div>

//                     <div className="space-y-6">
//                        <Label className="text-[11px] font-black uppercase tracking-[0.4em] text-stone-400 pl-2">Registry UID</Label>
//                        <Input
//                         value={syncOrderId}
//                         onChange={(e) => setSyncOrderId(e.target.value)}
//                         placeholder="PROTOCOL_HEX_IDENTIFIER"
//                         className="h-16 rounded-sm bg-white dark:bg-surface border-stone-100 dark:border-border focus:ring-8 focus:ring-sky-500/5 focus:border-sky-400 text-base font-black tracking-[0.2em] px-8 transition-all shadow-none font-mono placeholder:text-stone-100"
//                        />
//                        {syncOrderMsg && (
//                           <div className={cn("p-4 rounded-sm text-[10px] font-black uppercase tracking-widest animate-in fade-in flex items-center gap-3", syncOrderMsg.includes('failed') ? "bg-rose-50 text-rose-500 border border-rose-100" : "bg-sky-50 text-sky-600 border border-sky-100")}>
//                              <div className={cn("w-2 h-2 rounded-sm", syncOrderMsg.includes('failed') ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]")} />
//                              {syncOrderMsg}
//                           </div>
//                        )}
//                     </div>
//                  </div>

//                  <Button 
//                     type="button" 
//                     variant="ghost" 
//                     disabled={syncingOrder || !syncOrderId}
//                     onClick={syncCreditsForOrder}
//                     className="h-20 w-full rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border text-stone-900 dark:text-white font-black text-[12px] uppercase tracking-[0.4em] shadow-none active:scale-95 transition-all hover:bg-stone-50 dark:bg-surface/50"
//                  >
//                     {syncingOrder ? <Loader2 className="h-5 w-5 animate-spin text-sky-500" /> : "Sync Node Protocol"}
//                  </Button>
//               </GlassCard>
//            </div>
//         </div>

//         {/* Global Registry Ledger */}
//         <div className="space-y-8 pt-12 border-t border-stone-100 dark:border-border">
//            <div className="space-y-1">
//               <h3 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
//                  <div className="p-2.5 rounded-sm bg-stone-900 text-white shadow-none">
//                     <History className="h-6 w-6" />
//                  </div>
//                  Settlement Ledger
//               </h3>
//               <p className="text-[11px] font-black text-stone-400 uppercase tracking-[0.4em] pl-16">Immutable Financial Outflow Records</p>
//            </div>

//            <GlassCard className="p-0 overflow-hidden border-white bg-white dark:bg-surface/40 shadow-none rounded-sm">
//               <div className="overflow-x-auto">
//                  {payouts.length === 0 ? (
//                     <div className="p-32 text-center space-y-8 animate-in fade-in duration-700">
//                        <div className="w-24 h-24 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border flex items-center justify-center mx-auto shadow-none shadow-stone-900/5">
//                           <DollarSign className="h-10 w-10 text-stone-100" />
//                        </div>
//                        <div className="space-y-3">
//                           <p className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter">Zero Density Registry</p>
//                           <p className="text-[11px] font-black text-stone-300 uppercase tracking-widest leading-relaxed max-w-[320px] mx-auto">
//                              System requires a successful settlement protocol to initialize the global history ledger.
//                           </p>
//                        </div>
//                     </div>
//                  ) : (
//                     <table className="w-full text-left">
//                        <thead>
//                           <tr className="bg-stone-50/40">
//                              <th className="px-12 py-10 text-[11px] font-black text-stone-400 uppercase tracking-[0.3em] border-b border-stone-100 dark:border-border">Allocation</th>
//                              <th className="px-10 py-10 text-[11px] font-black text-stone-400 uppercase tracking-[0.3em] border-b border-stone-100 dark:border-border text-center">Protocol</th>
//                              <th className="px-10 py-10 text-[11px] font-black text-stone-400 uppercase tracking-[0.3em] border-b border-stone-100 dark:border-border">Target Node</th>
//                              <th className="px-10 py-10 text-[11px] font-black text-stone-400 uppercase tracking-[0.3em] border-b border-stone-100 dark:border-border text-center">Integrity</th>
//                              <th className="px-12 py-10 text-right text-[11px] font-black text-stone-400 uppercase tracking-[0.3em] border-b border-stone-100 dark:border-border">Timestamp</th>
//                           </tr>
//                        </thead>
//                        <tbody className="divide-y divide-stone-100">
//                           {payouts.map((p) => (
//                              <tr key={p.id as string} className="group hover:bg-white dark:bg-surface/80 transition-all duration-500">
//                                 <td className="px-12 py-12">
//                                    <div className="flex items-center gap-6">
//                                       <div className={cn("w-12 h-12 rounded-sm flex items-center justify-center shadow-none transition-transform group-hover:scale-110 duration-500", p.status === 'paid' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-stone-100 text-stone-400")}>
//                                          <DollarSign className="h-5 w-5" />
//                                       </div>
//                                       <span className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter tabular-nums">
//                                          {formatMoney(Number(p.amount), (p.currency as string) || walletCurrency)}
//                                       </span>
//                                    </div>
//                                 </td>
//                                 <td className="px-10 py-12 text-center">
//                                    <div className="inline-flex items-center gap-3 bg-white dark:bg-surface px-4 py-2 rounded-sm border border-stone-100 dark:border-border shadow-none">
//                                       {String(p.payout_method).toLowerCase().includes('bank') ? <Building className="h-4 w-4 text-stone-400" /> : <Smartphone className="h-4 w-4 text-stone-400" />}
//                                       <span className="text-[11px] font-black text-stone-900 dark:text-white uppercase tracking-widest">{p.payout_method as string}</span>
//                                    </div>
//                                 </td>
//                                 <td className="px-10 py-12">
//                                    <span className="text-[12px] font-black text-stone-400 tracking-[0.2em] font-mono truncate max-w-[150px] block uppercase">{String(p.payout_account ?? "UNSPECIFIED_NODE")}</span>
//                                 </td>
//                                 <td className="px-10 py-12 text-center">
//                                    <GlassPill color={p.status === 'paid' ? "emerald" : p.status === 'pending' ? "orange" : "default"} className="text-[10px] font-black tracking-widest px-5 py-2 uppercase border-white shadow-none mx-auto">
//                                       {String(p.status).toUpperCase()}
//                                    </GlassPill>
//                                 </td>
//                                 <td className="px-12 py-12 text-right">
//                                    <div className="space-y-1">
//                                       <p className="text-[14px] font-black text-stone-900 dark:text-white tracking-tighter">
//                                          {new Date(p.created_at as string).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
//                                       </p>
//                                       <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">
//                                          {new Date(p.created_at as string).getFullYear()} Registry
//                                       </p>
//                                    </div>
//                                 </td>
//                              </tr>
//                           ))}
//                        </tbody>
//                     </table>
//                  )}
//               </div>
//            </GlassCard>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import {
   DollarSign, ArrowDownRight, Clock, CheckCircle2,
   Wallet, Loader2, Building, History,
   Target, ShieldCheck, Smartphone, Activity,
   AlertCircle, ArrowRight, Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { normalizeVendorPayoutMethod } from "@/lib/payout-method";
import { cn } from "@/lib/utils";

/* ── Status config ─────────────────────────────────────────────────────────── */
const STATUS: Record<string, { label: string; className: string }> = {
   paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
   pending: { label: "Pending", className: "bg-amber-500/10  text-amber-600  dark:text-amber-400" },
   failed: { label: "Failed", className: "bg-rose-500/10   text-rose-600   dark:text-rose-400" },
};

/* ── Small stat ────────────────────────────────────────────────────────────── */
function MiniStat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
   return (
      <div>
         <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
            {label}
         </p>
         <p className={cn(
            "text-xl font-bold tabular-nums tracking-tight",
            muted ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"
         )}>
            {value}
         </p>
      </div>
   );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function PaymentsPage() {
   const { formatMoney } = useCurrency();

   const [wallet, setWallet] = useState<Record<string, unknown> | null>(null);
   const [payouts, setPayouts] = useState<Record<string, unknown>[]>([]);
   const [loading, setLoading] = useState(true);
   const [withdrawAmount, setWithdrawAmount] = useState("");
   const [withdrawing, setWithdrawing] = useState(false);
   const [withdrawSuccess, setWithdrawSuccess] = useState(false);
   const [syncOrderId, setSyncOrderId] = useState("");
   const [syncingOrder, setSyncingOrder] = useState(false);
   const [syncOrderMsg, setSyncOrderMsg] = useState<{ ok: boolean; text: string } | null>(null);

   useEffect(() => {
      async function load() {
         const supabase = createClient();
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;

         const [walletRes, payoutsRes] = await Promise.all([
            supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
            supabase.from("payouts").select("*").eq("user_id", user.id)
               .order("created_at", { ascending: false }).limit(20),
         ]);
         setWallet(walletRes.data ?? null);
         setPayouts(payoutsRes.data ?? []);
         setLoading(false);
      }
      load();
   }, []);

   async function requestWithdrawal() {
      if (!wallet || !withdrawAmount) return;
      const amount = parseFloat(withdrawAmount);
      if (amount <= 0 || amount > available) return;

      setWithdrawing(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vendor } = await supabase
         .from("vendors").select("payout_method, payout_account").eq("user_id", user.id).single();

      await supabase.from("payouts").insert({
         user_id: user.id,
         type: "vendor_withdrawal",
         amount,
         currency: walletCurrency,
         status: "pending",
         payout_method: normalizeVendorPayoutMethod(vendor?.payout_method as string | null | undefined),
         payout_account: vendor?.payout_account ?? "",
      });

      await supabase.from("wallets").update({
         available_balance: available - amount,
         pending_balance: pending + amount,
      }).eq("user_id", user.id);

      setWallet(prev => prev ? {
         ...prev,
         available_balance: Number(prev.available_balance ?? 0) - amount,
         pending_balance: Number(prev.pending_balance ?? 0) + amount,
      } : prev);

      // Refresh payout list
      const { data: fresh } = await supabase.from("payouts").select("*")
         .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      setPayouts(fresh ?? []);

      setWithdrawAmount("");
      setWithdrawSuccess(true);
      setWithdrawing(false);
      setTimeout(() => setWithdrawSuccess(false), 4000);
   }

   async function syncCreditsForOrder() {
      const id = syncOrderId.trim();
      if (!id) return;
      setSyncingOrder(true);
      setSyncOrderMsg(null);
      try {
         const res = await fetch("/api/vendor/wallet/sync-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: id }),
         });
         const data = (await res.json()) as { error?: string; ok?: boolean };
         if (!res.ok) throw new Error(data.error || "Request failed");

         setSyncOrderMsg({ ok: true, text: "Order earnings synced successfully." });
         setSyncOrderId("");

         const supabase = createClient();
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
            const { data: w } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
            setWallet(w);
         }
      } catch (e) {
         setSyncOrderMsg({ ok: false, text: e instanceof Error ? e.message : "Sync failed." });
      } finally {
         setSyncingOrder(false);
      }
   }

   /* ── Loading ── */
   if (loading) return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Loading…</p>
         </div>
      </div>
   );

   /* ── Derived ── */
   const available = Number(wallet?.available_balance ?? 0);
   const pending = Number(wallet?.pending_balance ?? 0);
   const earned = Number(wallet?.total_earned ?? 0);
   const paid = Number(wallet?.total_paid ?? 0);
   const walletCurrency = String((wallet as { currency?: string } | null)?.currency ?? "USD");

   const parsedAmount = parseFloat(withdrawAmount) || 0;
   const amountInvalid = !!withdrawAmount && (parsedAmount <= 0 || parsedAmount > available);
   const canWithdraw = !!withdrawAmount && !amountInvalid && !withdrawing;

   /* ── Render ── */
   return (
      <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
         <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">

            {/* ── Header ── */}
            <div className="flex items-start justify-between">
               <div>
                  <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight leading-none">
                     Payments
                  </h1>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                     Manage your wallet and withdrawal requests
                  </p>
               </div>
               <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
               </div>
            </div>

            {/* ── Balance hero ── */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
               <div className="p-6 sm:p-8 border-b border-[var(--color-border)]">
                  <div className="flex items-start justify-between gap-4">
                     <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                           Available Balance
                        </p>
                        <p className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight text-[var(--color-text-primary)] leading-none">
                           {formatMoney(available, walletCurrency)}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-2">{walletCurrency} wallet</p>
                     </div>
                     <div className="h-12 w-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-center shrink-0">
                        <Wallet className="h-5 w-5 text-[var(--color-text-muted)]" />
                     </div>
                  </div>
               </div>

               {/* Sub-stats */}
               <div className="grid grid-cols-3 divide-x divide-[var(--color-border)]">
                  <div className="px-5 sm:px-6 py-4">
                     <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                        Pending
                     </p>
                     <p className="text-base font-bold tabular-nums text-amber-500">
                        {formatMoney(pending, walletCurrency)}
                     </p>
                  </div>
                  <div className="px-5 sm:px-6 py-4">
                     <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                        Total Earned
                     </p>
                     <p className="text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                        {formatMoney(earned, walletCurrency)}
                     </p>
                  </div>
                  <div className="px-5 sm:px-6 py-4">
                     <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                        Total Paid Out
                     </p>
                     <p className="text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                        {formatMoney(paid, walletCurrency)}
                     </p>
                  </div>
               </div>
            </div>

            {/* ── Two-column actions ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

               {/* Withdrawal */}
               <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex flex-col">
                  <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
                     <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
                     </div>
                     <div>
                        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] leading-none">
                           Request Withdrawal
                        </h2>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                           Funds sent to your saved payout method
                        </p>
                     </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col">
                     {/* Success banner */}
                     {withdrawSuccess && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-in slide-in-from-top-2 duration-300">
                           <CheckCircle2 className="h-4 w-4 shrink-0" />
                           <div>
                              <p className="text-xs font-semibold">Withdrawal requested</p>
                              <p className="text-[10px] opacity-75 mt-0.5">Processing within 48 hours</p>
                           </div>
                        </div>
                     )}

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                           Amount ({walletCurrency})
                        </label>
                        <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-muted)] pointer-events-none select-none">
                              $
                           </span>
                           <input
                              type="number"
                              min={0}
                              max={available}
                              step="0.01"
                              value={withdrawAmount}
                              onChange={e => setWithdrawAmount(e.target.value)}
                              placeholder="0.00"
                              className={cn(
                                 "w-full h-14 pl-8 pr-4 rounded-lg border text-2xl font-bold tabular-nums",
                                 "bg-[var(--color-surface)] text-[var(--color-text-primary)]",
                                 "placeholder:text-[var(--color-text-muted)] placeholder:font-normal placeholder:text-base",
                                 "outline-none transition-all duration-150",
                                 amountInvalid
                                    ? "border-rose-400 focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400"
                                    : "border-[var(--color-border)] focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                              )}
                           />
                        </div>

                        {amountInvalid && (
                           <p className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              {parsedAmount > available
                                 ? `Exceeds available balance (${formatMoney(available, walletCurrency)})`
                                 : "Enter a valid amount"}
                           </p>
                        )}
                     </div>

                     {/* Quick fill */}
                     <div className="flex gap-2">
                        {[25, 50, 100].map(pct => {
                           const val = Math.floor(available * (pct / 100) * 100) / 100;
                           return (
                              <button
                                 key={pct}
                                 type="button"
                                 disabled={available === 0}
                                 onClick={() => setWithdrawAmount(String(val))}
                                 className={cn(
                                    "flex-1 h-8 rounded-lg text-xs font-semibold border transition-all",
                                    "border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
                                    "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
                                    "hover:border-[var(--color-border-strong)] disabled:opacity-40 disabled:cursor-not-allowed"
                                 )}
                              >
                                 {pct}%
                              </button>
                           );
                        })}
                        <button
                           type="button"
                           disabled={available === 0}
                           onClick={() => setWithdrawAmount(String(available))}
                           className={cn(
                              "flex-1 h-8 rounded-lg text-xs font-semibold border transition-all",
                              "border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
                              "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
                              "hover:border-[var(--color-border-strong)] disabled:opacity-40 disabled:cursor-not-allowed"
                           )}
                        >
                           Max
                        </button>
                     </div>

                     <div className="mt-auto pt-2 space-y-3">
                        <button
                           type="button"
                           disabled={!canWithdraw}
                           onClick={requestWithdrawal}
                           className={cn(
                              "w-full h-11 rounded-lg text-sm font-semibold transition-all duration-150",
                              "bg-orange-500 text-white shadow-[0_4px_16px_rgba(249,115,22,0.25)]",
                              "hover:bg-orange-600 active:scale-[0.98]",
                              "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                           )}
                        >
                           {withdrawing ? (
                              <span className="flex items-center justify-center gap-2">
                                 <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                 Processing…
                              </span>
                           ) : "Confirm Withdrawal"}
                        </button>

                        <p className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                           <Clock className="h-3 w-3" />
                           Processed within 48 hours
                        </p>
                     </div>
                  </div>
               </div>

               {/* Order sync */}
               <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex flex-col">
                  <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
                     <div className="h-7 w-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
                        <Target className="h-3.5 w-3.5 text-sky-500" />
                     </div>
                     <div>
                        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] leading-none">
                           Sync Order Earnings
                        </h2>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                           Manually reconcile a pending order credit
                        </p>
                     </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col">
                     <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                        If an order's earnings haven't appeared in your wallet, paste its ID below to trigger a manual sync.
                     </p>

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                           Order ID
                        </label>
                        <input
                           value={syncOrderId}
                           onChange={e => setSyncOrderId(e.target.value)}
                           placeholder="e.g. ord_abc123…"
                           className={cn(
                              "w-full h-11 px-4 rounded-lg border text-sm font-medium font-mono",
                              "bg-[var(--color-surface)] text-[var(--color-text-primary)]",
                              "placeholder:text-[var(--color-text-muted)] placeholder:font-sans",
                              "outline-none border-[var(--color-border)]",
                              "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-150"
                           )}
                        />
                     </div>

                     {syncOrderMsg && (
                        <div className={cn(
                           "flex items-center gap-2.5 p-3 rounded-lg border text-xs font-medium animate-in fade-in duration-200",
                           syncOrderMsg.ok
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                        )}>
                           {syncOrderMsg.ok
                              ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                           {syncOrderMsg.text}
                        </div>
                     )}

                     <div className="mt-auto pt-2">
                        <button
                           type="button"
                           disabled={syncingOrder || !syncOrderId.trim()}
                           onClick={syncCreditsForOrder}
                           className={cn(
                              "w-full h-11 rounded-lg text-sm font-semibold border transition-all duration-150",
                              "border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
                              "text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]",
                              "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                           )}
                        >
                           {syncingOrder ? (
                              <span className="flex items-center justify-center gap-2">
                                 <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" />
                                 Syncing…
                              </span>
                           ) : (
                              <span className="flex items-center justify-center gap-2">
                                 <Activity className="h-3.5 w-3.5 text-sky-500" />
                                 Sync Order
                              </span>
                           )}
                        </button>
                     </div>
                  </div>
               </div>
            </div>

            {/* ── Payout history ── */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
               <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
                  <History className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <div>
                     <h2 className="text-sm font-semibold text-[var(--color-text-primary)] leading-none">
                        Payout History
                     </h2>
                     <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        Your last {payouts.length} transactions
                     </p>
                  </div>
               </div>

               {payouts.length === 0 ? (
                  <div className="py-16 text-center">
                     <DollarSign className="h-8 w-8 text-[var(--color-border)] mx-auto mb-3" />
                     <p className="text-sm font-medium text-[var(--color-text-muted)]">No payouts yet</p>
                     <p className="text-xs text-[var(--color-text-muted)] opacity-60 mt-1">
                        Your withdrawal history will appear here
                     </p>
                  </div>
               ) : (
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="border-b border-[var(--color-border)]">
                              {["Amount", "Method", "Account", "Status", "Date"].map((h, i) => (
                                 <th
                                    key={h}
                                    className={cn(
                                       "px-5 sm:px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
                                       i === 4 && "text-right"
                                    )}
                                 >
                                    {h}
                                 </th>
                              ))}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                           {payouts.map((p) => {
                              const s = STATUS[String(p.status)] ?? STATUS.pending;
                              const isBank = String(p.payout_method ?? "").toLowerCase().includes("bank");
                              return (
                                 <tr
                                    key={p.id as string}
                                    className="hover:bg-[var(--color-surface-secondary)] transition-colors"
                                 >
                                    <td className="px-5 sm:px-6 py-4">
                                       <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                                          {formatMoney(Number(p.amount), (p.currency as string) || walletCurrency)}
                                       </span>
                                    </td>
                                    <td className="px-5 sm:px-6 py-4">
                                       <span className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] font-medium capitalize whitespace-nowrap">
                                          {isBank
                                             ? <Building className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
                                             : <Smartphone className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />}
                                          {String(p.payout_method ?? "").replace(/_/g, " ")}
                                       </span>
                                    </td>
                                    <td className="px-5 sm:px-6 py-4">
                                       <span className="text-xs font-medium text-[var(--color-text-muted)] font-mono truncate block max-w-[130px]">
                                          {String(p.payout_account ?? "—")}
                                       </span>
                                    </td>
                                    <td className="px-5 sm:px-6 py-4">
                                       <span className={cn(
                                          "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide",
                                          s.className
                                       )}>
                                          {s.label}
                                       </span>
                                    </td>
                                    <td className="px-5 sm:px-6 py-4 text-right">
                                       <span className="text-sm text-[var(--color-text-muted)] tabular-nums whitespace-nowrap">
                                          {new Date(p.created_at as string).toLocaleDateString(undefined, {
                                             day: "numeric", month: "short", year: "numeric"
                                          })}
                                       </span>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>

                     {payouts.length > 0 && (
                        <div className="px-5 sm:px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-between">
                           <span className="text-xs text-[var(--color-text-muted)]">
                              Showing {payouts.length} records
                           </span>
                           <span className="text-xs font-bold text-[var(--color-text-primary)]">
                              Total paid: {formatMoney(paid, walletCurrency)}
                           </span>
                        </div>
                     )}
                  </div>
               )}
            </div>

         </div>
      </div>
   );
}