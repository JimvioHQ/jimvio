import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminDB } from "@/services/db";
import { absoluteTime, cn, relativeTime } from "@/lib/utils";
import {
    isOrderPaymentComplete,
    computeOrderEconomicsBreakdown,
    resolveChargedPayment,
    type PaymentSnapshot,
} from "@/lib/payments/order-payment-utils";
import {
    ArrowLeft, ShoppingBag, User, Building2, MapPin, Truck,
    Receipt, Clock, Package, AlertCircle, CheckCircle2,
    CreditCard, Mail, Phone, Globe, ExternalLink,
    RefreshCcw, Ban, ArrowRight, Hash, Activity, Zap,
} from "lucide-react";
import { StatusPill, ProviderLogo } from "@/components/ui/admin";
import { verifyFlutterwaveTransaction } from "@/lib/payments/Transaction-verify";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { autoHealTransaction } from "@/lib/actions/auto-heal-transaction";
import { markOrderPaidAction, retryCJOrderAction } from "@/lib/actions/orders";
import { CJOrderPanel } from "@/components/admin/orders/orders/CJOrderPanel";


export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

type HealResult = {
    action: "completed" | "failed" | "none" | "error";
    reason: string;
    healedAt?: string;
};

// ─── UI primitives ────────────────────────────────────────────────────────────

function Card({
    title, icon: Icon, action, children, className,
}: {
    title?: string;
    icon?: React.ElementType;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn(
            "rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden",
            className,
        )}>
            {title && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                    <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                            {title}
                        </h2>
                    </div>
                    {action}
                </div>
            )}
            {children}
        </div>
    );
}

function DetailRow({ label, value, mono = false }: {
    label: string; value: React.ReactNode; mono?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[var(--color-border)]/60 last:border-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] shrink-0 pt-0.5">
                {label}
            </span>
            <span className={cn(
                "text-[12.5px] text-[var(--color-text-primary)] text-right min-w-0 break-words",
                mono && "font-mono text-[11px]",
            )}>
                {value}
            </span>
        </div>
    );
}

function MoneyRow({ label, value, currency, muted = false, bold = false }: {
    label: string; value: number | null; currency: string; muted?: boolean; bold?: boolean;
}) {
    if (value === null || value === 0) return null;
    return (
        <div className={cn(
            "flex items-center justify-between py-2",
            muted && "text-[var(--color-text-muted)]",
            bold && "font-semibold pt-3 mt-1 border-t border-[var(--color-border)]",
        )}>
            <span className="text-[12.5px]">{label}</span>
            <span className="text-[13px] tabular-nums">
                {Number(value).toLocaleString()}{" "}
                <span className="text-[10px] font-normal opacity-70">{currency}</span>
            </span>
        </div>
    );
}

