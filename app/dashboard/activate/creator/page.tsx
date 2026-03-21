"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Video, ArrowLeft, CheckCircle, User, Share2, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function ActivateCreatorPage() {
  const router = useRouter();
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
      router.refresh();
      router.push("/dashboard/influencer");
    }
    setActivating(false);
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-[var(--color-surface-secondary)] to-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/20 flex items-center justify-center">
            <Video className="h-5 w-5 text-[var(--color-accent)] animate-pulse" />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (influencer) {
    router.replace("/dashboard/influencer");
    return null;
  }

  const canActivate = agreedToGuidelines;

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-[var(--color-surface-secondary)] to-[var(--color-bg)]">
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-start gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5 rounded-full hover:bg-white/80">
            <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight flex items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/25">
                <Video className="h-5 w-5" />
              </span>
              Become a Creator
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1.5 text-base">
              Promote products using short video clips and earn from views and product sales.
            </p>
          </div>
        </div>

        <Card className="border-[var(--color-border)] shadow-[var(--shadow-md)] rounded-2xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Requirements</p>
            <ul className="space-y-3">
              <li className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                profileComplete ? "bg-[var(--color-success-light)]/30 border-[var(--color-success)]/30" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
              )}>
                {profileComplete ? <CheckCircle className="h-5 w-5 text-[var(--color-success)] shrink-0" /> : <User className="h-5 w-5 text-[var(--color-text-muted)] shrink-0" />}
                <span className={cn("text-sm", profileComplete ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}>
                  Profile completed
                </span>
                {!profileComplete && (
                  <span className="text-xs text-[var(--color-text-muted)] ml-auto">Add name in Profile settings</span>
                )}
              </li>
              <li className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                hasSocialAccount ? "bg-[var(--color-success-light)]/30 border-[var(--color-success)]/30" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
              )}>
                {hasSocialAccount ? <CheckCircle className="h-5 w-5 text-[var(--color-success)] shrink-0" /> : <Share2 className="h-5 w-5 text-[var(--color-text-muted)] shrink-0" />}
                <span className={cn("text-sm", hasSocialAccount ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}>
                  At least one social account connected
                </span>
                {!hasSocialAccount && (
                  <span className="text-xs text-[var(--color-text-muted)] ml-auto">You can add this in Creator Studio</span>
                )}
              </li>
              <li className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                agreedToGuidelines ? "bg-[var(--color-success-light)]/30 border-[var(--color-success)]/30" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
              )}>
                <button
                  type="button"
                  onClick={() => setAgreedToGuidelines(!agreedToGuidelines)}
                  className="flex items-center gap-3 w-full text-left"
                >
                  {agreedToGuidelines ? <CheckCircle className="h-5 w-5 text-[var(--color-success)] shrink-0" /> : <FileCheck className="h-5 w-5 text-[var(--color-text-muted)] shrink-0" />}
                  <span className={cn("text-sm", agreedToGuidelines ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}>
                    Agree to creator guidelines
                  </span>
                </button>
              </li>
            </ul>
            <p className="text-xs text-[var(--color-text-muted)] mt-4">
              After activation you can upload product clips, track views and engagement, and earn from sales and views.
            </p>
            <Button
              className="mt-6 rounded-xl w-full sm:w-auto min-w-[200px]"
              size="lg"
              onClick={handleActivate}
              disabled={!canActivate || activating}
            >
              {activating ? "Activating…" : "Activate Creator Role"}
            </Button>
            {!canActivate && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Please agree to the creator guidelines to activate.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
