// "use client";

// import React, { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { Link2, ArrowLeft, CheckCircle, Mail, CreditCard, ChevronRight, Loader2, Sparkles } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { GlassCard, GlassPill } from "@/components/ui/glass";
// import { createClient } from "@/lib/supabase/client";
// import { useUserStore } from "@/lib/store/use-user-store";
// import { cn } from "@/lib/utils";

// export default function ActivateAffiliatePage() {
//   const router = useRouter();
//   const { fetchRoles } = useUserStore();
//   const [loading, setLoading] = useState(true);
//   const [activating, setActivating] = useState(false);
//   const [affiliate, setAffiliate] = useState<{ id: string } | null>(null);
//   const [emailVerified, setEmailVerified] = useState(false);
//   const [hasPaymentMethod, setHasPaymentMethod] = useState(false);

//   useEffect(() => {
//     async function load() {
//       const supabase = createClient();
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         router.push("/login");
//         return;
//       }
//       const { data: aff } = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
//       setAffiliate(aff ?? null);
//       setEmailVerified(!!user.email_confirmed_at);
//       if (aff) {
//         const { data: row } = await supabase.from("affiliates").select("payout_method, payout_account").eq("id", aff.id).single();
//         const r = row as { payout_method?: string; payout_account?: string } | null;
//         setHasPaymentMethod(!!(r?.payout_account?.trim?.() ?? r?.payout_account));
//       }
//       setLoading(false);
//     }
//     load();
//   }, [router]);

//   async function handleActivate() {
//     setActivating(true);
//     const supabase = createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) {
//       setActivating(false);
//       return;
//     }
//     const { data } = await supabase.from("affiliates").insert({ user_id: user.id }).select("id").single();
//     if (data) {
//       await supabase.from("user_roles").upsert(
//         { user_id: user.id, role: "affiliate", is_active: true },
//         { onConflict: "user_id,role" }
//       );
//       await fetchRoles();
//       router.refresh();
//       router.push("/dashboard/links");
//     }
//     setActivating(false);
//   }

//   useEffect(() => {
//     if (!loading && affiliate) {
//       router.replace("/dashboard/links");
//     }
//   }, [loading, affiliate, router]);

//   if (loading || affiliate) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center space-y-6 sm:space-y-8 animate-in fade-in duration-700 bg-[var(--color-bg)] px-4">
//         <div className="relative">
//           <div className="absolute inset-0 bg-sky-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
//           <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex items-center justify-center overflow-hidden">
//             <div className="absolute inset-0 border-2 border-t-sky-500 border-r-transparent border-b-transparent border-l-transparent rounded-2xl animate-spin m-2" />
//             <Link2 className="h-7 w-7 sm:h-8 sm:w-8 text-[var(--color-text-primary)]" />
//           </div>
//         </div>
//         <div className="text-center">
//            <h2 className="text-[11px] sm:text-[12px] font-black text-[var(--color-text-primary)] uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-2">Authenticating</h2>
//            <p className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Validating Affiliate Protocol</p>
//         </div>
//       </div>
//     );
//   }

//   const canActivate = emailVerified;

//   return (
//     <div
//       className="min-h-screen animate-in fade-in duration-500 pb-20 bg-[var(--color-bg)]"
//       style={{
//          background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(20,184,166,0.06) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(14,165,233,0.06) 0%, transparent 55%), var(--color-bg)",
//       }}
//     >
//       <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
//         <div className="flex flex-col items-center text-center mb-8 sm:mb-12">
//            <Link href="/dashboard" className="mb-6 sm:mb-8 group">
//               <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all shadow-sm">
//                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
//                  <span className="text-[10px] font-bold uppercase tracking-widest">Return to Dashboard</span>
//               </div>
//            </Link>

//            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex items-center justify-center mb-5 sm:mb-6 relative group overflow-hidden">
//               <div className="absolute inset-0 bg-sky-500 opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl" />
//               <Link2 className="h-8 w-8 sm:h-10 sm:w-10 text-[var(--color-text-primary)] group-hover:scale-110 transition-transform duration-500" />
//            </div>

