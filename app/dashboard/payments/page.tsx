"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { DollarSign, ArrowDownRight, Clock, CheckCircle, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function PaymentsPage() {
  const [wallet, setWallet]     = useState<Record<string, unknown> | null>(null);
  const [payouts, setPayouts]   = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]   = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing]       = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [walletRes, payoutsRes] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", user.id).single(),
        supabase.from("payouts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setWallet(walletRes.data);
      setPayouts(payoutsRes.data ?? []);
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

    await supabase.from("payouts").insert({
      user_id:       user.id,
      type:          "vendor_withdrawal",
      amount,
      currency:      "RWF",
      status:        "pending",
      payout_method: vendor?.payout_method ?? "irembopay",
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

  const available = Number(wallet?.available_balance ?? 0);
  const pending   = Number(wallet?.pending_balance ?? 0);
  const earned    = Number(wallet?.total_earned ?? 0);
  const paid      = Number(wallet?.total_paid ?? 0);

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
            <p className="text-3xl font-bold">{loading ? "—" : formatCurrency(available)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/15">
            <Wallet className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending",     value: formatCurrency(pending) },
            { label: "Total Earned",value: formatCurrency(earned) },
            { label: "Total Paid",  value: formatCurrency(paid) },
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
              label="Amount to withdraw (RWF)"
              type="number"
              placeholder={`Max: ${formatCurrency(available)}`}
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
            Withdrawals are processed to your configured payout method (Irembopay/MoMo/Bank) within 1–2 business days.
            Minimum withdrawal: RWF 1,000.
          </p>
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
                      <td className="pl-5"><span className="text-sm font-bold text-[var(--color-text-primary)]">{formatCurrency(Number(p.amount))}</span></td>
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
