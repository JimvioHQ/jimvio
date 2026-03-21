"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, ArrowLeft, CheckCircle, Mail, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function ActivateAffiliatePage() {
  const router = useRouter();
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
      router.refresh();
      router.push("/dashboard/links");
    }
    setActivating(false);
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-[var(--color-surface-secondary)] to-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/20 flex items-center justify-center">
            <Link2 className="h-5 w-5 text-[var(--color-accent)] animate-pulse" />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (affiliate) {
    router.replace("/dashboard/links");
    return null;
  }

  const canActivate = emailVerified;

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
                <Link2 className="h-5 w-5" />
              </span>
              Become an Affiliate
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1.5 text-base">
              Earn commission by promoting products from vendors.
            </p>
          </div>
        </div>

        <Card className="border-[var(--color-border)] shadow-[var(--shadow-md)] rounded-2xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Requirements</p>
            <ul className="space-y-3">
              <li className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                emailVerified ? "bg-[var(--color-success-light)]/30 border-[var(--color-success)]/30" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
              )}>
                {emailVerified ? <CheckCircle className="h-5 w-5 text-[var(--color-success)] shrink-0" /> : <Mail className="h-5 w-5 text-[var(--color-text-muted)] shrink-0" />}
                <span className={cn("text-sm", emailVerified ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}>
                  Email verified
                </span>
              </li>
              <li className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                hasPaymentMethod ? "bg-[var(--color-success-light)]/30 border-[var(--color-success)]/30" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
              )}>
                {hasPaymentMethod ? <CheckCircle className="h-5 w-5 text-[var(--color-success)] shrink-0" /> : <CreditCard className="h-5 w-5 text-[var(--color-text-muted)] shrink-0" />}
                <span className={cn("text-sm", hasPaymentMethod ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}>
                  Payment method added
                </span>
                {!hasPaymentMethod && (
                  <span className="text-xs text-[var(--color-text-muted)] ml-auto">You can add this in Payouts after activation</span>
                )}
              </li>
            </ul>
            <p className="text-xs text-[var(--color-text-muted)] mt-4">
              After activation you can access affiliate tools: generate links, track clicks, and request payouts once you add a payment method.
            </p>
            <Button
              className="mt-6 rounded-xl w-full sm:w-auto min-w-[200px]"
              size="lg"
              onClick={handleActivate}
              disabled={!canActivate || activating}
            >
              {activating ? "Activating…" : "Activate Affiliate Role"}
            </Button>
            {!canActivate && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Verify your email to activate.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
