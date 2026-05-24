// import React from "react";
// import Link from "next/link";
// import { notFound } from "next/navigation";
// import { getAdminDB } from "@/services/db";
// import { cn } from "@/lib/utils";
// import {
//     ArrowLeft, Receipt, User, ShoppingBag,
//     Calendar, Hash, Activity, AlertCircle,
// } from "lucide-react";
// import {
//     StatusPill, ProviderLogo,
// } from "@/components/ui/admin";
// import { verifyFlutterwaveTransaction } from "@/lib/payments/Transaction-verify";

// export const dynamic = "force-dynamic";


// function absoluteTime(iso: string) {
//     return new Date(iso).toLocaleString("en-US", {
//         year: "numeric",
//         month: "short",
//         day: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//         timeZoneName: "short",
//     });
// }

// function relativeTime(iso: string) {
//     const diffMs = Date.now() - new Date(iso).getTime();
//     const mins = Math.floor(diffMs / 60_000);
//     if (mins < 60) return `${mins}m ago`;
//     const hrs = Math.floor(mins / 60);
//     if (hrs < 24) return `${hrs}h ago`;
//     return `${Math.floor(hrs / 24)}d ago`;
// }
// // ─────────────────────────────────────────────────────────────────────────────

// function Card({
//     title, icon: Icon, children,
// }: {
//     title: string;
//     icon: React.ElementType;
//     children: React.ReactNode;
// }) {
//     return (
//         <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-5">
//             <div className="flex items-center gap-2 mb-3">
//                 <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
//                 <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
//                     {title}
//                 </h2>
//             </div>
//             {children}
//         </div>
//     );
// }

// function DetailRow({
//     label, value, mono = false,
// }: { label: string; value: React.ReactNode; mono?: boolean }) {
//     return (
//         <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[var(--color-border)] last:border-0">
//             <span className="text-[11.5px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] shrink-0">
//                 {label}
//             </span>
//             <span className={cn(
//                 "text-[13px] text-[var(--color-text-primary)] text-right min-w-0 break-words",
//                 mono && "font-mono text-[11.5px]",
//             )}>
//                 {value}
//             </span>
//         </div>
//     );
// }

// export default async function TransactionDetailPage({
//     params,
// }: {
//     params: Promise<{ id: string }>;
// }) {
//     const { id } = await params;
//     const admin = getAdminDB();

//     const { data: tx } = await admin
//         .from("transactions")
//         .select(`
//       id, type, direction, amount, currency, amount_usd, exchange_rate,
//       status, provider, provider_transaction_id,
//       reference, description, metadata, created_at, updated_at,
//       user_id, order_id,
//       profiles(id, full_name, email, phone),
//       orders(
//         id, order_number, total_amount, currency, status, payment_status,
//         created_at, paid_at,
//         vendors(business_name)
//       )
//     `)
//         .eq("id", id)
//         .single();

//     if (!tx) notFound();


//     // Replace the unconditional verify call
//     const verify = tx.provider === "flutterwave" && tx.provider_transaction_id
//         ? await verifyFlutterwaveTransaction(tx.provider_transaction_id).catch(() => null)
//         : null;

//     const verifyData = verify?.data ?? null;


//     const buyer = Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles;
//     const order = Array.isArray(tx.orders) ? tx.orders[0] : tx.orders;
//     const vendor = order
//         ? (Array.isArray(order.vendors) ? order.vendors[0] : order.vendors)
//         : null;

//     const { data: webhooks } = tx.order_id
//         ? await admin
//             .from("webhook_events")
//             .select("id, provider, status, error, created_at, idempotency_key")
//             .eq("order_id", tx.order_id)
//             .order("created_at", { ascending: false })
//             .limit(20)
//         : { data: [] };

//     const { data: txWebhook } = await admin
//         .from("transactions")
//         .select("webhook_event_id")
//         .eq("id", id)
//         .single();

//     const metadata = (tx.metadata ?? {}) as Record<string, unknown>;

//     return (
//         <div className="space-y-6">
//             <Link
//                 href="/admin/payments"
//                 className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
//             >
//                 <ArrowLeft className="h-3.5 w-3.5" />
//                 Back to payments
//             </Link>

