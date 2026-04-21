"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type Profile = { full_name: string | null; email: string | null; phone: string | null } | null;

export type AdminPayoutRow = {
  id: string;
  user_id: string;
  created_at: string;
  processed_at: string | null;
  amount: number | string | null;
  fee: number | string | null;
  net_amount: number | string | null;
  currency: string | null;
  status: string | null;
  payout_method: string | null;
  payout_account: string | null;
  provider_reference: string | null;
  profiles: Profile;
};

type Tab = "pending" | "processing" | "paid" | "failed";

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function maskAccount(s: string | null): string {
  if (!s || s.length < 5) return "â€¢â€¢â€¢â€¢";
  return `â€¢â€¢â€¢â€¢${s.slice(-4)}`;
}

function methodLabel(id: string | null): string {
  switch (id) {
    case "mtn":
    case "mtn_momo":
      return "MTN Mobile Money";
    case "bank_transfer":
    case "bank":
      return "Bank Transfer";
    case "crypto":
      return "Crypto";
    default:
      if (!id) return "â€”";
      return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function statusVariant(s: string | null): "success" | "warning" | "default" | "destructive" {
  switch (s) {
    case "paid":
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

export function AdminPayoutsDashboard() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<AdminPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pendingStats, setPendingStats] = useState<{ count: number; amount: number }>({ count: 0, amount: 0 });
  const [paidMonth, setPaidMonth] = useState(0);
  const [paidLife, setPaidLife] = useState(0);

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [active, setActive] = useState<AdminPayoutRow | null>(null);
  const [providerRef, setProviderRef] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  const loadTab = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payouts?status=${encodeURIComponent(t)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.payouts ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [pRes, paidRes] = await Promise.all([
        fetch("/api/admin/payouts?status=pending"),
        fetch("/api/admin/payouts?status=paid"),
      ]);
      const pJson = await pRes.json();
      const paidJson = await paidRes.json();
      if (!pRes.ok) throw new Error(pJson.error);
      if (!paidRes.ok) throw new Error(paidJson.error);
      const pendingList = (pJson.payouts ?? []) as AdminPayoutRow[];
      const paidList = (paidJson.payouts ?? []) as AdminPayoutRow[];
      const pSum = pendingList.reduce((s, x) => s + num(x.amount), 0);
      setPendingStats({ count: pendingList.length, amount: pSum });

      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const monthSum = paidList
        .filter((x) => {
          const t = (x.processed_at ? new Date(x.processed_at) : new Date(x.created_at)).getTime();
          return t >= startMonth;
        })
        .reduce((s, x) => s + num(x.amount), 0);
      setPaidMonth(monthSum);
      const life = paidList.reduce((s, x) => s + num(x.amount), 0);
      setPaidLife(life);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stats failed");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTab(tab);
  }, [tab, loadTab]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const currency = useMemo(() => rows[0]?.currency || "USD", [rows]);

  async function patch(action: "approve" | "reject") {
    if (!active) return;
    setActing(true);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutId: active.id,
          action,
          providerReference: action === "approve" ? providerRef.trim() || null : undefined,
          rejectReason: action === "reject" ? rejectReason.trim() || null : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(action === "approve" ? "Payout marked as paid" : "Payout rejected");
      setApproveOpen(false);
      setRejectOpen(false);
      setActive(null);
      setProviderRef("");
      setRejectReason("");
      await loadTab(tab);
      await loadStats();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Vendor Payouts</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Review and process vendor withdrawal requests</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-[var(--color-text-secondary)]">Pending payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 w-24 bg-[var(--color-surface-secondary)] rounded animate-pulse" />
            ) : (
              <>
                <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">
                  {pendingStats.count} Â· {formatCurrency(pendingStats.amount, currency)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-[var(--color-text-secondary)]">Paid this month</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 w-24 bg-[var(--color-surface-secondary)] rounded animate-pulse" />
            ) : (
              <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">
                {formatCurrency(paidMonth, currency)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-[var(--color-text-secondary)]">Paid lifetime</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 w-24 bg-[var(--color-surface-secondary)] rounded animate-pulse" />
            ) : (
              <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">
                {formatCurrency(paidLife, currency)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "processing", "paid", "failed"] as Tab[]).map((t) => (
          <Button
            key={t}
            type="button"
            variant={tab === t ? "default" : "outline"}
            size="sm"
            className="capitalize"
            onClick={() => setTab(t)}
          >
            {t === "paid" ? "Completed" : t}
          </Button>
        ))}
      </div>

      <Card className="border-[var(--color-border)] overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--color-text-muted)]">No payouts in this tab</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                    <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Vendor</th>
                    <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Date</th>
                    <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Amount</th>
                    <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Fee</th>
                    <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Net</th>
                    <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Method</th>
                    <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Account</th>
                    <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Status</th>
                    <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const name = p.profiles?.full_name || "â€”";
                    const email = p.profiles?.email || "â€”";
                    const canAct = p.status === "pending";
                    return (
                      <tr key={p.id} className="border-b border-[var(--color-border)]">
                        <td className="p-3">
                          <div className="font-medium text-[var(--color-text-primary)]">{name}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">{email}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap text-[var(--color-text-secondary)]">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(num(p.amount), p.currency || currency)}</td>
                        <td className="p-3 text-right tabular-nums text-[var(--color-text-muted)]">
                          {formatCurrency(num(p.fee), p.currency || currency)}
                        </td>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(num(p.net_amount), p.currency || currency)}</td>
                        <td className="p-3">{methodLabel(p.payout_method)}</td>
                        <td className="p-3 font-mono text-xs">{maskAccount(p.payout_account)}</td>
                        <td className="p-3">
                          <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                        </td>
                        <td className="p-3 text-right">
                          {canAct ? (
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-[var(--color-success)] hover:bg-[var(--color-success)]/90"
                                onClick={() => {
                                  setActive(p);
                                  setProviderRef("");
                                  setApproveOpen(true);
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setActive(p);
                                  setRejectReason("");
                                  setRejectOpen(true);
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : p.status === "paid" && p.provider_reference ? (
                            <span className="text-xs text-[var(--color-text-muted)]">{p.provider_reference}</span>
                          ) : (
                            "â€”"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <DialogHeader>
            <DialogTitle>Confirm payment</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-[var(--color-text-muted)]">Vendor: </span>
                <span className="font-medium">{active.profiles?.full_name}</span>
              </p>
              <p>
                <span className="text-[var(--color-text-muted)]">Amount to pay: </span>
                <span className="font-bold tabular-nums">{formatCurrency(num(active.amount), active.currency || currency)}</span>
              </p>
              <p>
                <span className="text-[var(--color-text-muted)]">Method: </span>
                {methodLabel(active.payout_method)}
              </p>
              <p>
                <span className="text-[var(--color-text-muted)]">Account: </span>
                <span className="font-mono">{active.payout_account}</span>
              </p>
              <div>
                <Label className="text-xs">Provider reference (optional)</Label>
                <Input value={providerRef} onChange={(e) => setProviderRef(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void patch("approve")} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <DialogHeader>
            <DialogTitle>Reject payout</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-danger)]">Balance will be returned to the vendor.</p>
          <div>
            <Label className="text-xs">Reason (optional)</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="mt-1" />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void patch("reject")} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
