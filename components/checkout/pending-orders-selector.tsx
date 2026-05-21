"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
    ShoppingBag, AlertCircle, Clock, CheckCircle2,
    ArrowRight, RefreshCw, Trash2,
    Loader2,
} from "lucide-react";
import type { SanitizedOrder } from "@/lib/payments/sanitize-pending-orders";

interface Props {
    orders: SanitizedOrder[];
    currency?: string;
}

function relativeTime(iso: string) {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function StatusBadge({ status }: { status: SanitizedOrder["last_tx_status"] }) {
    if (status === "failed") return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium
      px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400
      border border-rose-100 dark:border-rose-900/40">
            <AlertCircle className="h-2.5 w-2.5" />
            Payment failed
        </span>
    );
    if (status === "pending") return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium
      px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400
      border border-amber-100 dark:border-amber-900/40">
            <Clock className="h-2.5 w-2.5" />
            Awaiting payment
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium
      px-2 py-0.5 rounded-full bg-stone-50 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400
      border border-stone-100 dark:border-zinc-700">
            <ShoppingBag className="h-2.5 w-2.5" />
            Not started
        </span>
    );
}

export function PendingOrdersSelector({ orders, currency }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<string | null>(null);

    const handleResume = (orderId: string) => {
        setLoading(orderId);
        router.push(`/checkout?order_id=${orderId}`);
    };

    const handleCancel = async (orderId: string) => {
        setCancelling(orderId);
        try {
            await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
            router.refresh();
        } catch {
            setCancelling(null);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
            <div className="max-w-[780px] mx-auto px-5 pt-12 pb-16">

                {/* Header */}
                <div className="mb-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em]
            text-amber-500 dark:text-amber-400 mb-2">
                        Unfinished checkouts
                    </p>
                    <h1 className="text-[24px] font-semibold tracking-tight
            text-zinc-900 dark:text-white leading-snug">
                        You have {orders.length} pending {orders.length === 1 ? "order" : "orders"}.
                    </h1>
                    <p className="mt-1.5 text-[13.5px] text-stone-500 dark:text-zinc-400 leading-relaxed">
                        Choose one to complete. Orders are processed separately — they can't be combined.
                    </p>
                </div>
                {/* Order cards */}
                <div className="space-y-3">
                    {orders.map((order) => {
                        const isLoading = loading === order.id;
                        const isCancelling = cancelling === order.id;

                        return (
                            <div
                                key={order.id}
                                className="bg-white dark:bg-zinc-900 border border-stone-200
                  dark:border-zinc-800 rounded-2xl overflow-hidden
                  transition-shadow hover:shadow-sm"
                            >
                                {/* Status stripe */}
                                <div className={`h-[3px] w-full ${order.last_tx_status === "failed"
                                    ? "bg-rose-400 dark:bg-rose-600"
                                    : order.last_tx_status === "pending"
                                        ? "bg-amber-400 dark:bg-amber-500"
                                        : "bg-stone-200 dark:bg-zinc-700"
                                    }`} />

                                <div className="p-5">
                                    {/* Top row */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                {order.order_number && (
                                                    <span className="font-mono text-[12px] font-semibold
                            text-zinc-800 dark:text-zinc-200">
                                                        {order.order_number}
                                                    </span>
                                                )}
                                                <StatusBadge status={order.last_tx_status} />
                                            </div>
                                            {order.vendor_name && (
                                                <p className="text-[12px] text-stone-400 dark:text-zinc-500 truncate">
                                                    {order.vendor_name}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[18px] font-semibold tabular-nums
                        text-zinc-900 dark:text-white leading-none">
                                                {Number(order.total_amount).toLocaleString()}
                                            </p>
                                            <p className="text-[10.5px] text-stone-400 dark:text-zinc-500 mt-0.5">
                                                {order.currency ?? "RWF"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Meta row */}
                                    <div className="flex items-center gap-3 mb-4
                    text-[11.5px] text-stone-400 dark:text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <ShoppingBag className="h-3 w-3" />
                                            {order.item_count} {order.item_count === 1 ? "item" : "items"}
                                        </span>
                                        <span className="h-1 w-1 rounded-full bg-stone-200 dark:bg-zinc-700" />
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {relativeTime(order.created_at)}
                                        </span>
                                    </div>

                                    {/* Warning for failed tx */}
                                    {order.last_tx_status === "failed" && (
                                        <div className="flex items-start gap-2 mb-4 p-3 rounded-xl
                      bg-rose-50 dark:bg-rose-950/20
                      border border-rose-100 dark:border-rose-900/30">
                                            <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                            <p className="text-[12px] text-rose-600 dark:text-rose-400">
                                                Previous payment attempt failed. You can retry with a different method.
                                            </p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {order.can_retry ? (
                                            <button
                                                onClick={() => handleResume(order.id)}
                                                disabled={!!loading || !!cancelling}
                                                className="flex-1 flex items-center justify-center gap-1.5
                          h-9 px-4 rounded-xl text-[13px] font-semibold
                          bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900
                          hover:bg-zinc-800 dark:hover:bg-white
                          disabled:opacity-50 transition-all"
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <>
                                                        {order.last_tx_status === "failed" ? "Retry payment" : "Pay now"}
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center gap-1.5
                        h-9 px-4 rounded-xl text-[13px] font-medium
                        bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500
                        cursor-not-allowed">
                                                <Clock className="h-3.5 w-3.5" />
                                                Expired
                                            </div>
                                        )}

                                        <button
                                            onClick={() => handleCancel(order.id)}
                                            disabled={!!loading || !!cancelling}
                                            className="h-9 w-9 flex items-center justify-center rounded-xl
                        border border-stone-200 dark:border-zinc-700
                        text-stone-300 dark:text-zinc-600
                        hover:border-rose-200 dark:hover:border-rose-800
                        hover:text-rose-400 dark:hover:text-rose-500
                        hover:bg-rose-50 dark:hover:bg-rose-950/20
                        disabled:opacity-40 transition-all"
                                            title="Cancel this order"
                                        >
                                            {isCancelling
                                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                : <Trash2 className="h-3.5 w-3.5" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Start fresh */}
                <div className="mt-6 pt-5 border-t border-stone-100 dark:border-zinc-800/60 text-center">
                    <p className="text-[12.5px] text-stone-400 dark:text-zinc-500 mb-3">
                        Don't want any of these?
                    </p>
                    <a href="/cart"
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium
              text-stone-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white
              transition-colors">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Go back to cart
                    </a>
                </div>
            </div>
        </div>
    );
}