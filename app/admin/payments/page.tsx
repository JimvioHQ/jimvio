import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { getAdminDB } from "@/services/db";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const admin = getAdminDB();
  const { data: orders } = await admin.from("orders").select("id, total_amount, status, created_at").order("created_at", { ascending: false }).limit(30);
  const list = orders ?? [];
  const totalVolume = list.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Payments</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Monitor transactions and payouts</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent orders (transaction volume)
          </CardTitle>
          <p className="text-sm text-[var(--color-text-muted)]">Last 30 orders · Total: {formatCurrency(totalVolume)}</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-[var(--color-text-muted)]">No orders yet</td></tr>
                ) : (
                  list.map((o: any) => (
                    <tr key={o.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)]/30">
                      <td className="py-3 px-4 text-[var(--color-text-muted)]">{o.created_at ? new Date(o.created_at).toLocaleString() : "—"}</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(Number(o.total_amount ?? 0))}</td>
                      <td className="py-3 px-4">{o.status || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-[var(--color-text-muted)]">
        Commission tracking and payout history can be added when payout/affiliate tables are exposed here.
      </p>
    </div>
  );
}
