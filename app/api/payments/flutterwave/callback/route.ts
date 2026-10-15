
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyFlutterwaveTransaction, isFlutterwaveSuccessfulStatus } from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
import { confirmUgcEscrowPayment } from "@/lib/ugc/confirm-escrow-payment";
import {
    isOrderPaymentComplete,
    paymentAmountsMatch,
} from "@/lib/payments/order-payment-utils";

export const dynamic = "force-dynamic";

const supabase = createClient(
    getSupabaseUrl(),
    getSupabaseSecretKey(),
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const txRef = searchParams.get("tx_ref");
    const transactionId = searchParams.get("transaction_id");
    const orderId = searchParams.get("order");

    async function customerOriginForOrder(id: string | null): Promise<string> {
        const fallback = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
        if (!id) return fallback;
        try {
            const { data: row } = await supabase
                .from("orders")
                .select("jimvio_store_id")
                .eq("id", id)
                .maybeSingle();
            const storeId = (row as { jimvio_store_id?: string | null } | null)?.jimvio_store_id;
            if (!storeId) return fallback;
            const { data: store } = await supabase
                .from("jimvio_stores")
                .select("handle")
                .eq("id", storeId)
                .maybeSingle();
            const { storefrontCustomerOrigin } = await import(
                "@/lib/payments/customer-return-origin"
            );
            return storefrontCustomerOrigin(store?.handle) ?? fallback;
        } catch {
            return fallback;
        }
    }

    const redirect = async (path: string, forOrderId?: string | null) => {
        const origin = await customerOriginForOrder(forOrderId ?? orderId);
        return NextResponse.redirect(new URL(path, origin));
    };

    // ── Cancelled / failed redirect: never mutate orders from query params ──
    if (status === "failed" || status === "cancelled") {
        return await redirect(
            `/checkout/cancel?reason=payment_${status}&order=${orderId || ""}`,
            orderId
        );
    }

    if (!txRef || !transactionId) {
        return await redirect(
            `/checkout/cancel?reason=invalid&order=${orderId || ""}`,
            orderId
        );
    }

    try {
        const txData = await verifyFlutterwaveTransaction(transactionId);

        if (!isFlutterwaveSuccessfulStatus(txData.status)) {
            await supabase
                .from("transactions")
                .update({ status: "failed", updated_at: new Date().toISOString() })
                .eq("provider_transaction_id", txRef)
                .eq("provider", "flutterwave")
                .eq("status", "pending");

            return await redirect(
                `/checkout/cancel?reason=verification_failed&order=${orderId || ""}`
            );
        }

        // ── Resolve the order via the transactions table (reliable) ───────────
        const { data: txRecord } = await supabase
            .from("transactions")
            .select("order_id, id, type, reference")
            .eq("provider_transaction_id", txRef)
            .eq("provider", "flutterwave")
            .maybeSingle();

        const resolvedOrderId = txRecord?.order_id ?? null;
        if (!resolvedOrderId) {
            const depositParam = searchParams.get("deposit");
            const { completeWalletDeposit, completeWalletDepositByReference } = await import(
                "@/lib/wallet-os/complete-deposit"
            );

            // Resolve USD credit amount for MoMo (local FX) vs hosted USD card deposits.
            let verifiedAmount =
                txData.amount != null ? Number(txData.amount) : null;
            let verifiedCurrency = txData.currency ?? "USD";
            const { data: depTx } = await supabase
                .from("transactions")
                .select("amount, currency, amount_usd, metadata")
                .eq("provider_transaction_id", txRef)
                .eq("type", "wallet_deposit")
                .maybeSingle();
            const depMeta =
                depTx?.metadata &&
                typeof depTx.metadata === "object" &&
                !Array.isArray(depTx.metadata)
                    ? (depTx.metadata as Record<string, unknown>)
                    : {};
            if (
                depMeta.method === "mobile_money" &&
                depTx?.amount_usd != null &&
                Number.isFinite(Number(depTx.amount_usd)) &&
                verifiedAmount != null &&
                Math.abs(verifiedAmount - Number(depTx.amount)) < 0.01 &&
                String(verifiedCurrency).toUpperCase() ===
                    String(depTx.currency ?? "").toUpperCase()
            ) {
                verifiedAmount = Number(depTx.amount_usd);
                verifiedCurrency = "USD";
            }

            if (depositParam) {
                const dep = await completeWalletDeposit(supabase, {
                    depositId: depositParam,
                    providerReference: txRef,
                    provider: "flutterwave",
                    verifiedAmount,
                    verifiedCurrency,
                });
                if (dep.credited || dep.amount > 0) {
                    return await redirect(`/wallet/deposits?status=success&deposit=${depositParam}`);
                }
            }
            const byRef = await completeWalletDepositByReference(supabase, {
                providerReference: txRef,
                provider: "flutterwave",
                verifiedAmount,
                verifiedCurrency,
            });
            if (byRef.handled) {
                return await redirect(`/wallet/deposits?status=success`);
            }

            let ugcAmount = txData.amount != null ? Number(txData.amount) : null;
            let ugcCurrency = txData.currency ?? "USD";
            const { data: ugcTx } = await supabase
                .from("transactions")
                .select("amount, currency, amount_usd, metadata")
                .eq("provider_transaction_id", txRef)
                .eq("type", "ugc_escrow")
                .maybeSingle();
            const ugcMeta =
                ugcTx?.metadata &&
                typeof ugcTx.metadata === "object" &&
                !Array.isArray(ugcTx.metadata)
                    ? (ugcTx.metadata as Record<string, unknown>)
                    : {};
            if (
                ugcMeta.method === "mobile_money" &&
                ugcTx?.amount_usd != null &&
                Number.isFinite(Number(ugcTx.amount_usd)) &&
                ugcAmount != null &&
                Math.abs(ugcAmount - Number(ugcTx.amount)) < 0.01
            ) {
                ugcAmount = Number(ugcTx.amount_usd);
                ugcCurrency = "USD";
            }

            const ugc = await confirmUgcEscrowPayment(supabase, {
                paymentRef: txRef,
                providerTransactionId: txRef,
                campaignId: searchParams.get("campaign"),
                amount: ugcAmount,
                currency: ugcCurrency,
                provider: "flutterwave",
            });
            if (ugc.handled) {
                return await redirect(
                    `/ugc/campaign-center/${ugc.campaignId}/fund?funded=${ugc.activated ? "1" : "pending"}`,
                );
            }
            const { confirmCoursePurchase } = await import("@/lib/community/courses/confirm-purchase");
            const coursePurchase = await confirmCoursePurchase(supabase, {
                paymentRef: txRef,
                providerTransactionId: txRef,
                amount: txData.amount != null ? Number(txData.amount) : null,
                currency: txData.currency ?? "USD",
                provider: "flutterwave",
            });
            if (coursePurchase.handled && coursePurchase.granted) {
                const { data: courseRow } = await supabase
                    .from("community_courses")
                    .select("communities(slug)")
                    .eq("id", coursePurchase.courseId)
                    .maybeSingle();
                const slug = (courseRow as { communities?: { slug?: string } | null } | null)?.communities?.slug;
                const next = slug
                    ? `/communities/${slug}/courses/${coursePurchase.courseId}/learn?enrolled=1`
                    : `/communities/courses`;
                return await redirect(next);
            }
            return await redirect(`/checkout/cancel?reason=order_not_found`);
        }
        if (orderId && orderId !== resolvedOrderId) {
            return await redirect(`/checkout/cancel?reason=order_mismatch`);
        }

        // ── Fetch order to check current status ───────────────────────────────
        const { data: order } = await supabase
            .from("orders")
            .select("id, buyer_id, payment_status, total_amount")
            .eq("id", resolvedOrderId)
            .maybeSingle();

        if (isOrderPaymentComplete(order?.payment_status)) {
            return await redirect(`/checkout/success?order=${resolvedOrderId}`);
        }

        const { data: txRow } = await supabase
            .from("transactions")
            .select("amount, currency")
            .eq("provider_transaction_id", txRef)
            .eq("provider", "flutterwave")
            .maybeSingle();

        const expectedAmount = txRow?.amount ?? null;
        const expectedCurrency = (txRow?.currency ?? "USD").toUpperCase();
        const receivedAmount = txData.amount != null ? Number(txData.amount) : null;
        const receivedCurrency = (txData.currency ?? "").toUpperCase();

        if (
            receivedAmount != null &&
            expectedAmount != null &&
            receivedCurrency &&
            !paymentAmountsMatch(receivedAmount, receivedCurrency, Number(expectedAmount), expectedCurrency)
        ) {
            console.warn("[Flutterwave callback] Amount mismatch", {
                expected: expectedAmount,
                expectedCurrency,
                received: receivedAmount,
                receivedCurrency,
                orderId: resolvedOrderId,
            });
            return await redirect(
                `/checkout/cancel?reason=amount_mismatch&order=${resolvedOrderId}`
            );
        }

        await finalizeOrderPayment(supabase, resolvedOrderId, {
            providerTransactionId: txRef,
            providerReference: txRef,
            paidAtIso: txData.created_at || new Date().toISOString(),
            notifyUserId: order?.buyer_id ?? null,
            amountForMessage: Number(order?.total_amount),
            paymentProvider: "flutterwave",
            webhookReference: `flw-${transactionId}`,
        });

        return await redirect(`/checkout/success?order=${resolvedOrderId}`);

    } catch (err) {
        console.error("[Flutterwave callback]", err);
        return await redirect(
            `/checkout/cancel?reason=server_error&order=${orderId || ""}`
        );
    }
}