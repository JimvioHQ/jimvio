import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyFlutterwaveTransaction } from "@/lib/payments/Transaction-verify";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

const PENDING_TTL_MS = 60 * 60 * 1000; // 1 hour

export type SanitizedOrder = {
    id: string;
    order_number: string | null;
    total_amount: number;
    currency: string | null;
    created_at: string;
    vendor_name: string | null;
    item_count: number;
    last_tx_status: "pending" | "failed" | null;
    can_retry: boolean;
};

// provider_transaction_id stores the tx_ref before payment (e.g. "FLW_ABC123")
// and the numeric ID after payment completes (e.g. "12345678").
// Flutterwave's verify endpoint only accepts numeric IDs.
function isNumericFlwId(id: string | null | undefined): boolean {
    return !!id && /^\d+$/.test(String(id));
}

export async function sanitizePendingOrders(
    db: SupabaseClient,
    userId: string
): Promise<SanitizedOrder[]> {
    const now = new Date();

    const { data: rawOrders, error } = await db
        .from("orders")
        .select(`
            id, order_number, total_amount, currency, created_at,
            vendors ( business_name ),
            order_items ( id ),
            transactions (
                id, status, provider, provider_transaction_id, created_at
            )
        `)
        .eq("buyer_id", userId)
        .eq("payment_status", "pending")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error || !rawOrders?.length) return [];

    const actionable: SanitizedOrder[] = [];

    const push = (
        order: any,
        vendor: any,
        txStatus: SanitizedOrder["last_tx_status"],
        canRetry: boolean
    ) => {
        actionable.push({
            id: order.id,
            order_number: order.order_number,
            total_amount: Number(order.total_amount),
            currency: order.currency,
            created_at: order.created_at,
            vendor_name: vendor?.business_name ?? null,
            item_count: order.order_items?.length ?? 0,
            last_tx_status: txStatus,
            can_retry: canRetry,
        });
    };

    const cancel = async (order: any, reason: string) => {
        await db
            .from("orders")
            .update({
                status: "cancelled",
                payment_status: "failed",
                updated_at: now.toISOString(),
            })
            .eq("id", order.id)
            .eq("payment_status", "pending");

        const ageMin = Math.round(
            (now.getTime() - new Date(order.created_at).getTime()) / 60_000
        );
        console.log(`[sanitize] Cancelled order ${order.id} — ${reason} (${ageMin}m old)`);
    };

    await Promise.allSettled(
        rawOrders.map(async (order: any) => {
            const vendor = Array.isArray(order.vendors)
                ? order.vendors[0]
                : order.vendors;

            const transactions: any[] = order.transactions ?? [];
            const latestTx = transactions
                .sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
                .at(0) ?? null;

            const ageMs = now.getTime() - new Date(order.created_at).getTime();
            const isStale = ageMs > PENDING_TTL_MS;

            // ── No transaction ──────────────────────────────────────────────
            if (!latestTx) {
                if (isStale) {
                    await cancel(order, "no transaction, stale");
                } else {
                    // Fresh order — user hasn't started payment yet
                    push(order, vendor, null, true);
                }
                return;
            }

            // ── Flutterwave transaction ─────────────────────────────────────
            if (latestTx.provider === "flutterwave") {
                const txId = latestTx.provider_transaction_id;
                if (!isNumericFlwId(txId)) {
                    if (isStale) {
                        await db
                            .from("transactions")
                            .update({ status: "failed", updated_at: now.toISOString() })
                            .eq("id", latestTx.id)
                            .eq("status", "pending");

                        await cancel(order, "stale tx_ref, never completed");
                    } else {
                        push(order, vendor, "pending", true);
                    }
                    return;
                }

                try {
                    const verify = await verifyFlutterwaveTransaction(txId);
                    const flwStatus = verify?.data?.status;

                    if (flwStatus === "successful") {
                        await finalizeOrderPayment(db, order.id, {
                            providerTransactionId: txId,
                            providerReference: verify.data.tx_ref,
                            paidAtIso: verify.data.created_at || now.toISOString(),
                            notifyUserId: userId,
                            amountForMessage: Number(order.total_amount),
                            paymentProvider: "flutterwave",
                        });
                        console.log(`[sanitize] Silently finalized order ${order.id}`);
                        return;
                    }

                    if (flwStatus === "failed" || isStale) {
                        await db
                            .from("orders")
                            .update({ payment_status: "failed", updated_at: now.toISOString() })
                            .eq("id", order.id)
                            .eq("payment_status", "pending");

                        await db
                            .from("transactions")
                            .update({ status: "failed", updated_at: now.toISOString() })
                            .eq("id", latestTx.id)
                            .eq("status", "pending");

                        push(order, vendor, "failed", true);
                        return;
                    }
                    push(order, vendor, "pending", !isStale);

                } catch (err: any) {
                    const isNotFound =
                        err?.message?.toLowerCase().includes("no transaction") ||
                        err?.statusCode === 400 ||
                        err?.statusCode === 404;

                    if (!isNotFound) {
                        console.warn(
                            `[sanitize] Unexpected verify error for order ${order.id}:`,
                            err?.message
                        );
                    }

                    // Keep as retryable regardless
                    push(order, vendor, "pending", !isStale);
                }
                return;
            }

            // ── Other provider or no ID ─────────────────────────────────────
            if (isStale) {
                await cancel(order, `${latestTx.provider ?? "unknown"} tx stale`);
            } else {
                const txStatus = latestTx.status === "failed" ? "failed" : "pending";
                push(order, vendor, txStatus, true);
            }
        })
    );

    return actionable;
}