function HealBanner({ result }: { result: HealResult }) {
    if (result.action === "none") return null;
    const ok = result.action !== "error";
    return (
        <div className={cn(
            "rounded-lg border px-4 py-3 font-mono",
            ok
                ? "border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06]"
                : "border-rose-500/20 bg-rose-500/[0.03] dark:bg-rose-500/[0.06]",
        )}>
            <div className="flex items-center gap-2 text-[11px]">
                <span className={ok ? "text-emerald-500" : "text-rose-500"}>{ok ? "✓" : "✗"}</span>
                <span className={cn("font-semibold tracking-tight", ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {ok ? `healed → ${result.action}` : "heal_failed"}
                </span>
                {result.healedAt && (
                    <span className="ml-auto text-[10px] text-[var(--color-text-muted)] tabular-nums">
                        {absoluteTime(result.healedAt)}
                    </span>
                )}
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)] leading-relaxed pl-4">
                {result.reason}
            </p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const admin = getAdminDB();

    const { data: order } = await admin
        .from("orders")
        .select(`
            id, order_number, status, payment_status,
            subtotal, shipping_amount, tax_amount, discount_amount, total_amount,
            currency, notes, metadata,
            shipping_address, billing_address,
            created_at, updated_at, paid_at, shipped_at, delivered_at, cancelled_at,
            integration_source,
            cj_order_id, cj_order_num, cj_fulfillment_status,
            cj_supplier_cost, cj_shipping_method, cj_submit_time, cj_last_sync,
            shopify_order_id, shopify_order_number, shopify_fulfillment_status,
            tracking_number, tracking_status,
            nowpayments_payment_id,
            buyer_id, vendor_id, affiliate_id,
            profiles!orders_buyer_id_fkey(id, full_name, email, phone, country, city),
            vendors!orders_vendor_id_fkey(id, business_name, business_slug, business_email),
            order_items(
                id, product_id, variant_id, product_name, variant_name,
                product_image, quantity, unit_price, total_price,
                product_source, product_type, pricing_type, billing_period,
                affiliate_commission_amount, digital_download_url, download_count,
                access_granted_at, source_metadata
            )
        `)
        .eq("id", id)
        .single();

    if (!order) notFound();

    const buyer = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
    const vendor = Array.isArray(order.vendors) ? order.vendors[0] : order.vendors;
    const items = (order.order_items ?? []) as any[];
    const shipAddr = order.shipping_address as any;
    const metadata = (order.metadata ?? {}) as Record<string, unknown>;

    const [
        { data: statusHistory },
        { data: transactions },
        { data: webhooks },
    ] = await Promise.all([
        admin.from("order_status_history")
            .select("id, previous_status, new_status, notes, created_at, metadata, profiles(full_name)")
            .eq("order_id", id)
            .order("created_at", { ascending: false })
            .limit(30),
        admin.from("transactions")
            .select("id, amount, currency, amount_usd, status, provider, provider_transaction_id, type, created_at, description, metadata")
            .eq("order_id", id)
            .order("created_at", { ascending: false }),
        admin.from("webhook_events")
            .select("id, provider, status, error, created_at, idempotency_key")
            .eq("order_id", id)
            .order("created_at", { ascending: false })
            .limit(10),
    ]);

    const history = (statusHistory ?? []) as any[];
    const txs = (transactions ?? []) as any[];
    const wh = (webhooks ?? []) as any[];

    // ── Auto-verify + heal ────────────────────────────────────────────────────
    let healResult: HealResult = { action: "none", reason: "no condition matched · skipped" };

    const shouldVerify =
        !isOrderPaymentComplete(order.payment_status) &&
        order.status !== "cancelled";

    if (shouldVerify) {
        const pendingTx = txs.find((t: any) => t.status === "pending") ?? null;

        if (pendingTx?.provider_transaction_id) {
            try {
                let verifiedStatus: string | null = null;
                let txData: any = null;

                if (pendingTx.provider === "flutterwave") {
                    const res = await verifyFlutterwaveTransaction(pendingTx.provider_transaction_id);
                    txData = res?.data ?? null;
                    verifiedStatus = txData?.status === "successful" ? "successful"
                        : txData?.status === "failed" ? "failed"
                            : null;

                    if (verifiedStatus === "successful") {
                        await finalizeOrderPayment(admin, id, {
                            providerTransactionId: String(pendingTx.provider_transaction_id),
                            providerReference: txData.tx_ref,
                            paidAtIso: txData.created_at || new Date().toISOString(),
                            notifyUserId: order.buyer_id,
                            amountForMessage: Number(order.total_amount),
                            paymentProvider: "flutterwave",
                        });
                        const { data: refreshed } = await admin
                            .from("orders")
                            .select("status, payment_status, paid_at, updated_at")
                            .eq("id", id)
                            .single();
                        if (refreshed) {
                            order.status = refreshed.status;
                            order.payment_status = refreshed.payment_status;
                            order.paid_at = refreshed.paid_at;
                            order.updated_at = refreshed.updated_at;
                        }
                        healResult = { action: "completed", reason: "flutterwave · verified successful · auto-completed", healedAt: new Date().toISOString() };
                        verifiedStatus = null;
                    }
                } else {
                    const txMeta = (pendingTx.metadata ?? {}) as Record<string, unknown>;

                    if (pendingTx.provider === "binance") {
                        try {
                            const apiKey = process.env.BINANCE_PAY_API_KEY!;
                            const apiSecret = process.env.BINANCE_PAY_API_SECRET!;
                            const timestamp = Date.now();
                            const nonce = Math.random().toString(36).slice(2, 10).toUpperCase();
                            const body = JSON.stringify({ merchantTradeNo: pendingTx.provider_transaction_id });
                            const payload = `${timestamp}\n${nonce}\n${body}\n`;
                            const { createHmac } = await import("crypto");
                            const sig = createHmac("sha512", apiSecret).update(payload).digest("hex").toUpperCase();
                            const res = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v2/order/query", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "BinancePay-Timestamp": String(timestamp),
                                    "BinancePay-Nonce": nonce,
                                    "BinancePay-Certificate-SN": apiKey,
                                    "BinancePay-Signature": sig,
                                },
                                body,
                                signal: AbortSignal.timeout(8_000),
                            });
                            const json = await res.json() as any;
                            if (json.status === "SUCCESS" && json.data?.status === "PAID") verifiedStatus = "successful";
                            else if (["CANCELED", "ERROR", "EXPIRED"].includes(json.data?.status)) verifiedStatus = "failed";
                        } catch { /* provider unreachable */ }
                    }

                    if (pendingTx.provider === "nowpayments") {
                        try {
                            const res = await fetch(`https://api.nowpayments.io/v1/payment/${pendingTx.provider_transaction_id}`, {
                                headers: { "x-api-key": process.env.NOWPAYMENTS_API_KEY! },
                                signal: AbortSignal.timeout(8_000),
                            });
                            const json = await res.json() as any;
                            if (json.payment_status === "finished") verifiedStatus = "successful";
                            else if (["failed", "expired"].includes(json.payment_status)) verifiedStatus = "failed";
                        } catch { /* provider unreachable */ }
                    }
                }

                if (verifiedStatus !== null || pendingTx.provider !== "flutterwave") {
                    const isStuck =
                        order.payment_status === "pending" &&
                        !!order.created_at &&
                        new Date(order.created_at).getTime() < Date.now() - 60 * 60_000;

                    if (verifiedStatus !== null || isStuck) {
                        healResult = await autoHealTransaction({
                            transactionId: pendingTx.id,
                            orderId: id,
                            provider: pendingTx.provider,
                            providerTxId: pendingTx.provider_transaction_id,
                            verifiedStatus,
                            isStuck,
                        });

                        if (healResult.action !== "none" && healResult.action !== "error") {
                            const { data: refreshed } = await admin
                                .from("orders")
                                .select("status, payment_status, paid_at, updated_at")
                                .eq("id", id)
                                .single();
                            if (refreshed) {
                                order.status = refreshed.status;
                                order.payment_status = refreshed.payment_status;
                                order.paid_at = refreshed.paid_at;
                                order.updated_at = refreshed.updated_at;
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("[OrderDetailPage] verification error", { orderId: id, reason: err instanceof Error ? err.message : String(err) });
            }
        } else {
            const isStuck =
                order.payment_status === "pending" &&
                !!order.created_at &&
                new Date(order.created_at).getTime() < Date.now() - 60 * 60_000;

            if (isStuck && txs.length > 0) {
                const lastTx = txs[0];
                healResult = await autoHealTransaction({
                    transactionId: lastTx.id,
                    orderId: id,
                    provider: lastTx.provider,
                    providerTxId: lastTx.provider_transaction_id,
                    verifiedStatus: null,
                    isStuck: true,
                });
            }
        }
    }

    // ── Derived flags ─────────────────────────────────────────────────────────
    const hasCJItems = items.some((i: any) => i.product_source === "cj");
    const isCJ = !!order.cj_order_id || hasCJItems;
    const isShopify = !!order.shopify_order_id || items.some((i: any) => i.product_source === "shopify");
    const isPaid = isOrderPaymentComplete(order.payment_status);
    const isCancelled = order.status === "cancelled";
    const needsRefund = isPaid && isCancelled;
    const isStuckDisplay =
        order.payment_status === "pending" &&
        !!order.created_at &&
        new Date(order.created_at).getTime() < Date.now() - 60 * 60_000 &&
        healResult.action === "none";

    const paymentSnapshot =
        metadata.payment_snapshot && typeof metadata.payment_snapshot === "object"
            ? (metadata.payment_snapshot as { exchange_rate?: number | null; payment_amount?: number; payment_currency?: string })
            : null;

    const chargedPayment = resolveChargedPayment({
        orderTotal: Number(order.total_amount ?? 0),
        orderCurrency: String(order.currency ?? "USD"),
        transactions: txs,
        paymentSnapshot: paymentSnapshot as PaymentSnapshot | null,
    });

    const vendorEarningsTotal = txs
        .filter((t: any) => t.type === "vendor_earning")
        .reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0);

    const economics = computeOrderEconomicsBreakdown({
        totalAmount: Number(order.total_amount ?? 0),
        currency: String(order.currency ?? "USD"),
        shippingAmount: order.shipping_amount,
        cjShippingCostUsd: order.cj_supplier_cost,
        paymentProvider:
            txs[0]?.provider ??
            (typeof metadata.payment_provider === "string" ? metadata.payment_provider : "flutterwave"),
        exchangeRate: paymentSnapshot?.exchange_rate ?? txs[0]?.exchange_rate ?? null,
        items,
        vendorEarnings: vendorEarningsTotal,
    });

    return (
        <div className="space-y-5 pb-10">

            {/* Back */}
            <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to orders
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[var(--color-border)]/60">
                <div className="min-w-0">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1.5">
                        Order · {order.integration_source ?? "vendor"}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-[22px] font-mono font-semibold tracking-tight text-[var(--color-text-primary)]">
                            {order.order_number}
                        </h1>
                        <StatusPill status={order.payment_status ?? "pending"} size="md" />
                        <StatusPill status={order.status ?? "pending"} size="md" />
                        {healResult.action !== "none" && healResult.action !== "error" && (
                            <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                                healed · {healResult.action}
                            </span>
                        )}
                    </div>
                    <p className="text-[12.5px] text-[var(--color-text-muted)] mt-1.5" title={absoluteTime(order.created_at ?? "")}>
                        Placed {relativeTime(order.created_at ?? "")}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {isCJ && order.cj_order_id && (
                        <Link
                            href={`https://app.cjdropshipping.com/order/detail.html?orderId=${order.cj_order_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-3 inline-flex items-center gap-1.5 rounded text-[12px] font-medium border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View on CJ
                        </Link>
                    )}
                    {needsRefund && (
                        <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded text-[12px] font-medium bg-rose-50 text-rose-700 border border-rose-300/40 hover:bg-rose-100 transition-colors dark:bg-rose-950/20 dark:text-rose-400">
                            <RefreshCcw className="h-3.5 w-3.5" />
                            Issue refund
                        </button>
                    )}
                    {!isCancelled && !isPaid && (
                        <form action={markOrderPaidAction} className="inline">
                            <input type="hidden" name="orderId" value={order.id} />
                            <button
                                type="submit"
                                className="h-8 px-3 inline-flex items-center gap-1.5 rounded text-[12px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-300/40 hover:bg-emerald-100 transition-colors dark:bg-emerald-950/20 dark:text-emerald-400"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Mark as paid
                            </button>
                        </form>
                    )}
                    {!isCancelled && !isPaid && (
                        <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded text-[12px] font-medium border border-[var(--color-border)] text-rose-600 hover:bg-rose-50 transition-colors dark:hover:bg-rose-950/20">
                            <Ban className="h-3.5 w-3.5" />
                            Cancel order
                        </button>
                    )}
                </div>
            </div>

            {/* Heal banner */}
            <HealBanner result={healResult} />

            {/* Alerts */}
            {isStuckDisplay && (
                <div className="flex items-start gap-3 p-4 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-400/20">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                            Awaiting payment · {relativeTime(order.created_at ?? "")}
                        </p>
                        <p className="text-[12px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                            Payment hasn't completed and provider couldn't be reached.
                            {txs.length > 0 && ` Last tx: ${txs[0].status} via ${txs[0].provider}.`}
                        </p>
                    </div>
                </div>
            )}

            {!isPaid && !isCancelled && !isStuckDisplay && order.payment_status === "pending" && (
                <div className="flex items-start gap-3 p-4 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-400/20">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">Awaiting payment</p>
                        <p className="text-[12px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                            Order placed {relativeTime(order.created_at ?? "")} but payment hasn't completed.
                            {txs.length > 0 && ` Last transaction: ${txs[0].status}.`}
                        </p>
                    </div>
                </div>
            )}

            {isCJ && isPaid && !order.cj_order_id && (
                <div className="flex items-start gap-3 p-4 rounded-md bg-rose-50 dark:bg-rose-950/20 border border-rose-400/20">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-[13px] font-semibold text-rose-700 dark:text-rose-300">CJ order not placed</p>
                        <p className="text-[12px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                            Buyer paid but the order hasn't been forwarded to CJ Dropshipping.
                        </p>
                        <form action={retryCJOrderAction} className="inline mt-3">
                            <input type="hidden" name="orderId" value={order.id} />
                            <button
                                type="submit"
                                className="h-8 px-3 inline-flex items-center gap-1.5 rounded text-[12px] font-medium border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                            >
                                <RefreshCcw className="h-3.5 w-3.5" />
                                Retry CJ submission
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {needsRefund && (
                <div className="flex items-start gap-3 p-4 rounded-md bg-rose-50 dark:bg-rose-950/20 border border-rose-400/20">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[13px] font-semibold text-rose-700 dark:text-rose-300">Refund required</p>
                        <p className="text-[12px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                            Order was cancelled after payment was received.
                        </p>
                    </div>
                </div>
            )}

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Left */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Line items */}
                    <Card title={`Items (${items.length})`} icon={ShoppingBag}>
                        <div className="divide-y divide-[var(--color-border)]/60">
                            {items.map((item: any) => (
                                <div key={item.id} className="flex items-start gap-3 px-4 py-3.5">
                                    <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] overflow-hidden shrink-0">
                                        {item.product_image ? (
                                            <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="h-4 w-4 text-[var(--color-text-muted)]/40" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-2 flex-wrap">
                                            {item.product_id ? (
                                                <Link href={`/admin/products/${item.product_id}`} className="text-[13px] font-medium text-[var(--color-text-primary)] hover:text-orange-500 transition-colors line-clamp-2">
                                                    {item.product_name}
                                                </Link>
                                            ) : (
                                                <p className="text-[13px] font-medium text-[var(--color-text-primary)] line-clamp-2">{item.product_name}</p>
                                            )}
                                            {item.product_source === "cj" && (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 ring-1 ring-blue-500/20 shrink-0">CJ</span>
                                            )}
                                            {item.product_source === "shopify" && (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20 shrink-0">Shopify</span>
                                            )}
                                            {item.pricing_type === "recurring" && (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-orange-50 text-orange-700 ring-1 ring-orange-500/20 shrink-0">{item.billing_period}</span>
                                            )}
                                        </div>
                                        {item.variant_name && (
                                            <p className="text-[11.5px] text-[var(--color-text-muted)] mt-0.5">{item.variant_name}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--color-text-muted)] flex-wrap">
                                            <span className="tabular-nums">Qty {item.quantity}</span>
                                            <span>×</span>
                                            <span className="tabular-nums">{Number(item.unit_price).toLocaleString()} {order.currency}</span>
                                            {item.product_type === "digital" && item.access_granted_at && (
                                                <><span>·</span><span className="text-emerald-600">Access granted</span></>
                                            )}
                                            {item.download_count > 0 && (
                                                <><span>·</span><span>{item.download_count} downloads</span></>
                                            )}
                                            {item.affiliate_commission_amount > 0 && (
                                                <><span>·</span><span className="text-orange-500">Commission: {Number(item.affiliate_commission_amount).toLocaleString()} {order.currency}</span></>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)] shrink-0 pt-0.5">
                                        {Number(item.total_price).toLocaleString()}{" "}
                                        <span className="text-[10px] font-normal text-[var(--color-text-muted)]">{order.currency}</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Totals */}
                    <Card title="Totals" icon={Receipt}>
                        <div className="px-4 py-3">
                            <MoneyRow label="Subtotal" value={order.subtotal} currency={order.currency ?? "RWF"} muted />
                            <MoneyRow label="Shipping" value={order.shipping_amount} currency={order.currency ?? "RWF"} muted />
                            <MoneyRow label="Tax" value={order.tax_amount} currency={order.currency ?? "RWF"} muted />
                            <MoneyRow label="Discount" value={order.discount_amount ? -Number(order.discount_amount) : null} currency={order.currency ?? "RWF"} muted />
                            <MoneyRow label="Total" value={order.total_amount} currency={order.currency ?? "RWF"} bold />
                            {(chargedPayment.currency !== (order.currency ?? "USD").toUpperCase() ||
                                Math.abs(chargedPayment.amount - Number(order.total_amount ?? 0)) > 0.01) && (
                                <MoneyRow
                                    label={`Charged (${chargedPayment.currency})`}
                                    value={chargedPayment.amount}
                                    currency={chargedPayment.currency}
                                    muted
                                />
                            )}
                            {chargedPayment.exchangeRate && (
                                <p className="text-[10.5px] text-[var(--color-text-muted)] tabular-nums">
                                    Exchange rate: 1 USD = {Number(chargedPayment.exchangeRate).toLocaleString()} {chargedPayment.currency}
                                </p>
                            )}

                            {(isPaid || isCJ) && (
                                <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-2">
                                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Economics breakdown</p>
                                    <MoneyRow label="Customer paid" value={economics.customerPaid} currency={economics.currency} />
                                    <MoneyRow label="Supplier cost" value={economics.supplierCost} currency={economics.currency} muted />
                                    <MoneyRow label="Shipping cost" value={economics.shippingCost} currency={economics.currency} muted />
                                    <MoneyRow label="Payment fee" value={economics.paymentFee} currency={economics.currency} muted />
                                    <MoneyRow label="Vendor earnings" value={economics.vendorEarnings} currency={economics.currency} muted />
                                    <MoneyRow
                                        label="Platform profit"
                                        value={economics.platformProfit}
                                        currency={economics.currency}
                                        bold
                                    />
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* CJ panel — replaces the manual fulfillment card for CJ orders */}
                    {hasCJItems && (
                        <CJOrderPanel
                            orderId={order.id}
                            cjOrderId={order.cj_order_id ?? null}
                            cjOrderNum={order.cj_order_num ?? null}
                            cjFulfillmentStatus={order.cj_fulfillment_status ?? null}
                            trackingNumber={order.tracking_number ?? null}
                            cjShippingMethod={order.cj_shipping_method ?? null}
                            cjSubmitTime={(order as any).cj_submit_time ?? null}
                            cjLastSync={(order as any).cj_last_sync ?? null}
                            hasCJItems={hasCJItems}
                        />
                    )}

                    {/* Transactions */}
                    {txs.length > 0 && (
                        <Card title={`Transactions (${txs.length})`} icon={CreditCard}>
                            <div className="divide-y divide-[var(--color-border)]/60">
                                {txs.map((tx: any) => (
                                    <Link
                                        key={tx.id}
                                        href={`/admin/payments/${tx.id}`}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-secondary)]/50 transition-colors"
                                    >
                                        <ProviderLogo provider={tx.provider} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-[12.5px] font-medium text-[var(--color-text-primary)] capitalize">
                                                    {tx.type} · {tx.provider}
                                                </p>
                                                <StatusPill status={tx.status} />
                                            </div>
                                            <p className="text-[10.5px] font-mono text-[var(--color-text-muted)] truncate mt-0.5">
                                                {tx.provider_transaction_id ?? tx.id}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[12.5px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                                                {Number(tx.amount).toLocaleString()}{" "}
                                                <span className="text-[10px] font-normal text-[var(--color-text-muted)]">{tx.currency}</span>
                                            </p>
                                            {tx.amount_usd && tx.currency !== "USD" && (
                                                <p className="text-[10px] text-[var(--color-text-muted)] tabular-nums">≈ ${Number(tx.amount_usd).toFixed(2)}</p>
                                            )}
                                            <p className="text-[10.5px] text-[var(--color-text-muted)] mt-0.5">{relativeTime(tx.created_at)}</p>
                                        </div>
                                        <ArrowRight className="h-3 w-3 text-[var(--color-text-muted)]/50 shrink-0" />
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Activity timeline */}
                    {history.length > 0 && (
                        <Card title="Activity" icon={Clock}>
                            <div className="px-4 py-3 space-y-3">
                                {history.map((h: any, i: number) => {
                                    const user = Array.isArray(h.profiles) ? h.profiles[0] : h.profiles;
                                    const triggeredBy = (h.metadata as any)?.triggered_by;
                                    return (
                                        <div key={h.id} className="flex gap-3 relative">
                                            {i < history.length - 1 && (
                                                <div className="absolute left-[5px] top-3 bottom-[-12px] w-px bg-[var(--color-border)]" />
                                            )}
                                            <div className={cn(
                                                "w-2.5 h-2.5 rounded-full mt-1.5 ring-2 ring-[var(--color-surface)] shrink-0 z-10",
                                                triggeredBy === "system" ? "bg-orange-400" : "bg-[var(--color-text-muted)]/40",
                                            )} />
                                            <div className="flex-1 min-w-0 pb-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {h.previous_status && (
                                                        <><StatusPill status={h.previous_status} /><ArrowRight className="h-3 w-3 text-[var(--color-text-muted)]" /></>
                                                    )}
                                                    <StatusPill status={h.new_status} />
                                                    {triggeredBy === "system" && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-orange-500">
                                                            <Zap className="h-2.5 w-2.5" />auto
                                                        </span>
                                                    )}
                                                </div>
                                                {h.notes && (
                                                    <p className="text-[11px] font-mono text-[var(--color-text-muted)] mt-1">{h.notes}</p>
                                                )}
                                                <p className="text-[10.5px] text-[var(--color-text-muted)] mt-1" title={absoluteTime(h.created_at)}>
                                                    {relativeTime(h.created_at)}{user?.full_name && ` · ${user.full_name}`}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Metadata */}
                    {Object.keys(metadata).length > 0 && (
                        <Card title="Metadata" icon={Hash}>
                            <pre className="text-[11px] font-mono leading-relaxed text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] p-4 overflow-x-auto">
                                {JSON.stringify(metadata, null, 2)}
                            </pre>
                        </Card>
                    )}

                    {order.notes && (
                        <Card title="Notes" icon={Receipt}>
                            <p className="text-[12.5px] text-[var(--color-text-secondary)] px-4 py-4 leading-relaxed whitespace-pre-wrap">
                                {order.notes}
                            </p>
                        </Card>
                    )}
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">

                    {/* Buyer */}
                    {buyer && (
                        <Card title="Buyer" icon={User}>
                            <div className="px-4 py-3">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[13px] font-semibold text-[var(--color-text-muted)]">
                                        {buyer.full_name?.charAt(0).toUpperCase() ?? "?"}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{buyer.full_name ?? "Unknown"}</p>
                                        <Link href={`/admin/users/${buyer.id}`} className="text-[11px] text-orange-500 hover:underline">View profile →</Link>
                                    </div>
                                </div>
                                <div className="space-y-2 text-[12px]">
                                    {buyer.email && (
                                        <a href={`mailto:${buyer.email}`} className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-orange-500 transition-colors">
                                            <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{buyer.email}</span>
                                        </a>
                                    )}
                                    {buyer.phone && (
                                        <a href={`tel:${buyer.phone}`} className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-orange-500 transition-colors">
                                            <Phone className="h-3 w-3 shrink-0" /><span>{buyer.phone}</span>
                                        </a>
                                    )}
                                    {buyer.city && (
                                        <p className="flex items-center gap-2 text-[var(--color-text-muted)]">
                                            <Globe className="h-3 w-3 shrink-0" /><span>{[buyer.city, buyer.country].filter(Boolean).join(", ")}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Vendor */}
                    {vendor && (
                        <Card title="Vendor" icon={Building2}>
                            <div className="px-4 py-3">
                                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{vendor.business_name}</p>
                                {vendor.business_email && (
                                    <a href={`mailto:${vendor.business_email}`} className="flex items-center gap-2 mt-2 text-[12px] text-[var(--color-text-secondary)] hover:text-orange-500 transition-colors">
                                        <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{vendor.business_email}</span>
                                    </a>
                                )}
                                <div className="flex gap-3 mt-3">
                                    <Link href={`/admin/vendors/${vendor.id}`} className="text-[11px] text-orange-500 hover:underline">Admin view →</Link>
                                    {vendor.business_slug && (
                                        <Link href={`/store/${vendor.business_slug}`} target="_blank" className="text-[11px] text-[var(--color-text-muted)] hover:text-orange-500 transition-colors">Storefront ↗</Link>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Shipping address */}
                    {shipAddr && (
                        <Card title="Shipping address" icon={MapPin}>
                            <div className="px-4 py-3 text-[12.5px] text-[var(--color-text-secondary)] leading-relaxed space-y-0.5">
                                {(shipAddr.firstName || shipAddr.lastName) && (
                                    <p className="font-medium text-[var(--color-text-primary)]">
                                        {[shipAddr.firstName, shipAddr.lastName].filter(Boolean).join(" ")}
                                    </p>
                                )}
                                {shipAddr.address1 && <p>{shipAddr.address1}</p>}
                                {shipAddr.address2 && <p>{shipAddr.address2}</p>}
                                {(shipAddr.city || shipAddr.zip) && <p>{[shipAddr.city, shipAddr.zip].filter(Boolean).join(", ")}</p>}
                                {shipAddr.country && <p>{shipAddr.country}{shipAddr.country_code && ` (${shipAddr.country_code})`}</p>}
                                {shipAddr.phone && <p className="text-[var(--color-text-muted)] pt-1">{shipAddr.phone}</p>}
                            </div>
                        </Card>
                    )}

                    {/* Shopify fulfillment (non-CJ) */}
                    {isShopify && (
                        <Card title="Shopify fulfillment" icon={Truck}>
                            <div className="px-4 py-3">
                                {order.shopify_order_number && <DetailRow label="Order" value={`#${order.shopify_order_number}`} mono />}
                                {order.shopify_fulfillment_status && <DetailRow label="Status" value={<StatusPill status={order.shopify_fulfillment_status} />} />}
                                {order.tracking_number && !hasCJItems && (
                                    <DetailRow label="Tracking" value={
                                        <Link href={`https://www.17track.net/en/track?nums=${order.tracking_number}`} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline font-mono text-[11px]">
                                            {order.tracking_number}
                                        </Link>
                                    } />
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Timeline */}
                    <Card title="Timeline" icon={Clock}>
                        <div className="px-4 py-3 space-y-0.5">
                            <DetailRow label="Created" value={<span title={absoluteTime(order.created_at ?? "")}>{relativeTime(order.created_at ?? "")}</span>} />
                            {order.paid_at && <DetailRow label="Paid" value={<span title={absoluteTime(order.paid_at)}>{relativeTime(order.paid_at)}</span>} />}
                            {order.shipped_at && <DetailRow label="Shipped" value={<span title={absoluteTime(order.shipped_at)}>{relativeTime(order.shipped_at)}</span>} />}
                            {order.delivered_at && <DetailRow label="Delivered" value={<span title={absoluteTime(order.delivered_at)}>{relativeTime(order.delivered_at)}</span>} />}
                            {order.cancelled_at && <DetailRow label="Cancelled" value={<span title={absoluteTime(order.cancelled_at)}>{relativeTime(order.cancelled_at)}</span>} />}
                            <DetailRow label="Updated" value={<span title={absoluteTime(order.updated_at ?? "")}>{relativeTime(order.updated_at ?? "")}</span>} />
                            {healResult.healedAt && <DetailRow label="Healed" value={<span title={absoluteTime(healResult.healedAt)}>{relativeTime(healResult.healedAt)}</span>} />}
                        </div>
                    </Card>

                    {/* References */}
                    <Card title="References" icon={Hash}>
                        <div className="px-4 py-3">
                            <DetailRow label="Order ID" value={order.id} mono />
                            {order.nowpayments_payment_id && <DetailRow label="NOWPayments" value={String(order.nowpayments_payment_id)} mono />}
                            {order.cj_order_id && <DetailRow label="CJ Order ID" value={order.cj_order_id} mono />}
                            {order.shopify_order_id && <DetailRow label="Shopify Order" value={order.shopify_order_id} mono />}
                        </div>
                    </Card>

                    {/* Webhooks */}
                    {wh.length > 0 && (
                        <Card title={`Webhooks (${wh.length})`} icon={Activity}>
                            <div className="divide-y divide-[var(--color-border)]/60">
                                {wh.slice(0, 5).map((w: any) => (
                                    <Link
                                        key={w.id}
                                        href={`/admin/payments/webhooks?event=${w.id}`}
                                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[var(--color-surface-secondary)]/50 transition-colors"
                                    >
                                        <ProviderLogo provider={w.provider} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <StatusPill status={w.status} />
                                            {w.error && <p className="text-[10px] text-rose-500 truncate mt-0.5 font-mono">{w.error}</p>}
                                            <p className="text-[10.5px] text-[var(--color-text-muted)] mt-0.5">{relativeTime(w.created_at)}</p>
                                        </div>
                                    </Link>
                                ))}
                                {wh.length > 5 && (
                                    <Link href={`/admin/payments/webhooks?order=${order.id}`} className="block px-4 py-2.5 text-[11.5px] font-medium text-orange-500 hover:bg-[var(--color-surface-secondary)]/50 transition-colors">
                                        View all {wh.length} events →
                                    </Link>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}