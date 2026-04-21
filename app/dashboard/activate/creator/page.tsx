"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Video, ArrowLeft, CheckCircle, User, Share2, FileCheck, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill } from "@/components/ui/glass";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/lib/store/use-user-store";
import { cn } from "@/lib/utils";

export default function ActivateCreatorPage() {
  const router = useRouter();
  const { fetchRoles } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [influencer, setInfluencer] = useState<{ id: string } | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [hasSocialAccount, setHasSocialAccount] = useState(false);
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: inf } = await supabase.from("influencers").select("id").eq("user_id", user.id).maybeSingle();
      setInfluencer(inf ?? null);
      if (inf) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).single();
      const p = profile as { full_name?: string; username?: string } | null;
      setProfileComplete(!!(p?.full_name?.trim() || p?.username?.trim()));
      const { data: infRow } = await supabase.from("influencers").select("social_platforms").eq("user_id", user.id).maybeSingle();
      const sp = (infRow as { social_platforms?: Record<string, unknown> } | null)?.social_platforms;
      setHasSocialAccount(!!sp && typeof sp === "object" && Object.keys(sp).length > 0);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleActivate() {
    if (!agreedToGuidelines) return;
    setActivating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setActivating(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).single();
    const p = profile as { full_name?: string; username?: string } | null;
    const displayName = p?.full_name?.trim() || p?.username?.trim() || user.email?.split("@")[0] || "Creator";
    const { data } = await supabase
      .from("influencers")
      .insert({
        user_id: user.id,
        display_name: displayName,
        guidelines_accepted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (data) {
      await supabase.from("user_roles").upsert(
        { user_id: user.id, role: "influencer", is_active: true },
        { onConflict: "user_id,role" }
      );
      await fetchRoles();
      router.refresh();
      router.push("/dashboard/influencer");
    }
    setActivating(false);
  }

  useEffect(() => {
    if (!loading && influencer) {
      router.replace("/dashboard/influencer");
    }
  }, [loading, influencer, router]);

  if (loading || influencer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700" style={{ background: "#f0ede8" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-violet-400/20 blur-2xl rounded-none scale-150 animate-pulse" />
          <div className="relative w-20 h-20 rounded-none bg-white dark:bg-surface/40 backdrop-blur-md border border-white/80 shadow-none flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent rounded-none animate-spin m-2" />
            <Video className="h-8 w-8 text-stone-900 dark:text-white" />
          </div>
        </div>
        <div className="text-center">
           <h2 className="text-[12px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] mb-2 pl-[0.4em]">Initializing</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Deploying Creator Interface</p>
        </div>
      </div>
    );
  }

  const canActivate = agreedToGuidelines;

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20"
      style={{
         background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(219,39,119,0.06) 0%, transparent 55%), #f0ede8",
      }}
    >
      <div className="max-w-2xl mx-auto px-6 pt-12">
        <div className="flex flex-col items-center text-center mb-12">
           <Link href="/dashboard" className="mb-8 group">
              <div className="flex items-center gap-2 px-4 py-2 rounded-none bg-white dark:bg-surface/40 border border-white/80 text-stone-500 hover:text-stone-900 dark:text-white transition-all shadow-none">
                 <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Return to Dashboard</span>
              </div>
           </Link>
           
           <div className="w-20 h-20 rounded-none bg-white dark:bg-surface border border-white shadow-none flex items-center justify-center mb-6 relative group overflow-hidden">
              <div className="absolute inset-0 bg-violet-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              <Video className="h-10 w-10 text-stone-900 dark:text-white group-hover:scale-110 transition-transform duration-500" />
           </div>
           
           <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter mb-3">Become a Creator</h1>
           <p className="text-stone-600 font-semibold max-w-sm">
              Monetize your creative vision through immersive short video clips and global distribution.
           </p>
        </div>

        <GlassCard className="p-10 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 blur-3xl rounded-none translate-x-1/2 -translate-y-1/2" />
           
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-400 mb-6 pl-1 border-l-2 border-stone-200 dark:border-border">Creative Onboarding</h3>
           
           <div className="space-y-4">
              <div className={cn(
                 "flex items-center justify-between p-5 rounded-none transition-all border",
                 profileComplete ? "bg-white dark:bg-surface/60 border-emerald-200/50 shadow-[inset_0_1px_4px_rgba(255,255,255,1)]" : "bg-white dark:bg-surface/40 border-stone-200/50"
              )}>
                 <div className="flex items-center gap-4">
                    <div className={cn(
                       "w-12 h-12 rounded-none flex items-center justify-center shadow-none border",
                       profileComplete ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-amber-50 border-amber-200 text-amber-500"
                    )}>
                       <User className="h-5 w-5" />
                    </div>
                    <div>
                       <p className="text-[14px] font-bold text-stone-900 dark:text-white leading-tight">Identity Profile</p>
                       <p className="text-[11px] font-semibold text-stone-500">Complete personal bio</p>
                    </div>
                 </div>
                 {profileComplete ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                 ) : (
                    <GlassPill color="orange" className="text-[8px] px-2 py-0.5">COMPLETION REQUIRED</GlassPill>
                 )}
              </div>

              <div className={cn(
                 "flex items-center justify-between p-5 rounded-none transition-all border",
                 hasSocialAccount ? "bg-white dark:bg-surface/60 border-emerald-200/50 shadow-[inset_0_1px_4px_rgba(255,255,255,1)]" : "bg-white dark:bg-surface/40 border-stone-200/50 opacity-60"
              )}>
                 <div className="flex items-center gap-4">
                    <div className={cn(
                       "w-12 h-12 rounded-none flex items-center justify-center shadow-none border",
                       hasSocialAccount ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-stone-50 dark:bg-surface/50 border-stone-200 dark:border-border text-stone-400"
                    )}>
                       <Share2 className="h-5 w-5" />
                    </div>
                    <div>
                       <p className="text-[14px] font-bold text-stone-900 dark:text-white leading-tight">Social Connectivity</p>
                       <p className="text-[11px] font-semibold text-stone-500">Linking distribution channels</p>
                    </div>
                 </div>
                 {hasSocialAccount ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                 ) : (
                    <GlassPill color="sky" className="text-[8px] px-2 py-0.5">OPTIONAL START</GlassPill>
                 )}
              </div>

              <button
                type="button"
                onClick={() => setAgreedToGuidelines(!agreedToGuidelines)}
                className={cn(
                   "flex items-center justify-between p-5 rounded-none transition-all border w-full text-left group/btn",
                   agreedToGuidelines ? "bg-white dark:bg-surface/60 border-emerald-200/50 shadow-[inset_0_1px_4px_rgba(255,255,255,1)]" : "bg-white dark:bg-surface/60 border-stone-200 dark:border-border hover:border-violet-300"
                )}
              >
                 <div className="flex items-center gap-4">
                    <div className={cn(
                       "w-12 h-12 rounded-none flex items-center justify-center shadow-none border transition-colors",
                       agreedToGuidelines ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-violet-50 border-violet-100 text-violet-500 group-hover/btn:bg-violet-100"
                    )}>
                       <FileCheck className="h-5 w-5" />
                    </div>
                    <div>
                       <p className="text-[14px] font-bold text-stone-900 dark:text-white leading-tight">Creator Guidelines</p>
                       <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest text-[9px] mt-0.5">Agreement to protocol</p>
                    </div>
                 </div>
                 {agreedToGuidelines ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-none border-2 border-stone-200 dark:border-border group-hover/btn:border-violet-300 transition-colors" />}
              </button>
           </div>

           <div className="mt-10 p-5 rounded-none bg-stone-50/50 border border-stone-100/50">
              <div className="flex items-start gap-3">
                 <Sparkles className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                 <p className="text-[11px] font-semibold text-stone-500 leading-relaxed uppercase tracking-widest pl-1">
                    Authorization allows for asset deployment, engagement tracking, and conversion-based monetization.
                 </p>
              </div>
           </div>

           <Button
              className={cn(
                "mt-10 h-14 w-full rounded-none font-black text-[12px] uppercase tracking-[0.2em] shadow-none transition-all active:scale-95",
                canActivate ? "bg-stone-900 text-white hover:bg-black shadow-stone-900/20" : "bg-stone-100 text-stone-300 border border-stone-200 dark:border-border shadow-none pointer-events-none"
              )}
              onClick={handleActivate}
              disabled={!canActivate || activating}
           >
              {activating ? (
                <div className="flex items-center gap-3">
                   <Loader2 className="h-4 w-4 animate-spin" />
                   Initializing Nodes...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                   Activate Creator Role <ChevronRight className="h-4 w-4" />
                </div>
              )}
           </Button>
           
           {!canActivate && (
              <p className="text-center text-[10px] font-bold text-violet-500 uppercase tracking-widest mt-4">
                 Mandatory: Accept creator guidelines to unlock distribution nodes.
              </p>
           )}
        </GlassCard>
      </div>
    </div>
  );
}

