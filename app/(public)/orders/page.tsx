"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowUpRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ProviderLogo } from "@/components/ui/admin";
import { resolveCustomerOrderStatus } from "@/lib/payments/order-payment-utils";
import { CUSTOMER_ORDER_LIST_SELECT } from "@/lib/orders/customer-order-fields";

const SHELL = "mx-auto w-full max-w-8xl px-4 sm:px-6";

const TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function PublicOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("all");

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
        .select(CUSTOMER_ORDER_LIST_SELECT)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      setOrders(data ?? []);
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => {
    if (tab === "all") return orders;
    return orders.filter((o) => o.status === tab);
  }, [orders, tab]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20 pt-24 sm:pt-28">
      <div className={SHELL}>
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            Your orders
          </h1>
          <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
            Track payments, shipping, and order history in one place.
          </p>
        </header>

        <div className="mb-6 flex items-end gap-1 overflow-x-auto border-b border-[var(--color-border)] no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "h-10 shrink-0 border-b-2 px-4 text-[13px] font-medium transition-colors",
                tab === t.id
                  ? "border-[var(--color-text-primary)] text-[var(--color-text-primary)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
            <Package className="mx-auto mb-4 h-10 w-10 text-[var(--color-text-muted)]" />
            <p className="font-medium text-[var(--color-text-primary)]">No orders here</p>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              {tab === "all"
                ? "Browse the marketplace and place your first order."
                : `No orders with status "${tab}".`}
            </p>
            <Button asChild className="mt-6 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]">
              <Link href="/marketplace">Browse marketplace</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((o) => {
              const first = o.order_items?.[0];
              const more = (o.order_items?.length || 0) - 1;
              const num = o.order_number || o.id.slice(0, 8);
              const resolvedStatus = resolveCustomerOrderStatus({
                status: o.status,
                payment_status: o.payment_status,
                tracking_number: o.tracking_number,
                shipped_at: o.shipped_at,
                delivered_at: o.delivered_at,
                cj_fulfillment_status: o.cj_fulfillment_status,
              });

              return (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="group flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                        {first?.product_image ? (
                          <Image
                            src={first.product_image}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-[var(--color-text-muted)]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          #{String(num).toUpperCase()}
                        </p>
                        <p className="text-[12px] text-[var(--color-text-muted)]">
                          {new Date(o.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="mt-1 truncate text-[13px] text-[var(--color-text-secondary)]">
                          {first?.product_name}
                          {more > 0 ? ` · +${more} more` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="text-[15px] font-bold tabular-nums text-[var(--color-text-primary)]">
                        {formatCurrency(Number(o.total_amount), o.currency || "USD")}
                      </span>
                      {o.payment_provider && (
                        <ProviderLogo provider={o.payment_provider} size="sm" />
                      )}
                      <OrderStatusBadge status={resolvedStatus} />
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-accent)] opacity-0 transition-opacity group-hover:opacity-100">
                        Details <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