//             {/* Header */}
//             <div className="flex items-start justify-between gap-4">
//                 <div className="flex items-start gap-4 min-w-0">
//                     <ProviderLogo provider={tx.provider || "stripe"} />
//                     <div className="min-w-0">
//                         <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1.5">
//                             Transaction · {tx.type}
//                         </p>
//                         <h1 className="text-xl font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]">
//                             {Number(tx.amount).toLocaleString()} {tx.currency}
//                         </h1>
//                         {tx.amount_usd && tx.currency !== "USD" && (
//                             <p className="text-[12.5px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
//                                 ≈ ${Number(tx.amount_usd).toFixed(2)} USD
//                                 {tx.exchange_rate && ` · @ ${Number(tx.exchange_rate).toFixed(2)}`}
//                             </p>
//                         )}
//                     </div>
//                 </div>
//                 <StatusPill status={tx.status} size="md" />
//             </div>

//             {verifyData && (
//                 <Card title="Live verification" icon={Activity}>
//                     <DetailRow
//                         label="Status"
//                         value={<StatusPill status={verifyData.status} />}
//                     />
//                     <DetailRow
//                         label="Amount"
//                         value={`${Number(verifyData.amount).toLocaleString()} ${verifyData.currency}`}
//                     />
//                     {verifyData.tx_ref && (
//                         <DetailRow label="Tx ref" value={verifyData.tx_ref} mono />
//                     )}
//                     {verifyData.flw_ref && (
//                         <DetailRow label="FLW ref" value={verifyData.flw_ref} mono />
//                     )}
//                     {verifyData.payment_type && (
//                         <DetailRow label="Method" value={verifyData.payment_type} />
//                     )}
//                     {verifyData.customer?.email && (
//                         <DetailRow label="Customer" value={verifyData.customer.email} />
//                     )}
//                     {verifyData.created_at && (
//                         <DetailRow label="Settled at" value={absoluteTime(verifyData.created_at)} />
//                     )}

//                     {/* Mismatch warning */}
//                     {verifyData.status === "successful" && tx.status !== "completed" && tx.status !== "paid" && (
//                         <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-500/20">
//                             <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
//                             <p className="text-[11.5px] text-amber-700 dark:text-amber-300">
//                                 Flutterwave reports success but local status is <strong>{tx.status}</strong>. Webhook may have failed.
//                             </p>
//                         </div>
//                     )}
//                 </Card>
//             )}

//             {/* Stuck transaction alert */}
//             {tx.status === "pending" &&
//                 new Date(tx.created_at).getTime() < Date.now() - 6 * 60 * 60_000 && (
//                     <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-500/20">
//                         <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
//                         <div className="flex-1 min-w-0">
//                             <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">
//                                 Stuck in pending for {relativeTime(tx.created_at)}
//                             </p>
//                             <p className="text-[12px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
//                                 The webhook may have failed. Check the webhook log below or verify with the provider directly.
//                             </p>
//                         </div>
//                     </div>
//                 )}

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//                 {/* Left — transaction details + metadata + webhooks */}
//                 <div className="lg:col-span-2 space-y-4">
//                     <Card title="Transaction details" icon={Receipt}>
//                         <DetailRow label="ID" value={tx.id} mono />
//                         <DetailRow
//                             label="Provider tx ID"
//                             value={tx.provider_transaction_id ?? "—"}
//                             mono
//                         />
//                         {tx.reference && (
//                             <DetailRow label="Reference" value={tx.reference} mono />
//                         )}
//                         <DetailRow
//                             label="Type"
//                             value={
//                                 <span className="capitalize">
//                                     {tx.type} · {tx.direction}
//                                 </span>
//                             }
//                         />
//                         <DetailRow
//                             label="Provider"
//                             value={<span className="capitalize">{tx.provider ?? "—"}</span>}
//                         />
//                         <DetailRow label="Description" value={tx.description ?? "—"} />
//                         <DetailRow label="Created" value={absoluteTime(tx.created_at)} />
//                         <DetailRow label="Last updated" value={absoluteTime(tx.updated_at)} />
//                         {txWebhook?.webhook_event_id && (
//                             <DetailRow
//                                 label="Webhook event"
//                                 value={
//                                     <Link
//                                         href={`/admin/payments/webhooks?event=${txWebhook.webhook_event_id}`}
//                                         className="font-mono text-orange-500 hover:underline text-[11.5px]"
//                                     >
//                                         {txWebhook.webhook_event_id.slice(0, 18)}…
//                                     </Link>
//                                 }
//                             />
//                         )}
//                     </Card>

