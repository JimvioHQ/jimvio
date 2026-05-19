import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminDB } from "@/services/db";
import { cn } from "@/lib/utils";
import {
    ArrowLeft, Receipt, User, ShoppingBag,
    Calendar, Hash, Activity, AlertCircle,
} from "lucide-react";
import {
    StatusPill, ProviderLogo, absoluteTime, relativeTime,
} from "@/components/ui/admin";

export const dynamic = "force-dynamic";

function Card({
    title, icon: Icon, children,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-5">
            <div className="flex items-center gap-2 mb-3">
                <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    {title}
                </h2>
            </div>
            {children}
        </div>
    );
}

function DetailRow({
    label, value, mono = false,
}: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[var(--color-border)] last:border-0">
            <span className="text-[11.5px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] shrink-0">
                {label}
            </span>
            <span className={cn(
                "text-[13px] text-[var(--color-text-primary)] text-right min-w-0 break-words",
                mono && "font-mono text-[11.5px]",
            )}>
                {value}
            </span>
        </div>
    );
}

export default async function TransactionDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const admin = getAdminDB();

    const { data: tx } = await admin
        .from("transactions")
        .select(`
      id, type, direction, amount, currency, amount_usd, exchange_rate,
      status, provider, provider_transaction_id,
      reference, description, metadata, created_at, updated_at,
      user_id, order_id,
      profiles(id, full_name, email, phone),
      orders(
        id, order_number, total_amount, currency, status, payment_status,
        created_at, paid_at,
        vendors(business_name)
      )
    `)
        .eq("id", id)
        .single();

    if (!tx) notFound();

    const buyer = Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles;
    const order = Array.isArray(tx.orders) ? tx.orders[0] : tx.orders;
    const vendor = order
        ? (Array.isArray(order.vendors) ? order.vendors[0] : order.vendors)
        : null;

    // Related webhook events via order_id
    const { data: webhooks } = tx.order_id
        ? await admin
            .from("webhook_events")
            .select("id, provider, status, error, created_at, idempotency_key")
            .eq("order_id", tx.order_id)
            .order("created_at", { ascending: false })
            .limit(20)
        : { data: [] };

    // Also try to find webhook by tx's own webhook_event_id
    const { data: txWebhook } = await admin
        .from("transactions")
        .select("webhook_event_id")
        .eq("id", id)
        .single();

    const metadata = (tx.metadata ?? {}) as Record<string, unknown>;

    return (
        <div className="space-y-6">
            <Link
                href="/admin/payments"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to payments
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                    <ProviderLogo provider={tx.provider || "stripe"} />
                    <div className="min-w-0">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1.5">
                            Transaction · {tx.type}
                        </p>
                        <h1 className="text-xl font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]">
                            {Number(tx.amount).toLocaleString()} {tx.currency}
                        </h1>
                        {tx.amount_usd && tx.currency !== "USD" && (
                            <p className="text-[12.5px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                                ≈ ${Number(tx.amount_usd).toFixed(2)} USD
                                {tx.exchange_rate && ` · @ ${Number(tx.exchange_rate).toFixed(4)}`}
                            </p>
                        )}
                    </div>
                </div>
                <StatusPill status={tx.status} size="md" />
            </div>

            {/* Stuck transaction alert */}
            {tx.status === "pending" &&
                new Date(tx.created_at).getTime() < Date.now() - 6 * 60 * 60_000 && (
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-500/20">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                                Stuck in pending for {relativeTime(tx.created_at)}
                            </p>
                            <p className="text-[12px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                                The webhook may have failed. Check the webhook log below or verify with the provider directly.
                            </p>
                        </div>
                    </div>
                )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left — transaction details + metadata + webhooks */}
                <div className="lg:col-span-2 space-y-4">
                    <Card title="Transaction details" icon={Receipt}>
                        <DetailRow label="ID" value={tx.id} mono />
                        <DetailRow
                            label="Provider tx ID"
                            value={tx.provider_transaction_id ?? "—"}
                            mono
                        />
                        {tx.reference && (
                            <DetailRow label="Reference" value={tx.reference} mono />
                        )}
                        <DetailRow
                            label="Type"
                            value={
                                <span className="capitalize">
                                    {tx.type} · {tx.direction}
                                </span>
                            }
                        />
                        <DetailRow
                            label="Provider"
                            value={<span className="capitalize">{tx.provider ?? "—"}</span>}
                        />
                        <DetailRow label="Description" value={tx.description ?? "—"} />
                        <DetailRow label="Created" value={absoluteTime(tx.created_at)} />
                        <DetailRow label="Last updated" value={absoluteTime(tx.updated_at)} />
                        {txWebhook?.webhook_event_id && (
                            <DetailRow
                                label="Webhook event"
                                value={
                                    <Link
                                        href={`/admin/payments/webhooks?event=${txWebhook.webhook_event_id}`}
                                        className="font-mono text-orange-500 hover:underline text-[11.5px]"
                                    >
                                        {txWebhook.webhook_event_id.slice(0, 18)}…
                                    </Link>
                                }
                            />
                        )}
                    </Card>

                    {Object.keys(metadata).length > 0 && (
                        <Card title="Metadata" icon={Hash}>
                            <pre className="text-[11px] font-mono leading-relaxed text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] p-3 rounded-lg overflow-x-auto">
                                {JSON.stringify(metadata, null, 2)}
                            </pre>
                        </Card>
                    )}

                    {webhooks && webhooks.length > 0 && (
                        <Card title={`Webhook events (${webhooks.length})`} icon={Activity}>
                            <div className="space-y-1.5 -mx-1">
                                {webhooks.map((w: any) => (
                                    <Link
                                        key={w.id}
                                        href={`/admin/payments/webhooks?event=${w.id}`}
                                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--color-surface-secondary)] transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <ProviderLogo provider={w.provider} size="sm" />
                                            <div className="min-w-0">
                                                <p className="text-[12.5px] text-[var(--color-text-primary)] truncate">
                                                    {w.idempotency_key ?? w.id.slice(0, 18)}
                                                </p>
                                                <p className="text-[10.5px] text-[var(--color-text-muted)]">
                                                    {relativeTime(w.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <StatusPill status={w.status} />
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {buyer && (
                        <Card title="Buyer" icon={User}>
                            <DetailRow label="Name" value={buyer.full_name ?? "—"} />
                            <DetailRow label="Email" value={buyer.email ?? "—"} />
                            {buyer.phone && <DetailRow label="Phone" value={buyer.phone} />}
                            <DetailRow
                                label="Profile"
                                value={
                                    <Link
                                        href={`/admin/users/${buyer.id}`}
                                        className="text-orange-500 hover:underline"
                                    >
                                        View →
                                    </Link>
                                }
                            />
                        </Card>
                    )}

                    {order && (
                        <Card title="Order" icon={ShoppingBag}>
                            <DetailRow
                                label="Number"
                                value={
                                    <Link
                                        href={`/admin/orders/${order.id}`}
                                        className="font-mono text-orange-500 hover:underline"
                                    >
                                        {order.order_number}
                                    </Link>
                                }
                            />
                            <DetailRow
                                label="Total"
                                value={`${Number(order.total_amount).toLocaleString()} ${order.currency}`}
                            />
                            <DetailRow
                                label="Payment"
                                value={<StatusPill status={order.payment_status} />}
                            />
                            <DetailRow
                                label="Fulfillment"
                                value={<StatusPill status={order.status} />}
                            />
                            {vendor && (
                                <DetailRow label="Vendor" value={vendor.business_name} />
                            )}
                            {order.paid_at && (
                                <DetailRow label="Paid at" value={absoluteTime(order.paid_at)} />
                            )}
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}