
"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet, CreditCard, Banknote, History, Clock,
  CheckCircle, Smartphone, ArrowLeft, Loader2,
  AlertCircle, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FieldInput } from "@/components/ui/field-input";
import { Field } from "@/components/ui/field";

const PAYMENT_METHODS = [
  { id: "bank", label: "Bank Transfer", desc: "2–3 business days", icon: CreditCard },
  { id: "mobile_money", label: "Mobile Money", desc: "MTN MoMo · Airtel", icon: Smartphone },
  { id: "paypal", label: "PayPal", desc: "Send to email", icon: Banknote },
] as const;

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-500" },
  failed: { label: "Failed", className: "bg-rose-500/10 text-rose-500" },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

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

      const { data: feeRow } = await supabase
        .from("platform_settings").select("value").eq("key", "fees").maybeSingle();
      const rawMin = (feeRow?.value as { min_payout_rwf?: number } | null)?.min_payout_rwf;
      if (rawMin != null && Number.isFinite(Number(rawMin)) && Number(rawMin) > 0)
        setMinPayout(Number(rawMin));

      const affRes = await supabase
        .from("affiliates")
        .select("id, available_balance, pending_earnings, paid_earnings, payout_method, payout_account")
        .eq("user_id", user.id).maybeSingle();

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

      const { data: payoutsData } = await supabase
        .from("payouts")
        .select("id, amount, status, payout_method, created_at")
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
      toast.error(`Minimum withdrawal is ${formatMoney(minPayout, "USD")}.`); return;
    }
    if (amount > balance.available) {
      toast.error("Amount exceeds available balance."); return;
    }
    if (!payoutAccount.trim()) {
      toast.error("Please add and save your payout account first."); return;
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

    if (error) { toast.error(error.message); setSubmitting(false); return; }

    toast.success("Withdrawal requested successfully.");
    setRequestAmount("");
    setSubmitting(false);
    router.refresh();

    const { data: payoutsData } = await supabase
      .from("payouts")
      .select("id, amount, status, payout_method, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setPayouts(payoutsData ?? []);
  }

  /* ── Loading ──────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
        <p className="text-xs font-semibold text-[var(--color-text-muted)] tracking-widest uppercase">
          Loading…
        </p>
      </div>
    </div>
  );

  const amount = parseFloat(requestAmount) || 0;
  const canRequest = balance.available >= minPayout && !!payoutAccount.trim();
  const amountInvalid = !!requestAmount && (amount < minPayout || amount > balance.available);

  /* ── Page ─────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className={cn(
                "h-9 w-9 rounded-md flex items-center justify-center shrink-0 transition-all",
                "border border-[var(--color-border)] bg-[var(--color-surface)]",
                "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight leading-none">
                Withdraw Funds
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Manage your affiliate earnings
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Secure
          </div>
        </div>

        {/* ── Balance strip ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Available", value: balance.available, accent: true },
            { label: "Pending", value: balance.pending, accent: false },
            { label: "Total Paid", value: balance.paid, accent: false },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              className={cn(
                "rounded-md p-4 sm:p-5 border transition-colors",
                accent
                  ? "border-orange-500/20 bg-orange-500/5"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]"
              )}
            >
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                {label}
              </p>
              <p className={cn(
                "text-lg sm:text-2xl font-bold tabular-nums tracking-tight leading-none",
                accent ? "text-orange-500" : "text-[var(--color-text-primary)]"
              )}>
                {formatMoney(value, "USD")}
              </p>
            </div>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Withdrawal form — 3 cols ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Amount card */}
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
              <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-[var(--color-border)]">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">
                  Withdrawal Amount
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Minimum {formatMoney(minPayout, "USD")} · Available {formatMoney(balance.available, "USD")}
                </p>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                {/* Amount input */}
                <div className="relative">

                  <Field label="amount" icon={<span className="text-xl font-bold text-[var(--color-text-muted)] select-none pointer-events-none">
                    $
                  </span>}
                    error={amount < minPayout
                      ? `Minimum is ${formatMoney(minPayout, "USD")}`
                      : "Exceeds available balance"}
                  >
                    <FieldInput
                      type="number"
                      min={minPayout}
                      step="0.01"
                      value={requestAmount}
                      onChange={e => setRequestAmount(e.target.value)}
                      placeholder={`${minPayout}.00`}
                      className={cn(
                        "w-full h-14 pl-8 pr-4 rounded-sm border text-2xl font-bold tabular-nums",
                        "bg-[var(--color-surface)] text-[var(--color-text-primary)]",
                        "placeholder:text-[var(--color-text-muted)] placeholder:font-normal placeholder:text-base",
                        "outline-none transition-all duration-150"
                      )}
                      hasError={amountInvalid}
                    />
                  </Field>
                </div>

                {/* Quick-fill buttons */}
                <div className="flex gap-2">
                  {[25, 50, 100].map(pct => {
                    const val = Math.floor(balance.available * (pct / 100) * 100) / 100;
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setRequestAmount(String(val))}
                        disabled={balance.available === 0}
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
                    onClick={() => setRequestAmount(String(balance.available))}
                    disabled={balance.available === 0}
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

                <button
                  type="button"
                  disabled={!canRequest || submitting || amountInvalid || !requestAmount}
                  onClick={requestPayout}
                  className={cn(
                    "w-full h-11 rounded-sm text-sm font-semibold transition-all duration-150",
                    "bg-orange-500 text-white",
                    "hover:bg-orange-600 active:scale-[0.98]",
                    "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
                    "shadow-[0_4px_16px_rgba(249,115,22,0.25)]"
                  )}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing…
                    </span>
                  ) : "Confirm Withdrawal"}
                </button>

                {!payoutAccount.trim() && (
                  <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    Set a payout account before withdrawing
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Payout method — 2 cols ── */}
          <div className="lg:col-span-2">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden h-full flex flex-col">
              <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">
                  Payout Method
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Where you'll receive funds
                </p>
              </div>

              <div className="p-4 space-y-2 flex-1">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = payoutMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayoutMethod(m.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-sm border text-left transition-all duration-150",
                        active
                          ? "border-orange-500/30 bg-orange-500/5 text-orange-500"
                          : "border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)]"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-xs font-semibold leading-none truncate",
                          active ? "text-orange-600 dark:text-orange-400" : "text-[var(--color-text-primary)]"
                        )}>
                          {m.label}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">
                          {m.desc}
                        </p>
                      </div>
                      {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-orange-500" />}
                    </button>
                  );
                })}
              </div>

              {/* Account input */}
              <div className="p-4 border-t border-[var(--color-border)] space-y-3">
                <Field label={payoutMethod === "bank"
                  ? "Account Details"
                  : payoutMethod === "paypal"
                    ? "PayPal Email"
                    : "Phone Number"}>
                  <FieldInput
                    value={payoutAccount}
                    onChange={e => setPayoutAccount(e.target.value)}
                    placeholder={payoutMethod === "paypal" ? "your@email.com" : "+250 7xx xxx xxx"}
                    className="pl-3"
                  />
                </Field>


                <button
                  type="button"
                  onClick={savePayoutMethod}
                  className={cn(
                    "w-full h-9 rounded-lg text-xs font-semibold border transition-all duration-150",
                    "border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
                    "text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]",
                    "active:scale-[0.98]"
                  )}
                >
                  Save Method
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── History ── */}
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
            <History className="h-4 w-4 text-[var(--color-text-muted)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">
                Withdrawal History
              </h2>
            </div>
          </div>

          {payouts.length === 0 ? (
            <div className="py-16 text-center">
              <Wallet className="h-8 w-8 text-[var(--color-border)] mx-auto mb-3" />
              <p className="text-sm font-medium text-[var(--color-text-muted)]">
                No withdrawals yet
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 opacity-60">
                Your payout history will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {["Date", "Method", "Amount", "Status"].map((h, i) => (
                      <th
                        key={h}
                        className={cn(
                          "px-5 sm:px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
                          i >= 2 && "text-right",
                          i === 3 && "text-center"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {payouts.map((p) => {
                    const s = STATUS_MAP[p.status] ?? STATUS_MAP.pending;
                    return (
                      <tr key={p.id} className="hover:bg-[var(--color-surface-secondary)] transition-colors">
                        <td className="px-5 sm:px-6 py-4 text-sm text-[var(--color-text-muted)] tabular-nums whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString(undefined, {
                            year: "numeric", month: "short", day: "numeric"
                          })}
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-sm font-medium text-[var(--color-text-primary)] capitalize whitespace-nowrap">
                          {String(p.payout_method || "").replace(/_/g, " ")}
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-sm font-bold text-[var(--color-text-primary)] tabular-nums text-right whitespace-nowrap">
                          {formatMoney(Number(p.amount ?? 0), "USD")}
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide",
                            s.className
                          )}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}