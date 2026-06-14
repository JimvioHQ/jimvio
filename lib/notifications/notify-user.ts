import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { TransactionalEmailKind } from "@/lib/email/transactional";
import {
    sendOrderConfirmationEmail,
    sendOrderShippedEmail,
    sendPaymentFailedEmail,
    sendPaymentSuccessEmail,
    sendPayoutSentEmail,
} from "@/lib/email/transactional";

type NotificationType = Database["public"]["Enums"]["notification_type"];

type EmailPayload = {
    kind: TransactionalEmailKind;
    orderNumber?: string;
    orderId?: string;
    totalAmount?: number;
    amount?: number;
    currency?: string;
    providerLabel?: string;
    reason?: string;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    destinationLabel?: string;
};

export type NotifyUserInput = {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    data?: Record<string, unknown>;
    email?: EmailPayload;
};

async function dispatchEmail(
    to: string,
    toName: string | null | undefined,
    email: EmailPayload
): Promise<void> {
    const recipient = { to, toName };

    switch (email.kind) {
        case "order_confirmation":
            if (!email.orderId || !email.orderNumber || email.totalAmount == null || !email.currency) return;
            await sendOrderConfirmationEmail(recipient, {
                orderId: email.orderId,
                orderNumber: email.orderNumber,
                totalAmount: email.totalAmount,
                currency: email.currency,
            });
            break;
        case "payment_success":
            if (!email.orderId || !email.orderNumber || email.amount == null || !email.currency) return;
            await sendPaymentSuccessEmail(recipient, {
                orderId: email.orderId,
                orderNumber: email.orderNumber,
                amount: email.amount,
                currency: email.currency,
                providerLabel: email.providerLabel,
            });
            break;
        case "payment_failed":
            await sendPaymentFailedEmail(recipient, {
                orderId: email.orderId,
                orderNumber: email.orderNumber,
                reason: email.reason,
            });
            break;
        case "order_shipped":
            if (!email.orderId || !email.orderNumber) return;
            await sendOrderShippedEmail(recipient, {
                orderId: email.orderId,
                orderNumber: email.orderNumber,
                trackingNumber: email.trackingNumber,
                trackingUrl: email.trackingUrl,
            });
            break;
        case "payout_sent":
            if (email.amount == null || !email.currency) return;
            await sendPayoutSentEmail(recipient, {
                amount: email.amount,
                currency: email.currency,
                destinationLabel: email.destinationLabel,
            });
            break;
    }
}

/** Insert in-app notification and optionally send a transactional email. */
export async function notifyUser(
    db: SupabaseClient,
    input: NotifyUserInput
): Promise<void> {
    try {
        const { error } = await db.from("notifications").insert({
            user_id: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            action_url: input.actionUrl ?? null,
            data: input.data ?? {},
        });
        if (error) {
            console.error("[notifyUser] insert failed:", error.message);
        }
    } catch (err) {
        console.error("[notifyUser] insert error:", err);
    }

    if (!input.email) return;

    try {
        const { data: profile } = await db
            .from("profiles")
            .select("email, full_name")
            .eq("id", input.userId)
            .maybeSingle();

        if (!profile?.email) return;

        await dispatchEmail(profile.email, profile.full_name, input.email);
    } catch (err) {
        console.warn("[notifyUser] email failed (non-fatal):", err);
    }
}
