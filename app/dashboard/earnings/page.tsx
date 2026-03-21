"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DollarSign, ArrowUpRight, Clock, CheckCircle, Filter, Download, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function AffiliateEarningsPage() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [stats, setStats]       = useState({ total: 0, available: 0, pending: 0, paid: 0 });
  const [loading, setLoading]   = useState(true);
  const [hasAffiliate, setHasAffiliate] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [affRes, commissionsRes, payoutsRes] = await Promise.all([
        supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("affiliate_commissions")
          .select("*, orders(order_number, total_amount, created_at)")
          .order("created_at", { ascending: false }),
        supabase.from("payouts").select("id, amount, status, payout_method, created_at, processed_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50)
      ]);

      if (affRes.data) {
        const aff = affRes.data as Record<string, unknown>;
        setHasAffiliate(true);
        setStats({
          total: Number(aff.total_earnings ?? 0),
          available: Number(aff.available_balance ?? 0),
          pending: Number(aff.pending_earnings ?? 0),
          paid: Number(aff.paid_earnings ?? 0),
        });
      } else {
        setHasAffiliate(false);
      }

      setEarnings(commissionsRes.data || []);
      setPayouts(payoutsRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!loading && hasAffiliate === false) router.replace("/dashboard/activate/affiliate");
  }, [loading, hasAffiliate, router]);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Earnings & Commissions</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Track your referral income and payout status.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" /> Export</Button>
          <Button asChild size="sm"><Link href="/dashboard/withdrawals"><Wallet className="h-4 w-4 mr-1.5" /> Request Payout</Link></Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending earnings" value={formatCurrency(stats.pending)} icon={<Clock className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
        <StatCard title="Available" value={formatCurrency(stats.available)} icon={<CheckCircle className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
        <StatCard title="Paid" value={formatCurrency(stats.paid)} icon={<ArrowUpRight className="h-4 w-4" />} iconColor="from-purple-600 to-pink-600" />
        <StatCard title="Total earned" value={formatCurrency(stats.total)} icon={<DollarSign className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" />
      </div>

      <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <Button variant="secondary" size="sm" className="text-xs font-medium shrink-0">All time</Button>
        <Button variant="ghost" size="sm" className="text-xs font-medium shrink-0">This month</Button>
        <Button variant="ghost" size="sm" className="text-xs font-medium shrink-0">Pending</Button>
        <Button variant="ghost" size="sm" className="text-xs font-medium shrink-0">Paid</Button>
        <div className="ml-auto shrink-0">
          <Button variant="ghost" size="sm" className="text-xs font-medium gap-1.5"><Filter className="h-3.5 w-3.5" /> Filters</Button>
        </div>
      </div>

      <Card className="border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 py-4 px-5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[var(--color-accent)]" />
            Commission history
          </CardTitle>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Earnings from referrals. Payouts are listed below.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <th className="text-left font-medium text-[var(--color-text-muted)] py-3.5 pl-5 pr-3">Order</th>
                  <th className="text-left font-medium text-[var(--color-text-muted)] py-3.5 px-3">Date</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 px-3">Order amount</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 px-3">Commission</th>
                  <th className="text-center font-medium text-[var(--color-text-muted)] py-3.5 pl-3 pr-5 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array(5).fill(0).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                  : earnings.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="text-center py-14 px-5">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] mb-3"><DollarSign className="h-6 w-6" /></div>
                        <p className="font-medium text-[var(--color-text-primary)]">No commissions yet</p>
                        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Promote your links to start earning.</p>
                      </td>
                    </tr>
                  )
                  : earnings.map((e) => (
                    <tr key={e.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-secondary)]/50 transition-colors">
                      <td className="py-3.5 pl-5 pr-3 font-medium text-[var(--color-text-primary)]">#{e.orders?.order_number || String(e.id).slice(0, 8)}</td>
                      <td className="py-3.5 px-3 text-[var(--color-text-muted)]">{new Date(e.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatCurrency(Number(e.orders?.total_amount || 0))}</td>
                      <td className="py-3.5 px-3 text-right font-semibold text-[var(--color-accent)] tabular-nums">{formatCurrency(Number(e.commission_amount ?? e.amount ?? 0))}</td>
                      <td className="py-3.5 pl-3 pr-5 text-center">
                        <Badge variant={e.status === "paid" ? "success" : e.status === "cancelled" ? "destructive" : "warning"} className="text-[10px] py-0.5">{e.status || "pending"}</Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
                {loading ? Array(2).fill(0).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
                  : payouts.length === 0
                  ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-[var(--color-text-muted)]">
                        No payouts yet. <Link href="/dashboard/withdrawals" className="text-[var(--color-accent)] hover:underline">Request a payout</Link> when you reach the minimum.
                      </td>
                    </tr>
                  )
                  : payouts.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-secondary)]/50 transition-colors">
                      <td className="py-3.5 pl-5 pr-3">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 px-3 capitalize">{String(p.payout_method || "—").replace(/_/g, " ")}</td>
                      <td className="py-3.5 px-3 text-right font-medium tabular-nums">{formatCurrency(Number(p.amount ?? 0))}</td>
                      <td className="py-3.5 pl-3 pr-5 text-center">
                        <Badge variant={p.status === "paid" ? "success" : p.status === "failed" ? "destructive" : "warning"} className="text-[10px] py-0.5">{p.status || "pending"}</Badge>
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
