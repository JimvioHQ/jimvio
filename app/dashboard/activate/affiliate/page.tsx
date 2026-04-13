"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, ArrowLeft, CheckCircle, Mail, CreditCard, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill } from "@/components/ui/glass";
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
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: aff } = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      setAffiliate(aff ?? null);
      setEmailVerified(!!user.email_confirmed_at);
      if (aff) {
        const { data: row } = await supabase.from("affiliates").select("payout_method, payout_account").eq("id", aff.id).single();
        const r = row as { payout_method?: string; payout_account?: string } | null;
        setHasPaymentMethod(!!(r?.payout_account?.trim?.() ?? r?.payout_account));
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleActivate() {
    setActivating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setActivating(false);
      return;
    }
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

  useEffect(() => {
    if (!loading && affiliate) {
      router.replace("/dashboard/links");
    }
  }, [loading, affiliate, router]);

  if (loading || affiliate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700" style={{ background: "#f0ede8" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-sky-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-20 h-20 rounded-[24px] bg-white/40 backdrop-blur-md border border-white/80 shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-sky-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
            <Link2 className="h-8 w-8 text-stone-900" />
          </div>
        </div>
        <div className="text-center">
           <h2 className="text-[12px] font-black text-stone-900 uppercase tracking-[0.4em] mb-2 pl-[0.4em]">Authenticating</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Validating Affiliate Protocol</p>
        </div>
      </div>
    );
  }

  const canActivate = emailVerified;

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20"
      style={{
         background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(20,184,166,0.06) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(14,165,233,0.06) 0%, transparent 55%), #f0ede8",
      }}
    >
      <div className="max-w-2xl mx-auto px-6 pt-12">
        <div className="flex flex-col items-center text-center mb-12">
           <Link href="/dashboard" className="mb-8 group">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 border border-white/80 text-stone-500 hover:text-stone-900 transition-all shadow-sm">
                 <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Return to Dashboard</span>
              </div>
           </Link>
           
           <div className="w-20 h-20 rounded-[28px] bg-white border border-white shadow-2xl flex items-center justify-center mb-6 relative group overflow-hidden">
              <div className="absolute inset-0 bg-sky-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              <Link2 className="h-10 w-10 text-stone-900 group-hover:scale-110 transition-transform duration-500" />
           </div>
           
           <h1 className="text-4xl font-black text-stone-900 tracking-tighter mb-3">Become an Affiliate</h1>
           <p className="text-stone-600 font-semibold max-w-sm">
              Join the elite circle of promoters and earn high-yield commissions on global merchant inventory.
           </p>
        </div>

        <GlassCard className="p-10 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
           
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-400 mb-6 pl-1 border-l-2 border-stone-200">Merchant Compliance</h3>
           
           <div className="space-y-4">
              <div className={cn(
                 "flex items-center justify-between p-5 rounded-[20px] transition-all border",
                 emailVerified ? "bg-white/60 border-emerald-200/50 shadow-[inset_0_1px_4px_rgba(255,255,255,1)]" : "bg-white/40 border-stone-200/50 opacity-60"
              )}>
                 <div className="flex items-center gap-4">
                    <div className={cn(
                       "w-12 h-12 rounded-[14px] flex items-center justify-center shadow-sm border",
                       emailVerified ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-stone-50 border-stone-200 text-stone-400"
                    )}>
                       <Mail className="h-5 w-5" />
                    </div>
                    <div>
                       <p className="text-[14px] font-bold text-stone-900 leading-tight">Identity Verification</p>
                       <p className="text-[11px] font-semibold text-stone-500">Email confirmation protocol</p>
                    </div>
                 </div>
                 {emailVerified && <CheckCircle className="h-5 w-5 text-emerald-500" />}
              </div>

              <div className={cn(
                 "flex items-center justify-between p-5 rounded-[20px] transition-all border",
                 hasPaymentMethod ? "bg-white/60 border-emerald-200/50 shadow-[inset_0_1px_4px_rgba(255,255,255,1)]" : "bg-white/40 border-stone-200/50"
              )}>
                 <div className="flex items-center gap-4">
                    <div className={cn(
                       "w-12 h-12 rounded-[14px] flex items-center justify-center shadow-sm border",
                       hasPaymentMethod ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-amber-50 border-amber-200 text-amber-500"
                    )}>
                       <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                       <p className="text-[14px] font-bold text-stone-900 leading-tight">Payout Infrastructure</p>
                       <p className="text-[11px] font-semibold text-stone-500">Secure settlement gateway</p>
                    </div>
                 </div>
                 {hasPaymentMethod ? (
                   <CheckCircle className="h-5 w-5 text-emerald-500" />
                 ) : (
                   <GlassPill color="orange" className="text-[8px] px-2 py-0.5">PENDING POST-ACTIVATION</GlassPill>
                 )}
              </div>
           </div>

           <div className="mt-10 p-5 rounded-[18px] bg-stone-50/50 border border-stone-100/50">
              <div className="flex items-start gap-3">
                 <Sparkles className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                 <p className="text-[11px] font-semibold text-stone-500 leading-relaxed uppercase tracking-widest pl-1">
                    Upon activation, you will be authorized to deploy smart links, track interaction metrics, and initiate global payouts.
                 </p>
              </div>
           </div>

           <Button
              className={cn(
                "mt-10 h-14 w-full rounded-[18px] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95",
                canActivate ? "bg-stone-900 text-white hover:bg-black shadow-stone-900/20" : "bg-stone-100 text-stone-300 border border-stone-200 shadow-none pointer-events-none"
              )}
              onClick={handleActivate}
              disabled={!canActivate || activating}
           >
              {activating ? (
                <div className="flex items-center gap-3">
                   <Loader2 className="h-4 w-4 animate-spin" />
                   Deploying Protocol...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                   Activate Affiliate Nodes <ChevronRight className="h-4 w-4" />
                </div>
              )}
           </Button>
           
           {!canActivate && (
              <p className="text-center text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-4">
                 Mandatory: confirm identity via email to unlock affiliation nodes.
              </p>
           )}
        </GlassCard>
      </div>
    </div>
  );
}
