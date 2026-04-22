"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type CommissionRow = {
  id: string;
  created_at: string;
  order_id: string | null;
  order_number: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  description: string | null;
};

export function CommissionTable({
  rows,
  pageSize = 20,
}: {
  rows: CommissionRow[];
  pageSize?: number;
}) {
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"date" | "amount">("date");

  const filtered = useMemo(() => {
    let list = [...rows];
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((r) => (r.order_number || "").toLowerCase().includes(s) || (r.order_id || "").toLowerCase().includes(s));
    }
    if (provider !== "all") {
      list = list.filter((r) => (r.provider || "").toLowerCase().includes(provider));
    }
    list.sort((a, b) => {
      if (sort === "amount") return b.amount - a.amount;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [rows, q, provider, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-sm flex-1">
          <Input label="Search order" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Order #" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "pesapal", "nowpayments", "shopify"] as const).map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={provider === p ? "default" : "outline"}
              onClick={() => { setProvider(p); setPage(0); }}
            >
              {p === "all" ? "All" : p}
            </Button>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setSort(sort === "date" ? "amount" : "date")}>
            Sort: {sort === "date" ? "Date" : "Amount"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-none border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              <th className="p-3">Date</th>
              <th className="p-3">Order</th>
              <th className="p-3">Method</th>
              <th className="p-3">Order amt</th>
              <th className="p-3">Rate</th>
              <th className="p-3">Commission</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="p-3 text-[var(--color-text-secondary)] whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="p-3">
                  {r.order_id ? (
                    <Link href={`/orders/${r.order_id}`} className="font-semibold text-[var(--color-accent)] hover:underline">
                      {r.order_number || r.order_id.slice(0, 8)}
                    </Link>
                  ) : (
                    ""”"
                  )}
                </td>
                <td className="p-3">
                  <Badge variant="secondary" className="capitalize">
                    {r.provider || ""”"}
                  </Badge>
                </td>
                <td className="p-3">"”</td>
                <td className="p-3">8%</td>
                <td className="p-3 font-bold">{formatCurrency(r.amount, r.currency)}</td>
                <td className="p-3">
                  <span className={cn("text-xs font-bold", r.status === "completed" ? "text-[var(--color-success)]" : "")}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[var(--color-text-muted)]">
                  No transactions
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
        <span>
          Page {page + 1} / {pageCount}
        </span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

