"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HelpCircle, Loader2, Smartphone, Building2, Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type WalletRow = {
  available_balance: number | string | null;
  pending_balance: number | string | null;
  total_earned: number | string | null;
  total_paid: number | string | null;
  currency: string | null;
};

type TxRow = {
  id: string;
  created_at: string;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  order_id: string | null;
  order_number: string | null;
  metadata: Record<string, unknown> | null;
};

type PayoutRow = {
  id: string;
  created_at: string;
  amount: number | string | null;
  fee: number | string | null;
  net_amount: number | string | null;
  currency: string | null;
  status: string | null;
  payout_method: string | null;
  payout_account: string | null;
};

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const PAGE_SIZE = 20;

const METHOD_OPTIONS = [
  { id: "mtn_momo", label: "MTN Mobile Money", icon: Smartphone },
  { id: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { id: "crypto", label: "Crypto", icon: Bitcoin },
] as const;

export function VendorEarningsDashboard() {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [currency, setCurrency] = useState("USD");

  const [payoutOpen, setPayoutOpen] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [method, setMethod] = useState<(typeof METHOD_OPTIONS)[number]["id"]>("mtn_momo");
  const [account, setAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [earnPage, setEarnPage] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vendor/wallet");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setWallet(data.wallet ?? null);
      setTransactions(data.transactions ?? []);
      setPayouts(data.payouts ?? []);
      setCurrency(data.wallet?.currency || "USD");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const available = num(wallet?.available_balance);
  const pending = num(wallet?.pending_balance);
  const totalEarned = num(wallet?.total_earned);
  const totalPaid = num(wallet?.total_paid);

  const feeRate = 0.02;
  const amountNum = Math.min(available, Math.max(0, parseFloat(amountStr) || 0));
  const fee = amountNum * feeRate;
  const net = amountNum - fee;

  const paginatedEarnings = useMemo(() => {
    const start = earnPage * PAGE_SIZE;
    return transactions.slice(start, start + PAGE_SIZE);
  }, [transactions, earnPage]);

  const earnPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));

  async function submitPayout() {
    const amt = parseFloat(amountStr);
    if (!Number.isFinite(amt) || amt < 10) {
      toast.error("Minimum payout is 10.00");
      return;
    }
    if (amt > available) {
      toast.error("Amount exceeds available balance");
      return;
    }
    if (!account.trim()) {
      toast.error("Account number or wallet address is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/payout/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          payoutMethod: method,
          payoutAccount: account.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      toast.success("Payout requested");
      setPayoutOpen(false);
      setAmountStr("");
      setAccount("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  function methodLabel(id: string | null): string {
    const m = METHOD_OPTIONS.find((o) => o.id === id);
    if (m) return m.label;
    if (!id) return "";
    return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function payoutStatusVariant(s: string | null): "success" | "warning" | "default" | "destructive" {
    switch (s) {
      case "paid":
      case "completed":
        return "success";
      case "pending":
      case "processing":
        return "warning";
      case "failed":
        return "destructive";
      default:
        return "default";
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1100px] mx-auto">
        <div className="h-8 w-48 bg-[var(--color-surface-secondary)] rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-none bg-[var(--color-surface-secondary)] animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-none bg-[var(--color-surface-secondary)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1100px] mx-auto px-4 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">My Earnings</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Track your sales, pending balance, and payout history
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">Available Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold text-[var(--color-success)] tabular-nums">
              {formatCurrency(available, currency)}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">Ready to withdraw</p>
            <Button className="w-full" onClick={() => setPayoutOpen(true)} disabled={available < 10}>
              Request Payout
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">Pending Balance</CardTitle>
            <span title="Released when orders are shipped" className="text-[var(--color-text-muted)]">
              <HelpCircle className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--color-warning)] tabular-nums">
              {formatCurrency(pending, currency)}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">Awaiting order fulfillment</p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Released when orders are shipped</p>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">
              {formatCurrency(totalEarned, currency)}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">All time</p>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">Total Paid Out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">
              {formatCurrency(totalPaid, currency)}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">Withdrawn so far</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="sm:max-w-md border-[var(--color-border)] bg-[var(--color-surface)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-text-primary)]">Request payout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-[var(--color-text-secondary)]">Amount (min {formatCurrency(10, currency)})</Label>
              <Input
                type="number"
                step="0.01"
                min={10}
                max={available}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">Payout method</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {METHOD_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = method === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMethod(opt.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-none border p-3 text-center text-xs font-medium transition-colors",
                        active
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-text-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-[var(--color-text-secondary)]">Account number / wallet address</Label>
              <Input value={account} onChange={(e) => setAccount(e.target.value)} className="mt-1" />
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">2% processing fee applies</p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              You will receive: {formatCurrency(net, currency)}
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setPayoutOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitPayout()} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Request Payout
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Recent Earnings</h2>
        <Card className="border-[var(--color-border)] overflow-hidden">
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--color-text-muted)]">No earnings yet. Start selling!</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                        <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Date</th>
                        <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Order</th>
                        <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Products</th>
                        <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Gross</th>
                        <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Commission</th>
                        <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Your earnings</th>
                        <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEarnings.map((t) => {
                        const meta = (t.metadata ?? {}) as {
                          vendor_total?: number;
                          commission_rate?: number;
                          commission_amount?: number;
                          line_count?: number;
                        };
                        const gross = meta.vendor_total ?? 0;
                        const rate = meta.commission_rate ?? 8;
                        const comm = meta.commission_amount ?? gross * (rate / 100);
                        const lines = meta.line_count ?? 0;
                        const st = t.status === "completed" ? "completed" : "pending";
                        return (
                          <tr key={t.id} className="border-b border-[var(--color-border)]">
                            <td className="p-3 text-[var(--color-text-secondary)] whitespace-nowrap">
                              {new Date(t.created_at).toLocaleString()}
                            </td>
                            <td className="p-3">
                              {t.order_id && t.order_number ? (
                                <Link
                                  href={`/dashboard/vendor/orders/${t.order_id}`}
                                  className="text-[var(--color-accent)] font-medium hover:underline"
                                >
                                  {t.order_number}
                                </Link>
                              ) : (
                                ""
                              )}
                            </td>
                            <td className="p-3 text-right tabular-nums">{lines}</td>
                            <td className="p-3 text-right tabular-nums">{formatCurrency(gross, t.currency || currency)}</td>
                            <td className="p-3 text-right tabular-nums text-[var(--color-text-muted)]">
                              {formatCurrency(comm, t.currency || currency)} ({rate}%)
                            </td>
                            <td className="p-3 text-right font-medium text-[var(--color-success)] tabular-nums">
                              {formatCurrency(num(t.amount), t.currency || currency)}
                            </td>
                            <td className="p-3">
                              <Badge variant={st === "completed" ? "success" : "warning"}>{st}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {earnPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                    <span>
                      Page {earnPage + 1} of {earnPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={earnPage === 0}
                        onClick={() => setEarnPage((p) => Math.max(0, p - 1))}
                      >
                        Prev
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={earnPage >= earnPages - 1}
                        onClick={() => setEarnPage((p) => Math.min(earnPages - 1, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Payout History</h2>
        <Card className="border-[var(--color-border)] overflow-hidden">
          <CardContent className="p-0">
            {payouts.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--color-text-muted)]">No payouts requested yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                      <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Date</th>
                      <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Amount</th>
                      <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Fee</th>
                      <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Net</th>
                      <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Method</th>
                      <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id} className="border-b border-[var(--color-border)]">
                        <td className="p-3 whitespace-nowrap text-[var(--color-text-secondary)]">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(num(p.amount), p.currency || currency)}</td>
                        <td className="p-3 text-right tabular-nums text-[var(--color-text-muted)]">
                          {formatCurrency(num(p.fee), p.currency || currency)}
                        </td>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(num(p.net_amount), p.currency || currency)}</td>
                        <td className="p-3">{methodLabel(p.payout_method)}</td>
                        <td className="p-3">
                          <Badge variant={payoutStatusVariant(p.status)}>{p.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

