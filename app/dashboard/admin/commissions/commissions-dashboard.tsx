"use client";

import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CommissionStats, type StatCard } from "@/components/admin/CommissionStats";
import { CommissionTable, type CommissionRow } from "@/components/admin/CommissionTable";
import { Button } from "@/components/ui/button";
import { Wallet, ShoppingBag, BarChart3, TrendingUp } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

type Row = CommissionRow;

export function CommissionsDashboard({
  initialRows,
  walletBalance,
  walletTotal,
}: {
  initialRows: Row[];
  walletBalance: number | null;
  walletTotal: number | null;
}) {
  const { formatMoney } = useCurrency();
  const [range, setRange] = useState<"7" | "30" | "90">("30");

  const filteredByRange = useMemo(() => {
    const days = parseInt(range, 10);
    const cutoff = Date.now() - days * 86400000;
    return initialRows.filter((r) => new Date(r.created_at).getTime() >= cutoff);
  }, [initialRows, range]);

  const stats: StatCard[] = useMemo(() => {
    const total = filteredByRange.reduce((s, r) => s + r.amount, 0);
    const prevCut = Date.now() - parseInt(range, 10) * 2 * 86400000;
    const prev = initialRows.filter(
      (r) =>
        new Date(r.created_at).getTime() >= prevCut &&
        new Date(r.created_at).getTime() < Date.now() - parseInt(range, 10) * 86400000
    );
    const prevTotal = prev.reduce((s, r) => s + r.amount, 0);
    const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    return [
      {
        title: "Total earned (period)",
        value: formatMoney(total, "USD"),
        sub: walletBalance != null ? `Wallet available: ${formatMoney(walletBalance, "USD")}` : undefined,
        changePct: change,
        icon: <Wallet className="h-5 w-5" />,
      },
      {
        title: "This month",
        value: formatMoney(total, "USD"),
        sub: walletTotal != null ? `All-time wallet: ${formatMoney(walletTotal, "USD")}` : undefined,
        icon: <TrendingUp className="h-5 w-5" />,
      },
      {
        title: "Transactions",
        value: String(filteredByRange.length),
        sub: "Platform commission rows",
        icon: <ShoppingBag className="h-5 w-5" />,
      },
      {
        title: "Avg commission",
        value:
          filteredByRange.length > 0
            ? formatMoney(total / filteredByRange.length, "USD")
            : "—",
        icon: <BarChart3 className="h-5 w-5" />,
      },
    ];
  }, [filteredByRange, initialRows, range, walletBalance, walletTotal, formatMoney]);

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; pesapal: number; nowpayments: number; shopify: number }>();
    for (const r of filteredByRange) {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      if (!map.has(d)) map.set(d, { date: d, pesapal: 0, nowpayments: 0, shopify: 0 });
      const row = map.get(d)!;
      const p = (r.provider || "").toLowerCase();
      if (p.includes("pesapal")) row.pesapal += r.amount;
      else if (p.includes("nowpayments")) row.nowpayments += r.amount;
      else row.shopify += r.amount;
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredByRange]);

  function exportCsv() {
    const header = ["date", "order_id", "provider", "amount", "currency", "status"];
    const lines = [header.join(",")].concat(
      filteredByRange.map((r) =>
        [r.created_at, r.order_id, r.provider, r.amount, r.currency, r.status].join(",")
      )
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "commissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Platform commissions</h1>
        <div className="flex flex-wrap gap-2">
          {(["7", "30", "90"] as const).map((d) => (
            <Button key={d} type="button" size="sm" variant={range === d ? "default" : "outline"} onClick={() => setRange(d)}>
              Last {d} days
            </Button>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </div>

      <CommissionStats cards={stats} />

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 h-[320px]">
        <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">Daily commission</h2>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="pesapal" name="PesaPal" stroke="var(--color-success)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="nowpayments" name="NowPayments" stroke="var(--color-bg-dark)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="shopify" name="Shopify" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <CommissionTable rows={filteredByRange} />
    </div>
  );
}
