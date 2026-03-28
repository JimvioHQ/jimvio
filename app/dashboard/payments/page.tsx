"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { DollarSign, ArrowDownRight, Clock, CheckCircle, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { normalizeVendorPayoutMethod } from "@/lib/payout-method";

export default function PaymentsPage() {
  const { formatMoney } = useCurrency();
  const [wallet, setWallet]     = useState<Record<string, unknown> | null>(null);
  const [payouts, setPayouts]   = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]   = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing]       = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [vendorPayoutHint, setVendorPayoutHint] = useState<{ method: string; account: string } | null>(null);
  const [syncOrderId, setSyncOrderId] = useState("");
  const [syncingOrder, setSyncingOrder] = useState(false);
  const [syncOrderMsg, setSyncOrderMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [walletRes, payoutsRes, vendorRes] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", user.id).single(),
        supabase.from("payouts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("vendors").select("payout_method, payout_account").eq("user_id", user.id).maybeSingle(),
      ]);
      setWallet(walletRes.data);
      setPayouts(payoutsRes.data ?? []);
      if (vendorRes.data) {
        setVendorPayoutHint({
          method: String(vendorRes.data.payout_method ?? ""),
          account: String(vendorRes.data.payout_account ?? ""),
        });
      } else {
        setVendorPayoutHint(null);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function requestWithdrawal() {
    if (!wallet || !withdrawAmount) return;
    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > Number(wallet.available_balance ?? 0)) return;

    setWithdrawing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: vendor } = await supabase.from("vendors").select("payout_method, payout_account").eq("user_id", user.id).single();

    const cur = String((wallet as { currency?: string } | null)?.currency ?? "RWF");
    await supabase.from("payouts").insert({
      user_id:       user.id,
      type:          "vendor_withdrawal",
      amount,
      currency:      cur,
      status:        "pending",
      payout_method: normalizeVendorPayoutMethod(vendor?.payout_method as string | null | undefined),
      payout_account:vendor?.payout_account ?? "",
    });

    // Deduct from wallet (pending)
    await supabase.from("wallets").update({
      available_balance: Number(wallet.available_balance ?? 0) - amount,
      pending_balance:   Number(wallet.pending_balance ?? 0) + amount,
    }).eq("user_id", user.id);

    setWallet(prev => prev ? {
      ...prev,
      available_balance: Number(prev.available_balance ?? 0) - amount,
      pending_balance:   Number(prev.pending_balance ?? 0) + amount,
    } : prev);
    setWithdrawAmount("");
    setWithdrawSuccess(true);
    setWithdrawing(false);
    setTimeout(() => setWithdrawSuccess(false), 3000);
  }

  async function syncCreditsForOrder() {
    const id = syncOrderId.trim();
    if (!id) return;
    setSyncingOrder(true);
    setSyncOrderMsg(null);
    try {
      const res = await fetch("/api/vendor/wallet/sync-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) throw new Error(data.error || "Request failed");
      setSyncOrderMsg("Earnings synced. If the balance still looks wrong, refresh the page.");
      setSyncOrderId("");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: w } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
        setWallet(w);
      }
    } catch (e) {
      setSyncOrderMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setSyncingOrder(false);
    }
  }

  const available = Number(wallet?.available_balance ?? 0);
  const pending   = Number(wallet?.pending_balance ?? 0);
  const earned    = Number(wallet?.total_earned ?? 0);
  const paid      = Number(wallet?.total_paid ?? 0);
  const walletCurrency = String((wallet as { currency?: string } | null)?.currency ?? "RWF");

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Payments & Payouts</h1>
        <p className="text-sm text-muted-c mt-0.5">Manage your earnings and withdrawals</p>
      </div>

      {/* Wallet Overview */}
      <div className="rounded-xl p-5 bg-[var(--color-accent)] text-white shadow-[var(--shadow-md)]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm font-medium mb-1">Available Balance</p>
            <p className="text-3xl font-bold">{loading ? "—" : formatMoney(available, walletCurrency)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/15">
            <Wallet className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending",     value: formatMoney(pending, walletCurrency) },
            { label: "Total Earned",value: formatMoney(earned, walletCurrency) },
            { label: "Total Paid",  value: formatMoney(paid, walletCurrency) },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 rounded-lg p-2.5">
              <p className="text-white/80 text-xs mb-0.5">{s.label}</p>
              <p className="text-white font-semibold text-sm">{loading ? "—" : s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Withdraw */}
      <Card>
        <CardHeader className="pt-4 px-4 pb-3"><CardTitle>Withdraw Funds</CardTitle></CardHeader>
        <CardContent className="px-5 pb-5 pt-0 space-y-4">
          {withdrawSuccess && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Withdrawal requested!</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">Your payout will be processed within 1–2 business days.</p>
              </div>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <Input
              label={`Amount to withdraw (${walletCurrency})`}
              type="number"
              placeholder={`Max: ${formatMoney(available, walletCurrency)}`}
              min="1000"
              max={available}
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={requestWithdrawal}
              loading={withdrawing}
              disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > available}
            >
              <ArrowDownRight className="h-4 w-4" /> Withdraw
            </Button>
          </div>
          <p className="text-xs text-muted-c">
            Balances are in <strong>{walletCurrency}</strong>. Withdrawals are sent to your vendor payout account within 1–2 business days.
            Minimum withdrawal: RWF 1,000. Set payout method and account under{" "}
            <a href="/dashboard/settings" className="underline text-[var(--color-accent)]">Settings</a> or your vendor profile if payouts fail.
          </p>
          {vendorPayoutHint && !vendorPayoutHint.account?.trim() && (
            <p className="text-xs rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-100">
              Add a <strong>mobile number or bank account</strong> for payouts on your vendor record. Jimvio uses{" "}
              <code className="text-[11px]">vendors.payout_method</code> and <code className="text-[11px]">vendors.payout_account</code>{" "}
              when you request a withdrawal.
            </p>
          )}
          {vendorPayoutHint && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/80 px-3 py-3 space-y-2">
              <p className="text-xs text-muted-c">
                Paid orders missing from your balance? Paste the order UUID from Orders received (or Supabase) and apply credits once.
              </p>
              <div className="flex flex-wrap gap-2 items-end">
                <Input
                  label="Order ID"
                  value={syncOrderId}
                  onChange={(e) => setSyncOrderId(e.target.value)}
                  placeholder="Order UUID from vendor orders"
                  className="flex-1 min-w-[200px]"
                />
                <Button type="button" variant="secondary" loading={syncingOrder} onClick={syncCreditsForOrder}>
                  Sync earnings
                </Button>
              </div>
              {syncOrderMsg && <p className="text-xs text-[var(--color-text-primary)]">{syncOrderMsg}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader className="pt-4 px-4 pb-3"><CardTitle>Payout History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-c">Loading...</div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-12 text-muted-c">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-[var(--color-text-primary)] mb-1">No payouts yet</p>
              <p className="text-sm">Start selling to accumulate earnings, then withdraw.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="pl-5">Amount</th>
                    <th>Method</th>
                    <th>Account</th>
                    <th className="text-center">Status</th>
                    <th className="pr-5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id as string}>
                      <td className="pl-5">
                        <span className="text-sm font-bold text-[var(--color-text-primary)]">
                          {formatMoney(Number(p.amount), (p.currency as string) || walletCurrency)}
                        </span>
                      </td>
                      <td><span className="text-sm text-[var(--color-text-primary)] capitalize">{p.payout_method as string}</span></td>
                      <td><span className="text-sm text-muted-c">{p.payout_account as string ?? "—"}</span></td>
                      <td className="text-center">
                        <Badge variant={p.status === "paid" ? "success" : p.status === "pending" ? "warning" : "secondary"}>
                          {p.status === "pending" && <Clock      className="h-3 w-3 mr-0.5" />}
                          {p.status === "paid"    && <CheckCircle className="h-3 w-3 mr-0.5" />}
                          {(p.status as string).charAt(0).toUpperCase() + (p.status as string).slice(1)}
                        </Badge>
                      </td>
                      <td className="pr-5 text-sm text-muted-c">{new Date(p.created_at as string).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