//                     {Object.keys(metadata).length > 0 && (
//                         <Card title="Metadata" icon={Hash}>
//                             <pre className="text-[11px] font-mono leading-relaxed text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] p-3 rounded-lg overflow-x-auto">
//                                 {JSON.stringify(metadata, null, 2)}
//                             </pre>
//                         </Card>
//                     )}

//                     {webhooks && webhooks.length > 0 && (
//                         <Card title={`Webhook events (${webhooks.length})`} icon={Activity}>
//                             <div className="space-y-1.5 -mx-1">
//                                 {webhooks.map((w: any) => (
//                                     <Link
//                                         key={w.id}
//                                         href={`/admin/payments/webhooks?event=${w.id}`}
//                                         className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--color-surface-secondary)] transition-colors"
//                                     >
//                                         <div className="flex items-center gap-3 min-w-0">
//                                             <ProviderLogo provider={w.provider} size="sm" />
//                                             <div className="min-w-0">
//                                                 <p className="text-[12.5px] text-[var(--color-text-primary)] truncate">
//                                                     {w.idempotency_key ?? w.id.slice(0, 18)}
//                                                 </p>
//                                                 <p className="text-[10.5px] text-[var(--color-text-muted)]">
//                                                     {relativeTime(w.created_at)}
//                                                 </p>
//                                             </div>
//                                         </div>
//                                         <StatusPill status={w.status} />
//                                     </Link>
//                                 ))}
//                             </div>
//                         </Card>
//                     )}
//                 </div>

//                 {/* Sidebar */}
//                 <div className="space-y-4">
//                     {buyer && (
//                         <Card title="Buyer" icon={User}>
//                             <DetailRow label="Name" value={buyer.full_name ?? "—"} />
//                             <DetailRow label="Email" value={buyer.email ?? "—"} />
//                             {buyer.phone && <DetailRow label="Phone" value={buyer.phone} />}
//                             <DetailRow
//                                 label="Profile"
//                                 value={
//                                     <Link
//                                         href={`/admin/users/${buyer.id}`}
//                                         className="text-orange-500 hover:underline"
//                                     >
//                                         View →
//                                     </Link>
//                                 }
//                             />
//                         </Card>
//                     )}

//                     {order && (
//                         <Card title="Order" icon={ShoppingBag}>
//                             <DetailRow
//                                 label="Number"
//                                 value={
//                                     <Link
//                                         href={`/admin/orders/${order.id}`}
//                                         className="font-mono text-orange-500 hover:underline"
//                                     >
//                                         {order.order_number}
//                                     </Link>
//                                 }
//                             />
//                             <DetailRow
//                                 label="Total"
//                                 value={`${Number(order.total_amount).toLocaleString()} ${order.currency}`}
//                             />
//                             <DetailRow
//                                 label="Payment"
//                                 value={<StatusPill status={order.payment_status} />}
//                             />
//                             <DetailRow
//                                 label="Fulfillment"
//                                 value={<StatusPill status={order.status} />}
//                             />
//                             {vendor && (
//                                 <DetailRow label="Vendor" value={vendor.business_name} />
//                             )}
//                             {order.paid_at && (
//                                 <DetailRow label="Paid at" value={absoluteTime(order.paid_at)} />
//                             )}
//                         </Card>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }


import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminDB } from "@/services/db";
import { cn } from "@/lib/utils";
import {
    ArrowLeft, Receipt, User, ShoppingBag,
    Calendar, Hash, Activity, AlertCircle,
    CheckCircle2, XCircle, RefreshCw, Zap,
} from "lucide-react";
import { StatusPill, ProviderLogo } from "@/components/ui/admin";
import { autoHealTransaction } from "@/lib/actions/auto-heal-transaction";

export const dynamic = "force-dynamic";

export const revalidate = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function absoluteTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        timeZoneName: "short",
    });
}

function relativeTime(iso: string) {
    const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function Card({ title, icon: Icon, children, badge }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    badge?: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                        {title}
                    </h2>
                </div>
                {badge}
            </div>
            {children}
        </div>
    );
}

