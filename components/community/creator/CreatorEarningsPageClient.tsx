"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDisplayMoney } from "@/lib/utils";

type PaymentRow = {
  id: string;
  community_id: string;
  user_id: string;
  amount: number | string | null;
  currency: string | null;
  plan_type: string;
  platform_commission: number | string | null;
  creator_earnings: number | string | null;
  status: string;
  created_at: string;
  profiles?: { full_name: string | null; username: string | null } | null;
};

type WalletRow = {
  available_balance: number | string | null;
  pending_balance: number | string | null;
  total_earned: number | string | null;
  total_paid: number | string | null;
  currency?: string | null;
};

const PAYOUT_FEE = 0.02;
const MIN_PAYOUT = 10;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function CreatorEarningsPageClient({
  communityId,
  communityName,
  displayCurrency,
}: {
  communityId: string;
  communityName: string;
  displayCurrency: string;
}) {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<
    { id: string; amount: number | string | null; status: string | null; payout_method: string | null; created_at: string }[]
  >([]);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MTN");
  const [account, setAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [apiRes, payRows, payoutsQ] = await Promise.all([
        fetch("/api/creator/earnings", { cache: "no-store" }),
        supabase
          .from("community_payments")
          .select(
            "id, community_id, user_id, amount, currency, plan_type, platform_commission, creator_earnings, status, created_at, profiles(full_name, username)"
          )
          .eq("community_id", communityId)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("payouts").select("id, amount, status, payout_method, created_at").order("created_at", { ascending: false }).limit(30),
      ]);

      const j = await apiRes.json();
      if (!apiRes.ok) {
        setWallet(null);
      } else {
        setWallet(j.wallet ?? null);
      }

      const { data: payData, error: payErr } = payRows;
      if (!payErr && payData) {
        setPayments(payData as unknown as PaymentRow[]);
      } else {
        setPayments([]);
      }

      const { data: poData } = payoutsQ;
      setPayoutHistory((poData as typeof payoutHistory) ?? []);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const rows = payments;
    const lifetime = rows.reduce((s, p) => s + Number(p.creator_earnings ?? 0), 0);
    const ms = startOfMonth(new Date());
    const thisMonth = rows.filter((p) => p.created_at && new Date(p.created_at) >= ms).reduce((s, p) => s + Number(p.creator_earnings ?? 0), 0);
    return { lifetime, thisMonth };
  }, [payments]);

  const walletCurrency = (wallet?.currency as string | undefined) || displayCurrency;

  const available = Number(wallet?.available_balance ?? 0);
  const pendingBal = Number(wallet?.pending_balance ?? 0);

  const chartData = useMemo(() => {
    const now = new Date();
    const out: { label: string; monthly: number; yearly: number; lifetime: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = monthKey(d);
      const label = d.toLocaleString(undefined, { month: "short", year: "2-digit" });
      let monthly = 0;
      let yearly = 0;
      let lifetime = 0;
      for (const p of payments) {
        if (!p.created_at) continue;
        if (monthKey(new Date(p.created_at)) !== mk) continue;
        const v = Number(p.creator_earnings ?? 0);
        const pt = (p.plan_type || "").toLowerCase();
        if (pt === "monthly") monthly += v;
        else if (pt === "yearly") yearly += v;
        else if (pt === "lifetime") lifetime += v;
        else yearly += v;
      }
      out.push({ label, monthly, yearly, lifetime });
    }
    return out;
  }, [payments]);

  const numAmount = Number(amount);
  const netPreview = Number.isFinite(numAmount) && numAmount > 0 ? numAmount * (1 - PAYOUT_FEE) : 0;

  async function requestPayout() {
    setPayoutError(null);
    if (!Number.isFinite(numAmount) || numAmount < MIN_PAYOUT) {
      setPayoutError(`Minimum payout is ${formatDisplayMoney(MIN_PAYOUT, walletCurrency)}`);
      return;
    }
    if (!method.trim() || !account.trim()) {
      setPayoutError("Method and account are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/payout/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          payoutMethod: method.trim(),
          payoutAccount: account.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayoutError(typeof body.error === "string" ? body.error : "Request failed");
        return;
      }
      setAmount("");
      setAccount("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Earnings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Revenue and payouts for <span className="font-bold text-[var(--color-text-secondary)]">{communityName}</span>
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total earned (this community)", value: formatDisplayMoney(stats.lifetime, displayCurrency) },
          { label: "This month", value: formatDisplayMoney(stats.thisMonth, displayCurrency) },
          { label: "Available balance", value: formatDisplayMoney(available, walletCurrency) },
          { label: "Pending / held", value: formatDisplayMoney(pendingBal, walletCurrency) },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">{c.label}</p>
            <p className="text-xl font-black text-[var(--color-text-primary)] mt-1 tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-4">Revenue by plan (last 12 months)</h2>
        <div className="h-72 w-full">
          {chartData.every((d) => d.monthly + d.yearly + d.lifetime === 0) ? (
            <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
              No completed payments in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Bar dataKey="monthly" stackId="a" fill="var(--color-accent)" name="Monthly" />
                <Bar dataKey="yearly" stackId="a" fill="var(--color-success)" name="Yearly" />
                <Bar dataKey="lifetime" stackId="a" fill="var(--color-warning)" name="Lifetime" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-black text-[var(--color-text-primary)]">Subscriber payments</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Completed payments for this community.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 text-[10px] font-black uppercase text-[var(--color-text-muted)] text-left">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Member</th>
                <th className="py-2 px-3">Plan</th>
                <th className="py-2 px-3 text-right">Amount</th>
                <th className="py-2 px-3 text-right">Commission</th>
                <th className="py-2 px-3 text-right">Your earnings</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)]">
                    No payments yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                  const name = prof?.full_name?.trim() || prof?.username?.trim() || "Member";
                  const gross = Number(p.amount ?? 0);
                  const comm = Number(p.platform_commission ?? 0);
                  const earn = Number(p.creator_earnings ?? 0);
                  return (
                    <tr key={p.id} className="border-b border-[var(--color-border)]">
                      <td className="py-2 px-3 text-xs whitespace-nowrap">{p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</td>
                      <td className="py-2 px-3 font-semibold">{name}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[var(--color-surface-secondary)]">{p.plan_type}</span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatDisplayMoney(gross, p.currency || displayCurrency)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-[var(--color-text-muted)]">{formatDisplayMoney(comm, p.currency || displayCurrency)}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold text-[var(--color-success)]">{formatDisplayMoney(earn, p.currency || displayCurrency)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-black text-[var(--color-text-primary)]">Request payout</h2>
        <p className="text-xs text-[var(--color-text-muted)]">
          Uses your platform wallet. Jimvio applies a 2% processing fee on payouts. You need a vendor account for this endpoint; otherwise the server returns 403.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <div>
            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)]">Amount (min {MIN_PAYOUT})</label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={MIN_PAYOUT} step="0.01" className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)]">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface)]"
            >
              <option value="MTN">MTN</option>
              <option value="Bank">Bank</option>
              <option value="Crypto">Crypto</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)]">Account / details</label>
            <Input value={account} onChange={(e) => setAccount(e.target.value)} className="rounded-xl mt-1" placeholder="Phone, IBAN, or wallet address" />
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Net after 2% fee:{" "}
          <span className="font-black tabular-nums text-[var(--color-text-primary)]">{formatDisplayMoney(netPreview, walletCurrency)}</span>
        </p>
        {payoutError && <p className="text-sm text-[var(--color-danger)] font-semibold">{payoutError}</p>}
        <Button
          type="button"
          className={cn("rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black")}
          disabled={submitting}
          onClick={requestPayout}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request payout"}
        </Button>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-black text-[var(--color-text-primary)]">Payout history</h2>
          <p className="text-xs text-[var(--color-text-muted)]">Your recent payout requests (all sources).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 text-[10px] font-black uppercase text-[var(--color-text-muted)] text-left">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Method</th>
                <th className="py-2 px-3 text-right">Amount</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {payoutHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[var(--color-text-muted)]">
                    No payouts yet.
                  </td>
                </tr>
              ) : (
                payoutHistory.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)]">
                    <td className="py-2 px-3 whitespace-nowrap">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3 capitalize">{String(p.payout_method || "—").replace(/_/g, " ")}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold">{formatDisplayMoney(Number(p.amount ?? 0), walletCurrency)}</td>
                    <td className="py-2 px-3">
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                          p.status === "paid"
                            ? "bg-[var(--color-success-light)] text-[var(--color-success)]"
                            : p.status === "failed"
                              ? "bg-[var(--color-danger-light)] text-[var(--color-danger)]"
                              : "bg-[var(--color-warning-light)] text-[var(--color-warning)]"
                        )}
                      >
                        {p.status || "pending"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