//            <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-text-primary)] tracking-tighter mb-3">Become an Affiliate</h1>
//            <p className="text-[var(--color-text-secondary)] font-semibold max-w-sm text-sm sm:text-base leading-relaxed">
//               Join the elite circle of promoters and earn high-yield commissions on global merchant inventory.
//            </p>
//         </div>

//         <GlassCard className="p-5 sm:p-8 md:p-10 relative overflow-hidden rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)]">
//            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />

//            <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-5 sm:mb-6 pl-1 border-l-2 border-[var(--color-border)]">Merchant Compliance</h3>

//            <div className="space-y-3 sm:space-y-4">
//               <div className={cn(
//                  "flex items-center justify-between p-4 sm:p-5 rounded-xl transition-all border",
//                  emailVerified ? "bg-[var(--color-surface-secondary)] border-emerald-200/50 dark:border-emerald-500/20" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] opacity-60"
//               )}>
//                  <div className="flex items-center gap-3 sm:gap-4">
//                     <div className={cn(
//                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border",
//                        emailVerified ? "bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400" : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]"
//                     )}>
//                        <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
//                     </div>
//                     <div>
//                        <p className="text-[13px] sm:text-[14px] font-bold text-[var(--color-text-primary)] leading-tight">Identity Verification</p>
//                        <p className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-text-muted)]">Email confirmation protocol</p>
//                     </div>
//                  </div>
//                  {emailVerified && <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0" />}
//               </div>

//               <div className={cn(
//                  "flex items-center justify-between p-4 sm:p-5 rounded-xl transition-all border",
//                  hasPaymentMethod ? "bg-[var(--color-surface-secondary)] border-emerald-200/50 dark:border-emerald-500/20" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
//               )}>
//                  <div className="flex items-center gap-3 sm:gap-4">
//                     <div className={cn(
//                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border",
//                        hasPaymentMethod ? "bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-500 dark:text-amber-400"
//                     )}>
//                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
//                     </div>
//                     <div>
//                        <p className="text-[13px] sm:text-[14px] font-bold text-[var(--color-text-primary)] leading-tight">Payout Infrastructure</p>
//                        <p className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-text-muted)]">Secure settlement gateway</p>
//                     </div>
//                  </div>
//                  {hasPaymentMethod ? (
//                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0" />
//                  ) : (
//                    <GlassPill color="orange" className="text-[7px] sm:text-[8px] px-2 py-0.5 shrink-0">PENDING</GlassPill>
//                  )}
//               </div>
//            </div>

//            <div className="mt-6 sm:mt-10 p-4 sm:p-5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
//               <div className="flex items-start gap-3">
//                  <Sparkles className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
//                  <p className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-text-muted)] leading-relaxed uppercase tracking-widest">
//                     Upon activation, you will be authorized to deploy smart links, track interaction metrics, and initiate global payouts.
//                  </p>
//               </div>
//            </div>

//            <Button
//               className={cn(
//                 "mt-6 sm:mt-10 h-12 sm:h-14 w-full rounded-xl font-black text-[11px] sm:text-[12px] uppercase tracking-[0.15em] sm:tracking-[0.2em] shadow-sm transition-all active:scale-95",
//                 canActivate ? "bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-black dark:hover:bg-stone-200 border-none" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)] pointer-events-none"
//               )}
//               onClick={handleActivate}
//               disabled={!canActivate || activating}
//            >
//               {activating ? (
//                 <div className="flex items-center gap-3">
//                    <Loader2 className="h-4 w-4 animate-spin" />
//                    Deploying Protocol...
//                 </div>
//               ) : (
//                 <div className="flex items-center gap-2">
//                    Activate Affiliate Nodes <ChevronRight className="h-4 w-4" />
//                 </div>
//               )}
//            </Button>

//            {!canActivate && (
//               <p className="text-center text-[9px] sm:text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-4">
//                  Mandatory: confirm identity via email to unlock affiliation nodes.
//               </p>
//            )}
//         </GlassCard>
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
   Link2, ArrowLeft, CheckCircle, Mail, CreditCard,
   ChevronRight, Loader2, Info, ExternalLink, DollarSign,
   TrendingUp, Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/lib/store/use-user-store";
import { cn } from "@/lib/utils";

