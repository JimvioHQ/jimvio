"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { TrackingCard } from "@/components/orders/TrackingCard";
import { Badge } from "@/components/ui/badge";

export default function PublicOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?next=/orders/" + id);
        return;
      }
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items ( id, product_name, product_image, quantity, unit_price, total_price ),
          profiles!orders_buyer_id_fkey ( full_name, email )
        `
        )
        .eq("id", id)
        .eq("buyer_id", user.id)
        .single();

      if (error || !data) {
        setOrder(null);
        setLoading(false);
        return;
      }
      setOrder(data);
      setLoading(false);
    }

    void load();

    channelRef.current = supabase
      .channel("order-" + id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
    };
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
        <div className="max-w-[var(--container-max)] mx-auto px-4">
          <div className="h-40 rounded-2xl bg-[var(--color-surface-secondary)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20 text-center px-4">
        <p className="text-[var(--color-text-secondary)] mb-4">Order not found.</p>
        <Button asChild variant="outline">
          <Link href="/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  const pay =
    order.payment_provider === "nowpayments"
      ? "Crypto"
      : order.payment_provider === "pesapal"
        ? "PesaPal"
        : order.payment_provider === "pawapay"
          ? "PawaPay"
          : order.payment_provider || "—";
  const ref =
    order.pesapal_tracking_id ||
    order.nowpayments_payment_id ||
    order.pawapay_deposit_id ||
    order.payment_provider ||
    "—";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)] mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Order</p>
                  <h1 className="text-2xl font-black text-[var(--color-text-primary)]">
                    #{String(order.order_number || order.id).slice(0, 12).toUpperCase()}
                  </h1>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} size="md" />
              </div>

              <div className="mt-6 flex flex-wrap gap-2 items-center">
                <span className="text-sm text-[var(--color-text-secondary)]">Payment:</span>
                <Badge variant="accent">{pay}</Badge>
                <span className="text-xs font-mono text-[var(--color-text-muted)] truncate max-w-[200px]">{String(ref)}</span>
              </div>

              <div className="mt-8 space-y-4">
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Items</p>
                <ul className="space-y-4">
                  {order.order_items?.map((i: any) => (
                    <li key={i.id} className="flex gap-4">
                      <div className="h-16 w-16 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden flex items-center justify-center shrink-0">
                        {i.product_image ? (
                          <img src={i.product_image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-6 w-6 text-[var(--color-text-muted)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--color-text-primary)]">{i.product_name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {i.quantity} × {formatCurrency(Number(i.unit_price), order.currency || "USD")}
                        </p>
                      </div>
                      <p className="font-bold">{formatCurrency(Number(i.total_price), order.currency || "USD")}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 border-t border-[var(--color-border)] pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Subtotal</span>
                  <span>{formatCurrency(Number(order.subtotal ?? order.total_amount), order.currency || "USD")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Shipping</span>
                  <span>{formatCurrency(0, order.currency || "USD")}</span>
                </div>
                <div className="flex justify-between text-lg font-black pt-2">
                  <span>Total</span>
                  <span className="text-[var(--color-accent)]">
                    {formatCurrency(Number(order.total_amount), order.currency || "USD")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <TrackingCard order={order} />
          </div>
        </div>
      </div>
    </div>
  );
}
