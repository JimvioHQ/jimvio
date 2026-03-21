"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DollarSign, Eye, ShoppingCart, Wallet, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function CreatorEarningsPage() {
  const router = useRouter();
  const [influencer, setInfluencer] = useState<Record<string, unknown> | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: inf } = await supabase.from("influencers").select("*").eq("user_id", user.id).maybeSingle();
      if (!inf) {
        router.replace("/dashboard/activate/creator");
        setLoading(false);
        return;
      }
      setInfluencer(inf as Record<string, unknown>);
      const { data: payoutsData } = await supabase.from("payouts").select("id, amount, status, payout_method, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      setPayouts(payoutsData ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  const totalEarnings = Number(influencer?.total_earnings ?? 0);
  const available = Number(influencer?.available_balance ?? 0);
  const pending = 0;
  const paid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Creator Earnings</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Earnings from product sales, views, and payouts.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/withdrawals"><Wallet className="h-4 w-4 mr-1.5" /> Request Payout</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Earnings from sales" value={formatCurrency(totalEarnings)} icon={<ShoppingCart className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
        <StatCard title="Earnings from views" value={formatCurrency(0)} icon={<Eye className="h-4 w-4" />} iconColor="from-cyan-600 to-blue-600" />
        <StatCard title="Pending / Available" value={formatCurrency(available)} icon={<DollarSign className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
        <StatCard title="Paid out" value={formatCurrency(paid)} icon={<ArrowRight className="h-4 w-4" />} iconColor="from-purple-600 to-pink-600" />
      </div>

      <Card className="border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 py-4 px-5">
          <CardTitle className="text-base font-semibold">Payout history</CardTitle>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Withdrawal requests and status.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <th className="text-left font-medium text-[var(--color-text-muted)] py-3.5 pl-5 pr-3">Date</th>
                  <th className="text-left font-medium text-[var(--color-text-muted)] py-3.5 px-3">Method</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 px-3">Amount</th>
                  <th className="text-center font-medium text-[var(--color-text-muted)] py-3.5 pl-3 pr-5 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-[var(--color-text-muted)]">
                      No payouts yet. <Link href="/dashboard/withdrawals" className="text-[var(--color-accent)] hover:underline">Request a payout</Link> when you have available balance.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-secondary)]/50">
                      <td className="py-3.5 pl-5 pr-3">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 px-3 capitalize">{String(p.payout_method || "—").replace(/_/g, " ")}</td>
                      <td className="py-3.5 px-3 text-right font-medium tabular-nums">{formatCurrency(Number(p.amount ?? 0))}</td>
                      <td className="py-3.5 pl-3 pr-5 text-center">
                        <Badge variant={p.status === "paid" ? "success" : p.status === "failed" ? "destructive" : "warning"} className="text-[10px] py-0.5">{p.status || "pending"}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
