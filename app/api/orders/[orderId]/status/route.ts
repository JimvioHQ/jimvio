// app/api/orders/[orderId]/status/route.ts
//
// Responsibility: called by checkout success page after Flutterwave redirects back.
// Verifies payment with Flutterwave, finalizes order, and credits vendor wallet.
//
// Wallet credit chain:
//   orders.vendor_id → vendors.user_id → wallets.available_balance += net amount
//
// Commission deduction:
//   vendors.commission_rate is the platform's cut (e.g. 8%).
//   Net to vendor = total_amount * (1 - commission_rate / 100)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";

// ─── Supabase (lazy) ──────────────────────────────────────────────────────────

function getServiceSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

// ─── Wallet credit helper ─────────────────────────────────────────────────────
//
// Fetches the vendor's wallet and increments available_balance by the net amount
// (total minus platform commission). Uses a read-then-write pattern with
// .eq("user_id", vendorUserId) so we never accidentally credit the wrong wallet.
//
// Returns { credited: true, netAmount } on success, { credited: false } if the
// vendor has no wallet row yet (wallet creation is a separate concern).

async function creditVendorWallet(
    supabase: ReturnType<typeof getServiceSupabase>,
    params: {
        vendorId: string;
        totalAmount: number;
        currency: string;
        orderId: string;
    }
): Promise<{ credited: boolean; netAmount?: number; vendorUserId?: string }> {
    const { vendorId, totalAmount, currency, orderId } = params;

    // 1. Fetch vendor to get user_id and commission_rate
    const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("user_id, commission_rate")
        .eq("id", vendorId)
        .single();

    if (vendorError || !vendor) {
        console.error("[wallet/credit] Vendor not found", { vendorId, orderId });
        return { credited: false };
    }

    // 2. Calculate net amount after platform commission
    //    commission_rate is stored as a percentage e.g. 8 = 8%
    const commissionRate = Number(vendor.commission_rate ?? 0);
    const netAmount = totalAmount * (1 - commissionRate / 100);

    // 3. Fetch vendor's wallet
    const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id, available_balance, total_earned")
        .eq("user_id", vendor.user_id)
        .single();

    if (walletError || !wallet) {
        console.error("[wallet/credit] Vendor wallet not found", {
            vendorUserId: vendor.user_id,
            orderId,
        });
        return { credited: false };
    }

    // 4. Increment available_balance and total_earned
    //    Using explicit arithmetic against current DB values avoids
    //    race conditions from concurrent payments.
    const newAvailableBalance = Number(wallet.available_balance ?? 0) + netAmount;
    const newTotalEarned = Number(wallet.total_earned ?? 0) + netAmount;

    const { error: updateError } = await supabase
        .from("wallets")
        .update({
            available_balance: newAvailableBalance,
            total_earned: newTotalEarned,
            updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

    if (updateError) {
        console.error("[wallet/credit] Wallet update failed", {
            reason: updateError.message,
            vendorUserId: vendor.user_id,
            orderId,
        });
        return { credited: false };
    }

    console.info("[wallet/credit] ✓ Vendor wallet credited", {
        vendorId,
        vendorUserId: vendor.user_id,
        totalAmount,
        commissionRate,
        netAmount,
        currency,
        orderId,
    });

    return { credited: true, netAmount, vendorUserId: vendor.user_id };
}

// ─── Finalize helper ──────────────────────────────────────────────────────────
//
// Updates order + transaction status, then credits the vendor wallet.
// Both order and transaction updates use a status guard (.eq("...status", "pending"))
// so this is safe to call even if the webhook already ran — the updates no-op
// on already-finalized rows, and we check wallet credit separately.

async function finalizePayment(
    supabase: ReturnType<typeof getServiceSupabase>,
    params: {
        orderId: string;
        transactionId: string;
        vendorId: string | null;
        totalAmount: number;
        currency: string;
        paidAt: string;
        metadata?: Record<string, unknown>;
    }
): Promise<{
    paymentStatus: string;
    orderStatus: string;
    paidAt: string;
    walletCredited: boolean;
    netAmount?: number;
}> {
    const { orderId, transactionId, vendorId, totalAmount, currency, paidAt, metadata } = params;
    const now = new Date().toISOString();

    // Update order → paid + confirmed (guard: only if still pending)
    const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
            payment_status: "paid",
            status: "confirmed",
            paid_at: now,
            updated_at: now,
        })
        .eq("id", orderId)
        .eq("payment_status", "pending");

    if (orderUpdateError) {
        console.error("[orders/status] Order update failed", {
            reason: orderUpdateError.message,
            orderId,
        });
    }

    const { error: txUpdateError } = await supabase
        .from("transactions")
        .update({
            status: "completed",
            updated_at: now,
            metadata,
        })
        .or(`id.eq.${transactionId},provider_transaction_id.eq.${transactionId}`)
        .eq("status", "pending");
        
    if (txUpdateError) {
        console.error("[orders/status] Transaction update failed", {
            reason: txUpdateError.message,
            orderId,
        });
    }

    // Credit vendor wallet — only if the order has a vendor
    let walletCredited = false;
    let netAmount: number | undefined;

    if (vendorId) {
        const result = await creditVendorWallet(supabase, {
            vendorId,
            totalAmount,
            currency,
            orderId,
        });
        walletCredited = result.credited;
        netAmount = result.netAmount;
    } else {
        console.warn("[orders/status] No vendor on order — wallet credit skipped", { orderId });
    }

    return {
        paymentStatus: "paid",
        orderStatus: "confirmed",
        paidAt: now,
        walletCredited,
        netAmount,
    };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const { orderId } = await params;

    // 1. Auth
    const cookieStore = await cookies();

    const userSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => cookieStore.get(name)?.value,
            },
        }
    );

    const { data: { user } } = await userSupabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = getServiceSupabase();

    // 2. Fetch order — include vendor_id and amounts for wallet credit
    const { data: order, error: orderError } = await serviceSupabase
        .from("orders")
        .select("id, payment_status, status, paid_at, buyer_id, vendor_id, order_number, total_amount, currency")
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .single();

    if (orderError || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3. Fetch latest flutterwave transaction for this order
    const { data: transaction, error: txError } = await serviceSupabase
        .from("transactions")
        .select("id, provider, provider_transaction_id, status, amount, currency")
        .eq("order_id", orderId)
        .eq("provider", "flutterwave")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (txError) {
        console.error("[orders/status] Failed to fetch transaction", {
            reason: txError.message,
            orderId,
        });
        return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
    }

    // 4. Already paid — return early, no Flutterwave call needed
    if (order.payment_status === "completed" || order.payment_status === "paid") {
        return NextResponse.json({
            paymentStatus: order.payment_status,
            orderStatus: order.status,
            paidAt: order.paid_at,
            transactionId: transaction?.provider_transaction_id ?? null,
            provider: transaction?.provider ?? null,
            verified: true,
            walletCredited: true, // already credited when first finalized
        });
    }


    if (order.payment_status === "pending" && transaction?.provider_transaction_id) {
        try {
            const txData = await verifyFlutterwaveTransaction(
                transaction.provider_transaction_id
            );

            console.info("[orders/status] Flutterwave verification result", {
                orderId,
                flwStatus: txData?.status,
                txRef: transaction.provider_transaction_id,
            });


            // ── Successful payment ────────────────────────────────────────────────
            if (txData?.status === "successful") {
                const result = await finalizePayment(serviceSupabase, {
                    orderId,
                    transactionId: transaction.id,
                    vendorId: order.vendor_id ?? null,
                    totalAmount: Number(order.total_amount),
                    currency: order.currency ?? "RWF",
                    paidAt: txData.created_at,
                    metadata: {
                        transaction_id: transaction.id,
                        customer: txData.customer,
                        tx_ref: txData.tx_ref,
                        status: txData.status
                    },
                });

                return NextResponse.json({
                    paymentStatus: result.paymentStatus,
                    orderStatus: result.orderStatus,
                    paidAt: result.paidAt,
                    transactionId: transaction.provider_transaction_id,
                    provider: transaction.provider,
                    verified: true,
                    walletCredited: result.walletCredited,
                    netAmount: result.netAmount,
                });
            }

            // ── Failed payment ────────────────────────────────────────────────────
            if (txData?.status === "failed") {
                const now = new Date().toISOString();

                await serviceSupabase
                    .from("orders")
                    .update({ payment_status: "failed", status: "cancelled", updated_at: now })
                    .eq("id", orderId)
                    .eq("payment_status", "pending");

                await serviceSupabase
                    .from("transactions")
                    .update({ status: "failed", updated_at: now })
                    .eq("id", transaction.id)
                    .eq("status", "pending");

                return NextResponse.json({
                    paymentStatus: "failed",
                    orderStatus: "cancelled",
                    paidAt: null,
                    transactionId: transaction.provider_transaction_id,
                    provider: transaction.provider,
                    verified: true,
                    walletCredited: false,
                });
            }

            // ── Still pending on Flutterwave's side ───────────────────────────────
            console.info("[orders/status] Payment not yet settled", {
                orderId,
                flwStatus: txData?.status,
            });

        } catch (err) {
            // Network error — non-fatal, webhook will finalize when Flutterwave delivers
            console.error("[orders/status] Flutterwave verification failed", {
                reason: err instanceof Error ? err.message : String(err),
                orderId,
            });
        }
    }

    // 6. Return current state — still pending or no transaction yet
    return NextResponse.json({
        paymentStatus: order.payment_status,
        orderStatus: order.status,
        paidAt: order.paid_at ?? null,
        transactionId: transaction?.provider_transaction_id ?? null,
        provider: transaction?.provider ?? null,
        verified: false,
        walletCredited: false,
    });
}