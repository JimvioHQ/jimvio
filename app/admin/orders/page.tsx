import React from "react";
import { getAdminOrders } from "@/services/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const { orders, total } = await getAdminOrders(100);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Orders</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Monitor all platform orders</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <p className="text-sm text-[var(--color-text-muted)]">{total} order(s)</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Order</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)]">No orders yet</td></tr>
                ) : (
                  orders.map((o: any) => (
                    <tr key={o.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)]/30">
                      <td className="py-3 px-4 font-mono text-xs">{o.order_number || o.id.slice(0, 8)}</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(Number(o.total_amount ?? 0))} {o.currency || "RWF"}</td>
                      <td className="py-3 px-4">
                        <Badge variant={o.status === "delivered" ? "default" : "secondary"}>{o.status || "pending"}</Badge>
                      </td>
                      <td className="py-3 px-4 text-[var(--color-text-muted)]">{o.created_at ? new Date(o.created_at).toLocaleString() : "—"}</td>
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
