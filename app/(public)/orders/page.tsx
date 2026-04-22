"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TABS = ["All", "pending", "processing", "shipped", "delivered", "cancelled"] as const;

export default function PublicOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?next=/orders");
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          status,
          total_amount,
          currency,
          payment_provider,
          created_at,
          order_items ( product_name, product_image, quantity )
        `
        )
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      setOrders(data ?? []);
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => {
    if (tab === "All") return orders;
    return orders.filter((o) => o.status === tab);
  }, [orders, tab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
        <div className="max-w-[900px] mx-auto px-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-none bg-[var(--color-surface-secondary)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-black text-[var(--color-text-primary)] mb-6">My orders</h1>

        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-none px-4 py-1.5 text-xs font-bold uppercase tracking-wide border transition-colors",
                tab === t
                  ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                  : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
              )}
            >
              {t === "All" ? "All" : t}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-none border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-4" />
            <p className="font-bold text-[var(--color-text-primary)]">No orders yet</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-6">Browse products and place your first order.</p>
            <Button asChild>
              <Link href="/products">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-4">
            {filtered.map((o) => {
              const first = o.order_items?.[0];
              const more = (o.order_items?.length || 0) - 1;
              const pay =
                o.payment_provider === "nowpayments"
                  ? "Crypto"
                  : o.payment_provider === "pesapal"
                    ? "PesaPal"
                    : o.payment_provider === "pawapay"
                      ? "PawaPay"
                      : o.payment_provider || ""”";
              const num = o.order_number || o.id.slice(0, 8);
              return (
                <li
                  key={o.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-none)]"
                >
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="h-14 w-14 rounded-none border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden flex items-center justify-center shrink-0">
                      {first?.product_image ? (
                        <img src={first.product_image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-[var(--color-text-muted)]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--color-text-primary)] truncate">#{String(num).toUpperCase()}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {new Date(o.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-[var(--color-text-secondary)] truncate mt-1">
                        {first?.product_name}
                        {more > 0 ? ` Â· +${more} more` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="font-bold">{formatCurrency(Number(o.total_amount), o.currency || "USD")}</span>
                    <Badge variant="secondary">{pay}</Badge>
                    <OrderStatusBadge status={o.status} />
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/orders/${o.id}`}>View details</Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

