"use server";

import { getAdminDB } from "@/services/db";
import { recordBothStatusChanges } from "@/lib/payments/record-status-change";

export type AutoHealResult = {
    action: "completed" | "failed" | "none" | "error";
    reason: string;
    healedAt?: string;
};

type HealInput = {
    transactionId: string;
    orderId: string | null;
    provider: string;
    providerTxId: string;
    verifiedStatus: string | null;
    isStuck: boolean;
};

export async function autoHealTransaction(input: HealInput): Promise<AutoHealResult> {
    const { transactionId, orderId, provider, verifiedStatus, isStuck } = input;
    const admin = getAdminDB();
    const now = new Date().toISOString();

    const { data: current } = await admin
        .from("transactions")
        .select("status")
        .eq("id", transactionId)
        .single();

    if (!current) {
        return { action: "error", reason: "tx_not_found · heal_aborted" };
    }

    if (current.status === "completed" || current.status === "paid") {
        return { action: "none", reason: "already_completed · skipped" };
    }

    if (current.status === "failed" && !verifiedStatus) {
        return { action: "none", reason: "already_failed · skipped" };
    }

    // ── Case 1: Provider confirmed success ────────────────────────────────────
    if (verifiedStatus === "successful") {
        try {
            const { error: txErr } = await admin
                .from("transactions")
                .update({ status: "completed", updated_at: now })
                .eq("id", transactionId)
                .eq("status", "pending");

            if (txErr) {
                return { action: "error", reason: `tx_update_failed · ${txErr.message}` };
            }

            if (orderId) {
                const { data: order } = await admin
                    .from("orders")
                    .select("status, payment_status")
                    .eq("id", orderId)
                    .single();

                if (order && order.payment_status !== "paid") {
                    const { error: orderErr } = await admin
                        .from("orders")
                        .update({
                            payment_status: "paid",
                            paid_at: now,
                            status: order.status === "pending" ? "confirmed" : order.status,
                        })
                        .eq("id", orderId);

                    if (orderErr) {
                        console.warn("[autoHeal] order update failed (non-fatal)", orderErr);
                    }

                    await recordBothStatusChanges(
                        admin,
                        orderId,
                        {
                            previousOrderStatus: order.status as any,
                            newOrderStatus: order.status === "pending" ? "confirmed" : order.status as any,
                            previousPaymentStatus: order.payment_status as any,
                            newPaymentStatus: "paid",
                        },
                        {
                            triggeredBy: "system",
                            provider: provider as any,
                            providerTransactionId: input.providerTxId,
                            notes: `${provider} · verified successful · auto-completed`,
                        }
                    );
                }
            }

            console.info(`[autoHeal] ✓ completed tx ${transactionId} via ${provider} verification`);
            return {
                action: "completed",
                reason: `${provider} · verified successful · auto-completed`,
                healedAt: now,
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[autoHeal] unexpected error during complete heal", err);
            return { action: "error", reason: `unexpected_error · ${msg}` };
        }
    }

    // ── Case 2: Provider confirmed failure ────────────────────────────────────
    if (verifiedStatus === "failed" || verifiedStatus === "cancelled" || verifiedStatus === "expired") {
        try {
            const { error: txErr } = await admin
                .from("transactions")
                .update({ status: "failed", updated_at: now })
                .eq("id", transactionId)
                .eq("status", "pending");

            if (txErr) {
                return { action: "error", reason: `tx_update_failed · ${txErr.message}` };
            }

            if (orderId) {
                const { data: order } = await admin
                    .from("orders")
                    .select("status, payment_status")
                    .eq("id", orderId)
                    .single();

                if (order && order.payment_status === "pending") {
                    await admin
                        .from("orders")
                        .update({ payment_status: "failed" })
                        .eq("id", orderId);

                    await recordBothStatusChanges(
                        admin,
                        orderId,
                        {
                            previousOrderStatus: order.status as any,
                            newOrderStatus: order.status as any,
                            previousPaymentStatus: "pending",
                            newPaymentStatus: "failed",
                        },
                        {
                            triggeredBy: "system",
                            provider: provider as any,
                            providerTransactionId: input.providerTxId,
                            notes: `${provider} · reported ${verifiedStatus} · auto-failed`,
                        }
                    );
                }
            }

            console.info(`[autoHeal] ✓ failed tx ${transactionId} — provider reported ${verifiedStatus}`);
            return {
                action: "failed",
                reason: `${provider} · reported ${verifiedStatus} · auto-failed`,
                healedAt: now,
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { action: "error", reason: `unexpected_error · ${msg}` };
        }
    }

    // ── Case 3: Stuck with no provider data ───────────────────────────────────
    if (isStuck && !verifiedStatus) {
        try {
            const { data: currentTx } = await admin
                .from("transactions")
                .select("metadata")
                .eq("id", transactionId)
                .single();

            const { error: txErr } = await admin
                .from("transactions")
                .update({
                    status: "failed",
                    updated_at: now,
                    metadata: {
                        ...(currentTx?.metadata as Record<string, unknown> ?? {}),
                        auto_failed_reason: "stuck_pending_no_provider_response",
                        auto_failed_at: now,
                    },
                })
                .eq("id", transactionId)
                .eq("status", "pending");

            if (txErr) {
                return { action: "error", reason: `tx_update_failed · ${txErr.message}` };
            }

            if (orderId) {
                const { data: order } = await admin
                    .from("orders")
                    .select("status, payment_status")
                    .eq("id", orderId)
                    .single();

                if (order && order.payment_status === "pending") {
                    await admin
                        .from("orders")
                        .update({ payment_status: "failed" })
                        .eq("id", orderId);

                    await recordBothStatusChanges(
                        admin,
                        orderId,
                        {
                            previousOrderStatus: order.status as any,
                            newOrderStatus: order.status as any,
                            previousPaymentStatus: "pending",
                            newPaymentStatus: "failed",
                        },
                        {
                            triggeredBy: "system",
                            provider: provider as any,
                            providerTransactionId: input.providerTxId,
                            notes: "stuck_pending · no provider response · auto-failed",
                        }
                    );
                }
            }

            console.info(`[autoHeal] ✓ failed stuck tx ${transactionId} (no provider response)`);
            return {
                action: "failed",
                reason: "stuck_pending · no provider response · auto-failed",
                healedAt: now,
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { action: "error", reason: `unexpected_error · ${msg}` };
        }
    }

    return {
        action: "none",
        reason: "no condition matched · skipped",
    };
}