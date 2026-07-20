"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Eye, Package, ShoppingBag, TrendingUp, Loader2 } from "lucide-react";
import { LocalizedPrice } from "@/components/currency/localized-price";

type AnalyticsPayload = {
  vendor: { id: string; name: string; lifetimeSales: number; lifetimeRevenue: number; rating: number | null };
  kpis: {
    revenue30d: number;
    orders30d: number;
    views30d: number;
    conversionRate: number;
    activeListings: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    slug: string;
    view_count: number | null;
    sale_count: number | null;
    rating: number | null;
  }>;
};

export function SellerMarketplaceDashboard() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/vendor/analytics")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load");
        return json as AnalyticsPayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--color-text-muted)]">
        <Loader2 className="h-5 w-5 animate-spin text-[#fd5000]" /> Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]">
        {error ?? "No analytics available"}
      </div>
    );
  }

  const cards = [
    {
      label: "Revenue (30d)",
      value: <LocalizedPrice amount={data.kpis.revenue30d} currency="USD" />,
      icon: TrendingUp,
    },
    { label: "Orders (30d)", value: data.kpis.orders30d, icon: ShoppingBag },
    { label: "Views (30d)", value: data.kpis.views30d, icon: Eye },
    { label: "Conversion", value: `${data.kpis.conversionRate}%`, icon: BarChart3 },
    { label: "Active listings", value: data.kpis.activeListings, icon: Package },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
          Seller analytics
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Marketplace performance for {data.vendor.name}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              <c.icon className="h-3.5 w-3.5 text-[#fd5000]" />
              {c.label}
            </div>
            <p className="text-xl font-black text-[var(--color-text-primary)]">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">Top products</h2>
        {data.topProducts.length === 0 ? (
          <p className="text-[12px] text-[var(--color-text-muted)]">No products yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {data.topProducts.slice(0, 10).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  href={`/marketplace/${p.slug}`}
                  className="truncate text-[13px] font-semibold text-[var(--color-text-primary)] hover:text-[#fd5000]"
                >
                  {p.name}
                </Link>
                <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                  {p.view_count ?? 0} views · {p.sale_count ?? 0} sales
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
