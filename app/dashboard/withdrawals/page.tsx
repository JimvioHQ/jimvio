"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, ArrowDownRight, CreditCard, Banknote, History, Clock, CheckCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { id: "bank", label: "Bank Transfer", desc: "2–3 business days", icon: CreditCard },
  { id: "mobile_money", label: "Mobile Money", desc: "MTN MoMo, Airtel, etc.", icon: Smartphone },
  { id: "paypal", label: "PayPal", desc: "PayPal email", icon: Banknote },
] as const;

export default function AffiliateWithdrawalsPage() {
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
      toast.error(`Minimum payout is RWF ${minPayout.toLocaleString()}.`);
      return;
    }
    if (amount > balance.available) {
      toast.error("Amount exceeds available balance.");
      return;
    }
    if (!payoutAccount.trim()) {
      toast.error("Add and save your payout account first.");
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
    toast.success("Payout requested. We'll process it within 2–3 business days.");
    setRequestAmount("");
    setSubmitting(false);
    router.refresh();
    const { data: payoutsData } = await supabase.from("payouts").select("id, amount, status, payout_method, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    setPayouts(payoutsData ?? []);
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-sm text-[var(--color-text-muted)]">Loading…</p></div>;
  }

  const canRequest = balance.available >= minPayout && payoutAccount.trim();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Payouts</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Withdraw your affiliate earnings. Minimum payout: RWF {minPayout.toLocaleString()}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden border-[var(--color-border)]">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Available Balance</span>
                <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">{formatCurrency(balance.available)}</h2>
                <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-amber-500" /> {formatCurrency(balance.pending)} Pending</span>
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> {formatCurrency(balance.paid)} Paid</span>
                </div>
              </div>
              <div className="space-y-3 w-full md:max-w-[280px]">
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Request amount (RWF)</label>
                <Input type="number" min={minPayout} step="0.01" value={requestAmount} onChange={e => setRequestAmount(e.target.value)} placeholder={`Min RWF ${minPayout}`} className="rounded-xl" />
                <Button className="w-full rounded-xl touch-manipulation min-h-[44px]" disabled={!canRequest || submitting} onClick={requestPayout}>
                  <ArrowDownRight className="h-4 w-4 mr-2" /> Request Payout
                </Button>
                {balance.available > 0 && balance.available < minPayout && (
                  <p className="text-xs text-amber-600">Reach RWF {minPayout.toLocaleString()} to request a payout.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pt-5 px-5 pb-0"><CardTitle className="text-sm">Payment method</CardTitle></CardHeader>
          <CardContent className="p-5 space-y-4">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPayoutMethod(m.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${payoutMethod === m.id ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]" : "border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"}`}
                >
                  <Icon className="h-5 w-5 text-[var(--color-accent)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{m.label}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{m.desc}</p>
                  </div>
                </button>
              );
            })}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1.5">
                {payoutMethod === "bank" ? "Account number / IBAN" : payoutMethod === "paypal" ? "PayPal email" : "Phone number"}
              </label>
              <Input value={payoutAccount} onChange={e => setPayoutAccount(e.target.value)} placeholder={payoutMethod === "paypal" ? "email@example.com" : "+250 700 000 000"} className="rounded-xl" />
              <Button variant="outline" size="sm" className="mt-2 rounded-xl" onClick={savePayoutMethod}>Save</Button>
            </div>
            <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">Minimum payout</span>
                <span className="font-semibold">RWF {minPayout.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pt-4 px-5 pb-3"><CardTitle className="text-md flex items-center gap-2"><History className="h-4 w-4" /> Payout history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="table-base min-w-[400px]">
              <thead>
                <tr>
                  <th className="pl-5">Date</th>
                  <th>Method</th>
                  <th className="text-right">Amount</th>
                  <th className="pr-5">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-[var(--color-text-muted)]">No payouts yet.</td>
                  </tr>
                ) : payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="pl-5 text-sm">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="capitalize text-sm">{String(p.payout_method || "—").replace(/_/g, " ")}</td>
                    <td className="text-right font-medium">{formatCurrency(Number(p.amount ?? 0))}</td>
                    <td className="pr-5">
                      <Badge variant={p.status === "paid" ? "success" : p.status === "failed" ? "destructive" : "warning"} className="text-[10px] py-0">{p.status || "pending"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
