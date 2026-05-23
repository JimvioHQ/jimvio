
// import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";
// import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
// import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

// export const dynamic = "force-dynamic";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
//   { auth: { autoRefreshToken: false, persistSession: false } }
// );

// export async function GET(req: NextRequest) {
//     const { searchParams } = new URL(req.url);
//     const status        = searchParams.get("status");
//     const txRef         = searchParams.get("tx_ref");
//     const transactionId = searchParams.get("transaction_id");
//     const orderId       = searchParams.get("order");
//     const appUrl        = process.env.NEXT_PUBLIC_APP_URL || "";

//     if (status === "failed" || status === "cancelled") {
//         if (orderId) {
//             await supabase
//                 .from("orders")
//                 .update({ payment_status: "failed", status: "cancelled", updated_at: new Date().toISOString() })
//                 .eq("id", orderId)
//                 .eq("payment_status", "pending");

//             await supabase
//                 .from("transactions")
//                 .update({ status: "failed", updated_at: new Date().toISOString() })
//                 .eq("reference", txRef)
//                 .eq("status", "pending");
//         }
//         return NextResponse.redirect(
//             `${appUrl}/checkout/cancel?reason=payment_${status}&order=${orderId || ""}`
//         );
//     }

//     if (!txRef || !transactionId) {
//         return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=invalid&order=${orderId || ""}`);
//     }

//     try {
//         // ── Verify with Flutterwave — never trust redirect params alone ────────
//         const txData = await verifyFlutterwaveTransaction(transactionId);
//         console.log(txData);


//         if (txData?.status !== "successful") {

//             return NextResponse.redirect(
//                 `${appUrl}/checkout/cancel?reason=verification_failed&order=${orderId || ""}`
//             );
//         }

//         const { data: order } = await supabase
//             .from("orders")
//             .select("id, buyer_id, payment_status, total_amount")
//             .eq("flutterwave_tx_ref", txRef)
//             .maybeSingle();

//         const resolvedOrderId = order?.id || orderId;
//         if (!resolvedOrderId) {
//             return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=order_not_found`);
//         }

//         if (order?.payment_status === "paid" || order?.payment_status === "completed") {
//             return NextResponse.redirect(`${appUrl}/checkout/success?order=${resolvedOrderId}`);
//         }

//         // ── Finalize — idempotent, handles wallet + notifications ─────────────
//         await finalizeOrderPayment(supabase, resolvedOrderId, {
//             providerTransactionId: transactionId,
//             providerReference: txRef,
//             paidAtIso: txData.created_at || new Date().toISOString(),
//             notifyUserId: order?.buyer_id ?? null,
//             amountForMessage: Number(order?.total_amount),
//             paymentProvider: "flutterwave",
//             webhookReference: `flw-${transactionId}`,
//         });

//         return NextResponse.redirect(`${appUrl}/checkout/success?order=${resolvedOrderId}`);

//     } catch (err) {
//         console.error("[Flutterwave callback]", err);
//         return NextResponse.redirect(
//             `${appUrl}/checkout/cancel?reason=server_error&order=${orderId || ""}`
//         );
//     }
// }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

export const dynamic = "force-dynamic";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const txRef = searchParams.get("tx_ref");
    const transactionId = searchParams.get("transaction_id");
    const orderId = searchParams.get("order");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    // ── Cancelled / failed redirect ───────────────────────────────────────────
    if (status === "failed" || status === "cancelled") {
        if (txRef) {
            // Use provider_transaction_id — the column set by the initiate route
            await supabase
                .from("transactions")
                .update({ status: "failed", updated_at: new Date().toISOString() })
                .eq("provider_transaction_id", txRef)
                .eq("provider", "flutterwave")
                .eq("status", "pending");
        }

        if (orderId) {
            await supabase
                .from("orders")
                .update({
                    payment_status: "failed",
                    status: "cancelled",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId)
                .eq("payment_status", "pending");
        }

        return NextResponse.redirect(
            `${appUrl}/checkout/cancel?reason=payment_${status}&order=${orderId || ""}`
        );
    }

    if (!txRef || !transactionId) {
        return NextResponse.redirect(
            `${appUrl}/checkout/cancel?reason=invalid&order=${orderId || ""}`
        );
    }

    try {
        const txData = await verifyFlutterwaveTransaction(transactionId);
        console.log(txData);

        if (txData.status.toLowerCase() !== "successful") {
            await supabase
                .from("transactions")
                .update({ status: "failed", updated_at: new Date().toISOString() })
                .eq("provider_transaction_id", txRef)
                .eq("provider", "flutterwave")
                .eq("status", "pending");

            return NextResponse.redirect(
                `${appUrl}/checkout/cancel?reason=verification_failed&order=${orderId || ""}`
            );
        }

        // ── Resolve the order via the transactions table (reliable) ───────────
        const { data: txRecord } = await supabase
            .from("transactions")
            .select("order_id, id")
            .eq("provider_transaction_id", txRef)
            .eq("provider", "flutterwave")
            .maybeSingle();

        const resolvedOrderId = txRecord?.order_id ?? orderId;
        if (!resolvedOrderId) {
            return NextResponse.redirect(
                `${appUrl}/checkout/cancel?reason=order_not_found`
            );
        }

        // ── Fetch order to check current status ───────────────────────────────
        const { data: order } = await supabase
            .from("orders")
            .select("id, buyer_id, payment_status, total_amount")
            .eq("id", resolvedOrderId)
            .maybeSingle();

        if (order?.payment_status === "paid" || order?.payment_status === "completed") {
            return NextResponse.redirect(
                `${appUrl}/checkout/success?order=${resolvedOrderId}`
            );
        }

        await finalizeOrderPayment(supabase, resolvedOrderId, {
            providerTransactionId: transactionId,
            providerReference: txRef,
            paidAtIso: txData.created_at || new Date().toISOString(),
            notifyUserId: order?.buyer_id ?? null,
            amountForMessage: Number(order?.total_amount),
            paymentProvider: "flutterwave",
            webhookReference: `flw-${transactionId}`,
        });
        
        await supabase
            .from("transactions")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("provider_transaction_id", txRef)
            .eq("provider", "flutterwave")
            .eq("status", "pending");

        return NextResponse.redirect(
            `${appUrl}/checkout/success?order=${resolvedOrderId}`
        );

    } catch (err) {
        console.error("[Flutterwave callback]", err);
        return NextResponse.redirect(
            `${appUrl}/checkout/cancel?reason=server_error&order=${orderId || ""}`
        );
    }
}