function DetailRow({ label, value, mono = false }: {
    label: string; value: React.ReactNode; mono?: boolean;
}) {
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

function AutoHealBadge({ result }: { result: AutoHealResult }) {
    if (result.action === "none") return null;
    const isHealed = result.action !== "error";
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium tracking-tight border",
            isHealed
                ? "bg-transparent text-emerald-600 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20"
                : "bg-transparent text-rose-500 border-rose-500/30 dark:text-rose-400 dark:border-rose-500/20",
        )}>
            <span className={cn(
                "w-1 h-1 rounded-full shrink-0",
                isHealed ? "bg-emerald-500" : "bg-rose-500",
            )} />
            {isHealed ? `healed · ${result.action}` : "heal failed"}
        </span>
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AutoHealResult = {
    action: "completed" | "failed" | "none" | "error";
    reason: string;
    healedAt?: string;
};

type VerifyResult = {
    status: string;
    amount: number;
    currency: string;
    tx_ref?: string;
    flw_ref?: string;
    payment_type?: string;
    customer?: { email?: string };
    created_at?: string;
    [key: string]: unknown;
};

// ─── Per-provider verification ────────────────────────────────────────────────

async function verifyTransaction(
    provider: string,
    providerTxId: string,
    metadata: Record<string, unknown>,
): Promise<{ data: VerifyResult | null; raw: unknown }> {
    try {
        switch (provider) {
            case "flutterwave": {
                const { verifyFlutterwaveTransaction } = await import(
                    "@/lib/payments/Transaction-verify"
                );
                const res = await verifyFlutterwaveTransaction(providerTxId);
                return { data: res?.data ?? null, raw: res };
            }

            case "binance": {
                // Binance Pay: query order status via prepay_id or merchantTradeNo
                const prepayId = (metadata?.prepay_id as string) ?? providerTxId;
                const apiKey = process.env.BINANCE_PAY_API_KEY!;
                const apiSecret = process.env.BINANCE_PAY_API_SECRET!;
                const timestamp = Date.now();
                const nonce = Math.random().toString(36).slice(2, 10).toUpperCase();
                const body = JSON.stringify({ merchantTradeNo: providerTxId });
                const payload = `${timestamp}\n${nonce}\n${body}\n`;
                const { createHmac } = await import("crypto");
                const signature = createHmac("sha512", apiSecret)
                    .update(payload)
                    .digest("hex")
                    .toUpperCase();

                const res = await fetch(
                    "https://bpay.binanceapi.com/binancepay/openapi/v2/order/query",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "BinancePay-Timestamp": String(timestamp),
                            "BinancePay-Nonce": nonce,
                            "BinancePay-Certificate-SN": apiKey,
                            "BinancePay-Signature": signature,
                        },
                        body,
                        signal: AbortSignal.timeout(8_000),
                    }
                );

                const json = await res.json() as {
                    status: string;
                    data?: {
                        status: string;
                        totalFee: string;
                        currency: string;
                        merchantTradeNo: string;
                        transactionId?: string;
                        createTime?: number;
                    };
                };
                if (json.status !== "SUCCESS" || !json.data) return { data: null, raw: json };
                const d = json.data;
                return {
                    data: {
                        status: d.status === "PAID" ? "successful" : d.status.toLowerCase(),
                        amount: parseFloat(d.totalFee),
                        currency: d.currency,
                        tx_ref: d.merchantTradeNo,
                        flw_ref: d.transactionId,
                        created_at: d.createTime
                            ? new Date(d.createTime).toISOString()
                            : undefined,
                    },
                    raw: json,
                };
            }

            case "pesapal": {
                // PesaPal: query IPN status
                const trackingId = (metadata?.pesapal_transaction_tracking_id as string)
                    ?? providerTxId;
                // Get token first
                const tokenRes = await fetch(
                    `${process.env.PESAPAL_BASE_URL}/api/Auth/RequestToken`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        body: JSON.stringify({
                            consumer_key: process.env.PESAPAL_CONSUMER_KEY,
                            consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
                        }),
                        signal: AbortSignal.timeout(8_000),
                    }
                );
                const tokenJson = await tokenRes.json() as { token?: string };
                if (!tokenJson.token) return { data: null, raw: tokenJson };

                const statusRes = await fetch(
                    `${process.env.PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`,
                    {
                        headers: { Authorization: `Bearer ${tokenJson.token}`, Accept: "application/json" },
                        signal: AbortSignal.timeout(8_000),
                    }
                );
                const statusJson = await statusRes.json() as {
                    payment_status_description?: string;
                    amount?: number;
                    currency?: string;
                    order_tracking_id?: string;
                    confirmation_code?: string;
                    payment_method?: string;
                    created_date?: string;
                };
                const rawStatus = statusJson.payment_status_description?.toLowerCase() ?? "unknown";
                return {
                    data: {
                        status: rawStatus === "completed" ? "successful" : rawStatus,
                        amount: statusJson.amount ?? 0,
                        currency: statusJson.currency ?? "",
                        tx_ref: statusJson.order_tracking_id,
                        flw_ref: statusJson.confirmation_code,
                        payment_type: statusJson.payment_method,
                        created_at: statusJson.created_date,
                    },
                    raw: statusJson,
                };
            }

            case "pawapay": {
                const res = await fetch(
                    `https://api.pawapay.io/payouts/${providerTxId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.PAWAPAY_API_KEY}`,
                            "Content-Type": "application/json",
                        },
                        signal: AbortSignal.timeout(8_000),
                    }
                );
                const json = await res.json() as Array<{
                    status?: string;
                    depositId?: string;
                    amount?: string;
                    currency?: string;
                    created?: string;
                }>;
                const d = Array.isArray(json) ? json[0] : null;
                if (!d) return { data: null, raw: json };
                return {
                    data: {
                        status: d.status?.toLowerCase() === "completed" ? "successful" : (d.status?.toLowerCase() ?? "unknown"),
                        amount: parseFloat(d.amount ?? "0"),
                        currency: d.currency ?? "",
                        tx_ref: d.depositId,
                        created_at: d.created,
                    },
                    raw: json,
                };
            }

            case "nowpayments": {
                const res = await fetch(
                    `https://api.nowpayments.io/v1/payment/${providerTxId}`,
                    {
                        headers: { "x-api-key": process.env.NOWPAYMENTS_API_KEY! },
                        signal: AbortSignal.timeout(8_000),
                    }
                );
                const json = await res.json() as {
                    payment_status?: string;
                    actually_paid?: number;
                    pay_currency?: string;
                    payment_id?: string | number;
                    created_at?: string;
                };
                return {
                    data: {
                        status: json.payment_status === "finished" ? "successful" : (json.payment_status ?? "unknown"),
                        amount: json.actually_paid ?? 0,
                        currency: json.pay_currency ?? "",
                        tx_ref: String(json.payment_id ?? ""),
                        created_at: json.created_at,
                    },
                    raw: json,
                };
            }

            default:
                return { data: null, raw: null };
        }
    } catch (err) {
        console.warn(`[verify] ${provider} verification failed`, err);
        return { data: null, raw: null };
    }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
            user_id, order_id, webhook_event_id,
            profiles(id, full_name, email, phone),
            orders(
                id, order_number, total_amount, currency, status, payment_status,
                created_at, paid_at,
                vendors!orders_vendor_id_fkey(business_name)
            )
        `)
        .eq("id", id)
        .single();

    if (!tx) notFound();

    const metadata = (tx.metadata ?? {}) as Record<string, unknown>;

    // ── Live verification (all providers) ─────────────────────────────────────
    const { data: verifyData } = tx.provider && tx.provider_transaction_id
        ? await verifyTransaction(tx.provider, tx.provider_transaction_id, metadata)
        : { data: null };

    // ── Auto-heal ─────────────────────────────────────────────────────────────
    // Conditions that trigger automatic healing (no human needed):
    //   1. Provider reports success but local status is still pending/processing
    //   2. Transaction stuck pending for > 1 hour (likely missed webhook)
    const isStuck =
        tx.status === "pending" &&
        new Date(tx.created_at).getTime() < Date.now() - 60 * 60_000;

    const providerSaysSuccess =
        verifyData?.status === "successful" &&
        tx.status !== "completed" &&
        tx.status !== "paid";

    const shouldAutoHeal = providerSaysSuccess || isStuck;

    let healResult: AutoHealResult = { action: "none", reason: "No heal needed" };

    if (shouldAutoHeal) {
        healResult = await autoHealTransaction({
            transactionId: tx.id,
            orderId: tx.order_id,
            provider: tx.provider ?? "",
            providerTxId: tx.provider_transaction_id ?? "",
            verifiedStatus: verifyData?.status ?? null,
            isStuck,
        });
    }

    // Re-fetch tx after potential heal so the UI shows the latest status
    const { data: freshTx } = healResult.action !== "none"
        ? await admin
            .from("transactions")
            .select("status, updated_at, orders(status, payment_status, paid_at)")
            .eq("id", id)
            .single()
        : { data: null };

    const displayTx = {
        ...tx,
        status: freshTx?.status ?? tx.status,
        updated_at: freshTx?.updated_at ?? tx.updated_at,
    };

    const buyer = Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles;
    const order = Array.isArray(tx.orders) ? tx.orders[0] : tx.orders;
    const freshOrder = freshTx
        ? (Array.isArray((freshTx as any).orders) ? (freshTx as any).orders[0] : (freshTx as any).orders)
        : null;
    const displayOrder = freshOrder ? { ...order, ...freshOrder } : order;
    const vendor = order
        ? (Array.isArray(order.vendors) ? order.vendors[0] : order.vendors)
        : null;

    const { data: webhooks } = tx.order_id
        ? await admin
            .from("webhook_events")
            .select("id, provider, status, error, created_at, idempotency_key")
            .eq("order_id", tx.order_id)
            .order("created_at", { ascending: false })
            .limit(20)
        : { data: [] };

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
                    <ProviderLogo provider={tx.provider ?? "stripe"} size="lg" />
                    <div className="min-w-0">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1.5">
                            Transaction · {tx.type}
                            {healResult.action !== "none" && (
                                <span className="ml-2">
                                    <AutoHealBadge result={healResult} />
                                </span>
                            )}
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
                <StatusPill status={displayTx.status} size="md" />
            </div>

            {/* Auto-heal result banner */}
            {healResult.action !== "none" && (
                <div className={cn(
                    "rounded-lg border px-4 py-3 font-mono",
                    healResult.action === "error"
                        ? "border-rose-500/20 bg-rose-500/[0.03] dark:bg-rose-500/[0.06]"
                        : "border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06]",
                )}>
                    <div className="flex items-center gap-2 text-[11px]">
                        <span className={cn(
                            "shrink-0",
                            healResult.action === "error" ? "text-rose-500" : "text-emerald-500",
                        )}>
                            {healResult.action === "error" ? "✗" : "✓"}
                        </span>
                        <span className={cn(
                            "font-semibold tracking-tight",
                            healResult.action === "error"
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400",
                        )}>
                            {healResult.action === "error" ? "heal_failed" : `healed → ${healResult.action}`}
                        </span>
                        {healResult.healedAt && (
                            <span className="ml-auto text-[10px] text-[var(--color-text-muted)] tabular-nums">
                                {absoluteTime(healResult.healedAt)}
                            </span>
                        )}
                    </div>
                    <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)] leading-relaxed pl-4">
                        {healResult.reason}
                    </p>
                </div>
            )}

            {verifyData && (
                <Card
                    title="Live verification"
                    icon={Activity}
                    badge={
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                            <RefreshCw className="h-2.5 w-2.5 inline mr-1" />
                            Live from {tx.provider}
                        </span>
                    }
                >
                    <DetailRow label="Status" value={<StatusPill status={verifyData.status} />} />
                    <DetailRow
                        label="Amount"
                        value={`${Number(verifyData.amount).toLocaleString()} ${verifyData.currency}`}
                    />
                    {verifyData.tx_ref && (
                        <DetailRow label="Tx ref" value={verifyData.tx_ref} mono />
                    )}
                    {verifyData.flw_ref && (
                        <DetailRow label="Provider ref" value={verifyData.flw_ref} mono />
                    )}
                    {verifyData.payment_type && (
                        <DetailRow label="Method" value={verifyData.payment_type} />
                    )}
                    {verifyData.customer?.email && (
                        <DetailRow label="Customer" value={verifyData.customer.email} />
                    )}
                    {verifyData.created_at && (
                        <DetailRow label="Settled at" value={absoluteTime(verifyData.created_at)} />
                    )}

                    {/* Mismatch warning — only shown if auto-heal didn't fix it */}
                    {verifyData.status === "successful" &&
                        displayTx.status !== "completed" &&
                        displayTx.status !== "paid" &&
                        healResult.action === "error" && (
                            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-500/20">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[11.5px] text-amber-700 dark:text-amber-300">
                                    {tx.provider} reports success but auto-heal failed.
                                    Local status is still <strong>{displayTx.status}</strong>.
                                    Manual intervention may be needed.
                                </p>
                            </div>
                        )}
                </Card>
            )}

            {/* Stuck alert — only if heal didn't fire or failed */}
            {isStuck && healResult.action === "none" && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-500/20">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                            Stuck pending for {relativeTime(tx.created_at)}
                        </p>
                        <p className="text-[12px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                            Provider could not be reached for verification. Check webhook log below.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left column */}
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
                            value={<span className="capitalize">{tx.type} · {tx.direction}</span>}
                        />
                        <DetailRow
                            label="Provider"
                            value={
                                <span className="inline-flex items-center gap-1.5">
                                    <ProviderLogo provider={tx.provider ?? ""} size="sm" showLabel />
                                </span>
                            }
                        />
                        <DetailRow label="Description" value={tx.description ?? "—"} />
                        <DetailRow label="Created" value={absoluteTime(tx.created_at)} />
                        <DetailRow label="Last updated" value={absoluteTime(displayTx.updated_at)} />
                        {tx.webhook_event_id && (
                            <DetailRow
                                label="Webhook event"
                                value={
                                    <Link
                                        href={`/admin/payments/webhooks?event=${tx.webhook_event_id}`}
                                        className="font-mono text-orange-500 hover:underline text-[11.5px]"
                                    >
                                        {tx.webhook_event_id.slice(0, 18)}…
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
                                {(webhooks as any[]).map((w) => (
                                    <Link
                                        key={w.id}
                                        href={`/admin/payments/webhooks?event=${w.id}`}
                                        className={cn(
                                            "flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--color-surface-secondary)] transition-colors",
                                            tx.webhook_event_id === w.id &&
                                            "ring-1 ring-orange-400/40 bg-orange-50/50 dark:bg-orange-950/10",
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <ProviderLogo provider={w.provider} size="sm" />
                                            <div className="min-w-0">
                                                <p className="text-[12.5px] text-[var(--color-text-primary)] truncate">
                                                    {w.idempotency_key ?? w.id.slice(0, 18)}
                                                    {tx.webhook_event_id === w.id && (
                                                        <span className="ml-1.5 text-[10px] text-orange-500 font-semibold">
                                                            linked
                                                        </span>
                                                    )}
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
                                    <Link href={`/admin/users/${buyer.id}`} className="text-orange-500 hover:underline">
                                        View →
                                    </Link>
                                }
                            />
                        </Card>
                    )}

                    {displayOrder && (
                        <Card title="Order" icon={ShoppingBag}>
                            <DetailRow
                                label="Number"
                                value={
                                    <Link href={`/admin/orders/${displayOrder.id}`} className="font-mono text-orange-500 hover:underline">
                                        {displayOrder.order_number}
                                    </Link>
                                }
                            />
                            <DetailRow
                                label="Total"
                                value={`${Number(displayOrder.total_amount).toLocaleString()} ${displayOrder.currency}`}
                            />
                            <DetailRow
                                label="Payment"
                                value={<StatusPill status={displayOrder.payment_status} />}
                            />
                            <DetailRow
                                label="Fulfillment"
                                value={<StatusPill status={displayOrder.status} />}
                            />
                            {vendor && (
                                <DetailRow label="Vendor" value={vendor.business_name} />
                            )}
                            {displayOrder.paid_at && (
                                <DetailRow label="Paid at" value={absoluteTime(displayOrder.paid_at)} />
                            )}
                        </Card>
                    )}

                    <Card title="Timeline" icon={Calendar}>
                        <DetailRow label="Created" value={relativeTime(tx.created_at)} />
                        <DetailRow label="Updated" value={relativeTime(displayTx.updated_at)} />
                        {healResult.healedAt && (
                            <DetailRow label="Healed" value={relativeTime(healResult.healedAt)} />
                        )}
                        {order?.created_at && (
                            <DetailRow label="Order placed" value={relativeTime(order.created_at)} />
                        )}
                        {displayOrder?.paid_at && (
                            <DetailRow label="Order paid" value={relativeTime(displayOrder.paid_at)} />
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}