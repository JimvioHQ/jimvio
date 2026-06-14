import { getAppBaseUrl } from "@/lib/email/config";
import { wrapEmailHtml } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";

export type TransactionalEmailKind =
    | "order_confirmation"
    | "payment_success"
    | "payment_failed"
    | "order_shipped"
    | "payout_sent";

type EmailRecipient = {
    to: string;
    toName?: string | null;
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function greeting(name?: string | null): string {
    return name?.trim() ? `Hi ${escapeHtml(name.trim())},` : "Hi there,";
}

function formatMoney(amount: number, currency: string): string {
    return `${currency.toUpperCase()} ${Number(amount).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

export async function sendOrderConfirmationEmail(
    recipient: EmailRecipient,
    params: {
        orderNumber: string;
        orderId: string;
        totalAmount: number;
        currency: string;
    }
) {
    const orderUrl = `${getAppBaseUrl()}/checkout?order=${params.orderId}`;
    const html = wrapEmailHtml({
        preview: `Order ${params.orderNumber} is ready for payment.`,
        heading: "Order received",
        bodyHtml: `
          <p style="margin:0 0 12px;">${greeting(recipient.toName)}</p>
          <p style="margin:0 0 12px;">We received your order <strong>#${escapeHtml(params.orderNumber)}</strong>.</p>
          <p style="margin:0 0 12px;">Total: <strong>${escapeHtml(formatMoney(params.totalAmount, params.currency))}</strong></p>
          <p style="margin:0;">Complete payment to confirm your order. We'll notify you as soon as payment is processed.</p>
        `,
        ctaLabel: "Complete payment",
        ctaUrl: orderUrl,
    });

    return sendEmail({
        to: recipient.to,
        subject: `Order #${params.orderNumber} received — complete payment`,
        html,
        text: `Your order #${params.orderNumber} is ready. Complete payment: ${orderUrl}`,
    });
}

export async function sendPaymentSuccessEmail(
    recipient: EmailRecipient,
    params: {
        orderNumber: string;
        orderId: string;
        amount: number;
        currency: string;
        providerLabel?: string;
    }
) {
    const orderUrl = `${getAppBaseUrl()}/dashboard/orders/${params.orderId}`;
    const provider = params.providerLabel ? ` via ${escapeHtml(params.providerLabel)}` : "";
    const html = wrapEmailHtml({
        preview: `Payment confirmed for order #${params.orderNumber}.`,
        heading: "Payment confirmed",
        bodyHtml: `
          <p style="margin:0 0 12px;">${greeting(recipient.toName)}</p>
          <p style="margin:0 0 12px;">Your payment${provider} for order <strong>#${escapeHtml(params.orderNumber)}</strong> was successful.</p>
          <p style="margin:0 0 12px;">Amount paid: <strong>${escapeHtml(formatMoney(params.amount, params.currency))}</strong></p>
          <p style="margin:0;">We're processing your order now. You'll get another update when it ships.</p>
        `,
        ctaLabel: "View order",
        ctaUrl: orderUrl,
    });

    return sendEmail({
        to: recipient.to,
        subject: `Payment confirmed — order #${params.orderNumber}`,
        html,
        text: `Payment confirmed for order #${params.orderNumber}. View: ${orderUrl}`,
    });
}

export async function sendPaymentFailedEmail(
    recipient: EmailRecipient,
    params: {
        orderNumber?: string;
        orderId?: string;
        reason?: string;
    }
) {
    const checkoutUrl = params.orderId
        ? `${getAppBaseUrl()}/checkout?order=${params.orderId}`
        : `${getAppBaseUrl()}/cart`;
    const orderLine = params.orderNumber
        ? `<p style="margin:0 0 12px;">We couldn't process payment for order <strong>#${escapeHtml(params.orderNumber)}</strong>.</p>`
        : `<p style="margin:0 0 12px;">We couldn't process your payment.</p>`;
    const reasonLine = params.reason
        ? `<p style="margin:0 0 12px;">Reason: ${escapeHtml(params.reason)}</p>`
        : "";

    const html = wrapEmailHtml({
        preview: "Your payment could not be processed.",
        heading: "Payment failed",
        bodyHtml: `
          <p style="margin:0 0 12px;">${greeting(recipient.toName)}</p>
          ${orderLine}
          ${reasonLine}
          <p style="margin:0;">Please try again with the same or a different payment method.</p>
        `,
        ctaLabel: "Try again",
        ctaUrl: checkoutUrl,
    });

    return sendEmail({
        to: recipient.to,
        subject: params.orderNumber
            ? `Payment failed — order #${params.orderNumber}`
            : "Payment failed — please try again",
        html,
        text: `Payment failed. Try again: ${checkoutUrl}`,
    });
}

export async function sendOrderShippedEmail(
    recipient: EmailRecipient,
    params: {
        orderNumber: string;
        orderId: string;
        trackingNumber?: string | null;
        trackingUrl?: string | null;
    }
) {
    const orderUrl = `${getAppBaseUrl()}/dashboard/orders/${params.orderId}`;
    const trackingBlock = params.trackingNumber
        ? `<p style="margin:0 0 12px;">Tracking number: <strong>${escapeHtml(params.trackingNumber)}</strong></p>`
        : "";
    const trackingLink = params.trackingUrl
        ? `<p style="margin:0 0 12px;"><a href="${params.trackingUrl}" style="color:#0f172a;">Track your package</a></p>`
        : "";

    const html = wrapEmailHtml({
        preview: `Order #${params.orderNumber} is on the way.`,
        heading: "Your order has shipped",
        bodyHtml: `
          <p style="margin:0 0 12px;">${greeting(recipient.toName)}</p>
          <p style="margin:0 0 12px;">Good news — order <strong>#${escapeHtml(params.orderNumber)}</strong> is on its way.</p>
          ${trackingBlock}
          ${trackingLink}
          <p style="margin:0;">You can follow progress anytime from your order page.</p>
        `,
        ctaLabel: "View order",
        ctaUrl: orderUrl,
    });

    return sendEmail({
        to: recipient.to,
        subject: `Shipped — order #${params.orderNumber}`,
        html,
        text: `Order #${params.orderNumber} has shipped. View: ${orderUrl}`,
    });
}

export async function sendPayoutSentEmail(
    recipient: EmailRecipient,
    params: {
        amount: number;
        currency: string;
        destinationLabel?: string;
    }
) {
    const walletUrl = `${getAppBaseUrl()}/dashboard/wallet`;
    const destination = params.destinationLabel
        ? `<p style="margin:0 0 12px;">Sent to: <strong>${escapeHtml(params.destinationLabel)}</strong></p>`
        : "";

    const html = wrapEmailHtml({
        preview: `Payout of ${formatMoney(params.amount, params.currency)} sent.`,
        heading: "Payout sent",
        bodyHtml: `
          <p style="margin:0 0 12px;">${greeting(recipient.toName)}</p>
          <p style="margin:0 0 12px;">We've sent your payout of <strong>${escapeHtml(formatMoney(params.amount, params.currency))}</strong>.</p>
          ${destination}
          <p style="margin:0;">It may take a short time to appear in your account depending on the payment provider.</p>
        `,
        ctaLabel: "View wallet",
        ctaUrl: walletUrl,
    });

    return sendEmail({
        to: recipient.to,
        subject: `Payout sent — ${formatMoney(params.amount, params.currency)}`,
        html,
        text: `Your payout of ${formatMoney(params.amount, params.currency)} was sent. Wallet: ${walletUrl}`,
    });
}
