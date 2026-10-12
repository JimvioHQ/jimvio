import { getAppBaseUrl } from "@/lib/email/config";
import { renderTransactionalEmail, type EmailPayload } from "@/lib/email/render-transactional";
import { sendEmail, type SendEmailResult } from "@/lib/email/send";

export type { EmailLineItem, EmailPayload, TransactionalEmailKind } from "@/lib/email/render-transactional";

type EmailRecipient = {
  to: string;
  toName?: string | null;
};

export async function sendRenderedEmail(
  recipient: EmailRecipient,
  payload: EmailPayload,
): Promise<SendEmailResult> {
  const rendered = renderTransactionalEmail({
    ...payload,
    destinationLabel: payload.destinationLabel ?? recipient.toName ?? undefined,
  });
  if (!rendered) {
    return { ok: false, error: "Incomplete email", status: "failed" };
  }
  return sendEmail({
    to: recipient.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    idempotencyKey: payload.idempotencyKey,
  });
}

export async function sendOrderConfirmationEmail(
  recipient: EmailRecipient,
  params: { orderNumber: string; orderId: string; totalAmount: number; currency: string },
) {
  return sendRenderedEmail(recipient, {
    kind: "order_confirmation",
    ...params,
    amount: params.totalAmount,
    actionPath: `${getAppBaseUrl()}/checkout?order=${params.orderId}`,
    idempotencyKey: `order.created:${params.orderId}`,
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
  },
) {
  return sendRenderedEmail(recipient, {
    kind: "payment_success",
    ...params,
    actionPath: `${getAppBaseUrl()}/orders/${params.orderId}`,
    idempotencyKey: `order.received:${params.orderId}`,
  });
}

export async function sendPaymentFailedEmail(
  recipient: EmailRecipient,
  params: { orderNumber?: string; orderId?: string; reason?: string },
) {
  return sendRenderedEmail(recipient, {
    kind: "payment_failed",
    ...params,
    idempotencyKey: params.orderId ? `payment.failed:${params.orderId}` : undefined,
  });
}

export async function sendOrderShippedEmail(
  recipient: EmailRecipient,
  params: {
    orderNumber: string;
    orderId: string;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
  },
) {
  return sendRenderedEmail(recipient, {
    kind: "order_shipped",
    ...params,
    idempotencyKey: `order.shipped:${params.orderId}`,
  });
}

export async function sendPayoutSentEmail(
  recipient: EmailRecipient,
  params: { amount: number; currency: string; destinationLabel?: string },
) {
  return sendRenderedEmail(recipient, { kind: "payout_sent", ...params });
}

export async function sendWelcomeEmail(
  recipient: EmailRecipient,
  params: { intent?: string | null; dashboardUrl?: string } = {},
) {
  return sendRenderedEmail(recipient, {
    kind: "welcome",
    intent: params.intent,
    destinationLabel: recipient.toName ?? undefined,
    actionPath: params.dashboardUrl,
  });
}