export default function ActivateAffiliatePage() {
   const router = useRouter();
   const { fetchRoles } = useUserStore();

   const [loading, setLoading] = useState(true);
   const [activating, setActivating] = useState(false);
   const [affiliate, setAffiliate] = useState<{ id: string } | null>(null);
   const [emailVerified, setEmailVerified] = useState(false);
   const [hasPaymentMethod, setHasPaymentMethod] = useState(false);

   useEffect(() => {
      async function load() {
         const supabase = createClient();
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) { router.push("/login"); return; }

         const { data: aff } = await supabase
            .from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
         setAffiliate(aff ?? null);
         setEmailVerified(!!user.email_confirmed_at);

         if (aff) {
            const { data: row } = await supabase
               .from("affiliates").select("payout_method, payout_account").eq("id", aff.id).single();
            const r = row as { payout_method?: string; payout_account?: string } | null;
            setHasPaymentMethod(!!(r?.payout_account?.trim?.()));
         }
         setLoading(false);
      }
      load();
   }, [router]);

   useEffect(() => {
      if (!loading && affiliate) router.replace("/dashboard/links");
   }, [loading, affiliate, router]);

   async function handleActivate() {
      setActivating(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setActivating(false); return; }

      const { data } = await supabase.from("affiliates").insert({ user_id: user.id }).select("id").single();
      if (data) {
         await supabase.from("user_roles").upsert(
            { user_id: user.id, role: "affiliate", is_active: true },
            { onConflict: "user_id,role" }
         );
         await fetchRoles();
         router.refresh();
         router.push("/dashboard/links");
      }
      setActivating(false);
   }

   /* ── Loading ── */
   if (loading || affiliate) return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
         <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--color-accent)" }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
         </div>
      </div>
   );

   const canActivate = emailVerified;

   return (
      <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
         <div className="max-w-md mx-auto px-4 sm:px-6 pt-10 sm:pt-16">

            {/* Back */}
            <Link
               href="/dashboard"
               className="inline-flex items-center gap-2 mb-10 text-xs font-semibold"
               style={{ color: "var(--color-text-muted)" }}
               onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
               onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
               <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>

            {/* Header */}
            <div className="mb-8">
               <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-subtle)" }}
               >
                  <Link2 className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
               </div>
               <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--color-text-primary)" }}>
                  Become an Affiliate
               </h1>
               <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  Share product links and earn commissions every time someone buys through your link.
               </p>
            </div>

            {/* How it works strip */}
            <div
               className="rounded-xl p-4 mb-6"
               style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}
            >
               <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
                  How it works
               </p>
               <div className="grid grid-cols-3 gap-2">
                  {[
                     { icon: Link2, label: "Get your link", color: "var(--color-accent)" },
                     { icon: TrendingUp, label: "Share & track views", color: "#0ea5e9" },
                     { icon: DollarSign, label: "Earn commission", color: "var(--color-success)" },
                  ].map(({ icon: Icon, label, color }, i) => (
                     <div key={i} className="flex flex-col items-center gap-1.5 text-center">
                        <div
                           className="h-8 w-8 rounded-lg flex items-center justify-center"
                           style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                        >
                           <Icon className="h-3.5 w-3.5" style={{ color }} />
                        </div>
                        <p className="text-[10px] font-medium leading-tight" style={{ color: "var(--color-text-muted)" }}>
                           {label}
                        </p>
                     </div>
                  ))}
               </div>
            </div>

            {/* Main card */}
            <div
               className="rounded-xl overflow-hidden"
               style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
            >
               {/* Checklist */}
               <div
                  className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
               >
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-muted)" }}>
                     Requirements
                  </p>

                  <div className="space-y-2.5">

                     {/* Email verification */}
                     <div
                        className="flex items-center gap-3.5 p-3.5 rounded-xl"
                        style={{
                           border: emailVerified ? "1px solid rgba(48,164,108,0.25)" : "1px solid var(--color-border)",
                           background: emailVerified ? "rgba(48,164,108,0.05)" : "var(--color-surface-secondary)",
                        }}
                     >
                        <div
                           className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                           style={{
                              background: emailVerified ? "rgba(48,164,108,0.12)" : "var(--color-surface)",
                              border: emailVerified ? "1px solid rgba(48,164,108,0.2)" : "1px solid var(--color-border)",
                              color: emailVerified ? "var(--color-success)" : "var(--color-text-muted)",
                           }}
                        >
                           <Mail className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-semibold leading-none mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                              Email verified <span style={{ color: "var(--color-accent)" }}>*</span>
                           </p>
                           <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              Confirm your email address to continue
                           </p>
                        </div>
                        {emailVerified ? (
                           <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "var(--color-success)" }} />
                        ) : (
                           <Link
                              href="/dashboard/settings"
                              className="flex items-center gap-1 text-[10px] font-semibold shrink-0"
                              style={{ color: "var(--color-accent)" }}
                           >
                              Verify <ExternalLink className="h-3 w-3" />
                           </Link>
                        )}
                     </div>

                     {/* Payout method */}
                     <div
                        className="flex items-center gap-3.5 p-3.5 rounded-xl"
                        style={{
                           border: hasPaymentMethod ? "1px solid rgba(48,164,108,0.25)" : "1px solid var(--color-border)",
                           background: hasPaymentMethod ? "rgba(48,164,108,0.05)" : "var(--color-surface-secondary)",
                           opacity: hasPaymentMethod ? 1 : 0.8,
                        }}
                     >
                        <div
                           className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                           style={{
                              background: hasPaymentMethod ? "rgba(48,164,108,0.12)" : "var(--color-surface)",
                              border: hasPaymentMethod ? "1px solid rgba(48,164,108,0.2)" : "1px solid var(--color-border)",
                              color: hasPaymentMethod ? "var(--color-success)" : "var(--color-text-muted)",
                           }}
                        >
                           <CreditCard className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-semibold leading-none mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                              Payout method
                           </p>
                           <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              Add a payout account to receive earnings
                           </p>
                        </div>
                        {hasPaymentMethod ? (
                           <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "var(--color-success)" }} />
                        ) : (
                           <span
                              className="text-[9px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md shrink-0"
                              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                           >
                              Add after
                           </span>
                        )}
                     </div>
                  </div>
               </div>

               {/* Info strip */}
               <div
                  className="px-5 sm:px-6 py-3.5 flex items-start gap-2.5"
                  style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}
               >
                  <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "var(--color-text-muted)" }} />
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                     Commissions are tracked in real time and paid out through your saved payout method. You can add one after activating.
                  </p>
               </div>

               {/* CTA */}
               <div className="p-5 sm:p-6 space-y-3">
                  {!emailVerified && (
                     <div
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                        style={{ background: "rgba(229,72,77,0.06)", border: "1px solid rgba(229,72,77,0.2)" }}
                     >
                        <Info className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-danger)" }} />
                        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
                           Please verify your email before activating.
                        </p>
                     </div>
                  )}

                  <button
                     type="button"
                     onClick={handleActivate}
                     disabled={!canActivate || activating}
                     className={cn(
                        "w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150",
                        canActivate && !activating && "active:scale-[0.98]"
                     )}
                     style={
                        canActivate
                           ? {
                              background: "var(--color-accent)", color: "#fff", border: "none",
                              boxShadow: "0 4px 16px rgba(253,80,0,0.25)",
                              cursor: activating ? "default" : "pointer",
                              opacity: activating ? 0.85 : 1,
                           }
                           : {
                              background: "var(--color-surface-secondary)", color: "var(--color-text-muted)",
                              border: "1px solid var(--color-border)", cursor: "not-allowed",
                           }
                     }
                     onMouseEnter={e => { if (canActivate && !activating) (e.currentTarget as HTMLElement).style.background = "var(--color-accent-hover)"; }}
                     onMouseLeave={e => { if (canActivate && !activating) (e.currentTarget as HTMLElement).style.background = "var(--color-accent)"; }}
                  >
                     {activating ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Activating…</>
                     ) : (
                        <>Activate Affiliate Account <ChevronRight className="h-4 w-4" /></>
                     )}
                  </button>

                  {!canActivate && (
                     <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Verify your email to continue
                     </p>
                  )}
               </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs mt-6" style={{ color: "var(--color-text-muted)" }}>
               Questions?{" "}
               <Link
                  href="/help"
                  className="font-semibold underline underline-offset-2"
                  style={{ color: "var(--color-accent)" }}
               >
                  Visit our Help Center
               </Link>
            </p>
         </div>
      </div>
   );
}