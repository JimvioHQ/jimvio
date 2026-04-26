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
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6 sm:space-y-8 animate-in fade-in duration-700 bg-[var(--color-bg)] px-4">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent rounded-2xl animate-spin m-2" />
            <Video className="h-7 w-7 sm:h-8 sm:w-8 text-[var(--color-text-primary)]" />
          </div>
        </div>
        <div className="text-center">
           <h2 className="text-[11px] sm:text-[12px] font-black text-[var(--color-text-primary)] uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-2">Initializing</h2>
           <p className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Deploying Creator Interface</p>
        </div>
      </div>
    );
  }

  const canActivate = agreedToGuidelines;

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20 bg-[var(--color-bg)]"
      style={{
         background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(219,39,119,0.06) 0%, transparent 55%), var(--color-bg)",
      }}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="flex flex-col items-center text-center mb-8 sm:mb-12">
           <Link href="/dashboard" className="mb-6 sm:mb-8 group">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all shadow-sm">
                 <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Return to Dashboard</span>
              </div>
           </Link>
           
           <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex items-center justify-center mb-5 sm:mb-6 relative group overflow-hidden">
              <div className="absolute inset-0 bg-violet-500 opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl" />
              <Video className="h-8 w-8 sm:h-10 sm:w-10 text-[var(--color-text-primary)] group-hover:scale-110 transition-transform duration-500" />
           </div>
           
           <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-text-primary)] tracking-tighter mb-3">Become a Creator</h1>
           <p className="text-[var(--color-text-secondary)] font-semibold max-w-sm text-sm sm:text-base leading-relaxed">
              Monetize your creative vision through immersive short video clips and global distribution.
           </p>
        </div>

        <GlassCard className="p-5 sm:p-8 md:p-10 relative overflow-hidden rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)]">
           <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
           
           <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-5 sm:mb-6 pl-1 border-l-2 border-[var(--color-border)]">Creative Onboarding</h3>
           
           <div className="space-y-3 sm:space-y-4">
              <div className={cn(
                 "flex items-center justify-between p-4 sm:p-5 rounded-xl transition-all border",
                 profileComplete ? "bg-[var(--color-surface-secondary)] border-emerald-200/50 dark:border-emerald-500/20" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
              )}>
                 <div className="flex items-center gap-3 sm:gap-4">
                    <div className={cn(
                       "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border",
                       profileComplete ? "bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-500 dark:text-amber-400"
                    )}>
                       <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                       <p className="text-[13px] sm:text-[14px] font-bold text-[var(--color-text-primary)] leading-tight">Identity Profile</p>
                       <p className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-text-muted)]">Complete personal bio</p>
                    </div>
                 </div>
                 {profileComplete ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0" />
                 ) : (
                    <GlassPill color="orange" className="text-[7px] sm:text-[8px] px-2 py-0.5 shrink-0">REQUIRED</GlassPill>
                 )}
              </div>

              <div className={cn(
                 "flex items-center justify-between p-4 sm:p-5 rounded-xl transition-all border",
                 hasSocialAccount ? "bg-[var(--color-surface-secondary)] border-emerald-200/50 dark:border-emerald-500/20" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] opacity-60"
              )}>
                 <div className="flex items-center gap-3 sm:gap-4">
                    <div className={cn(
                       "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border",
                       hasSocialAccount ? "bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400" : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                    )}>
                       <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                       <p className="text-[13px] sm:text-[14px] font-bold text-[var(--color-text-primary)] leading-tight">Social Connectivity</p>
                       <p className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-text-muted)]">Linking distribution channels</p>
                    </div>
                 </div>
                 {hasSocialAccount ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0" />
                 ) : (
                    <GlassPill color="sky" className="text-[7px] sm:text-[8px] px-2 py-0.5 shrink-0">OPTIONAL</GlassPill>
                 )}
              </div>

              <button
                type="button"
                onClick={() => setAgreedToGuidelines(!agreedToGuidelines)}
                className={cn(
                   "flex items-center justify-between p-4 sm:p-5 rounded-xl transition-all border w-full text-left group/btn",
                   agreedToGuidelines ? "bg-[var(--color-surface-secondary)] border-emerald-200/50 dark:border-emerald-500/20" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] hover:border-violet-300 dark:hover:border-violet-700"
                )}
              >
                 <div className="flex items-center gap-3 sm:gap-4">
                    <div className={cn(
                       "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                       agreedToGuidelines ? "bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400" : "bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-800 text-violet-500 group-hover/btn:bg-violet-100 dark:group-hover/btn:bg-violet-950/50"
                    )}>
                       <FileCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                       <p className="text-[13px] sm:text-[14px] font-bold text-[var(--color-text-primary)] leading-tight">Creator Guidelines</p>
                       <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">Agreement to protocol</p>
                    </div>
                 </div>
                 {agreedToGuidelines ? (
                   <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0" />
                 ) : (
                   <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-[var(--color-border)] group-hover/btn:border-violet-300 dark:group-hover/btn:border-violet-700 transition-colors shrink-0" />
                 )}
              </button>
           </div>

           <div className="mt-6 sm:mt-10 p-4 sm:p-5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
              <div className="flex items-start gap-3">
                 <Sparkles className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                 <p className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-text-muted)] leading-relaxed uppercase tracking-widest">
                    Authorization allows for asset deployment, engagement tracking, and conversion-based monetization.
                 </p>
              </div>
           </div>

           <Button
              className={cn(
                "mt-6 sm:mt-10 h-12 sm:h-14 w-full rounded-xl font-black text-[11px] sm:text-[12px] uppercase tracking-[0.15em] sm:tracking-[0.2em] shadow-sm transition-all active:scale-95",
                canActivate ? "bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-black dark:hover:bg-stone-200 border-none" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)] pointer-events-none"
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
              <p className="text-center text-[9px] sm:text-[10px] font-bold text-violet-500 uppercase tracking-widest mt-4">
                 Mandatory: Accept creator guidelines to unlock distribution nodes.
              </p>
           )}
        </GlassCard>
      </div>
    </div>
  );
}
