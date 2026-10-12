import { absoluteAppUrl, emailAssetBase, type EmailIconName } from "./brand";
import { formatEmailDate, formatEmailMoney, firstNameFrom } from "./format";
import { renderJimvioEmail, type EmailLine, type EmailStat, type JimvioEmailContent } from "./shell";

export type EmailLineItem = {
  name: string;
  quantity: number;
  detail?: string | null;
  imageUrl?: string | null;
};

export type TransactionalEmailKind =
  | "order_confirmation"
  | "payment_success"
  | "payment_failed"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "refund_completed"
  | "seller_new_order"
  | "seller_order_paid"
  | "payout_sent"
  | "payout_failed"
  | "withdrawal_requested"
  | "welcome"
  | "verification_decision"
  | "creator_reward_paid"
  | "account_notice";

export type EmailPayload = {
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
  intent?: string | null;
  items?: EmailLineItem[];
  itemCount?: number;
  paymentLabel?: string;
  statusLabel?: string;
  occurredAt?: string;
  actionPath?: string;
  scope?: "personal" | "business";
  decision?: "approved" | "rejected";
  subject?: string;
  titleLead?: string;
  titleAccent?: string;
  subtitle?: string;
  noticeTitle?: string;
  noticeBody?: string;
  ctaLabel?: string;
  help?: string;
  icon?: EmailIconName;
  idempotencyKey?: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
  preview: string;
};

const HELP = {
  order: "If you have any questions about your order, contact our support team.",
  account: "If you have any questions about your account, contact our support team.",
  payout: "If you have any questions about this payout, contact our support team.",
  support: "If you need anything else, contact our support team.",
};

function lines(items?: EmailLineItem[]): EmailLine[] {
  return (items ?? [])
    .filter((item) => item.name?.trim() && Number(item.quantity) > 0)
    .map((item) => ({
      name: item.name.trim().slice(0, 140),
      detail: item.detail?.trim() || null,
      quantity: Math.max(1, Math.round(Number(item.quantity))),
      imageUrl: item.imageUrl?.trim() || null,
    }));
}

function countItems(payload: EmailPayload): number {
  if (typeof payload.itemCount === "number" && payload.itemCount > 0) return payload.itemCount;
  const rows = lines(payload.items);
  if (!rows.length) return 0;
  return rows.reduce((sum, row) => sum + row.quantity, 0);
}

function orderHref(payload: EmailPayload, fallback: string): string {
  if (payload.actionPath?.trim()) return absoluteAppUrl(payload.actionPath.trim());
  if (payload.orderId) return absoluteAppUrl(fallback.replace(":id", payload.orderId));
  return absoluteAppUrl("/orders");
}

function render(content: Omit<JimvioEmailContent, "assetBaseUrl" | "helpUrl"> & { helpUrl?: string }): {
  html: string;
  text: string;
} {
  const base = emailAssetBase();
  return renderJimvioEmail({
    ...content,
    helpUrl: content.helpUrl ?? `${base}/contact`,
    assetBaseUrl: base,
  });
}

function orderCreated(payload: EmailPayload, seller: boolean): RenderedEmail | null {
  if (!payload.orderNumber) return null;
  const rows = lines(payload.items);
  const count = countItems(payload);
  const pending = (payload.paymentLabel ?? "Pending").trim();
  const date = formatEmailDate(payload.occurredAt, true);
  const href = orderHref(payload, seller ? "/commerce/orders/:id" : "/orders/:id");
  const paid = /complete|paid|success/i.test(pending);
  const content = render({
    preview: seller
      ? `New order #${payload.orderNumber} is waiting in your Jimvio store.`
      : `Order #${payload.orderNumber} was created and is waiting for payment.`,
    icon: "cart-plus",
    titleLead: seller ? "New order " : "Order ",
    titleAccent: seller ? "received" : "created!",
    subtitle: seller
      ? paid
        ? "A customer paid for this order. It is ready for you to fulfill."
        : "A customer placed this order. Payment is still pending, so wait for payment before you fulfill it."
      : "Your order has been successfully created and is now in our system.",
    details: {
      label: "ORDER DETAILS",
      headline: `#${payload.orderNumber}`,
      stats: [
        { icon: "bag", label: "Items", value: count > 0 ? String(count) : "—" },
        { icon: "card", label: "Payment", value: pending },
        { icon: "box", label: "Status", value: payload.statusLabel?.trim() || (seller && paid ? "Ready to fulfill" : "Order Created") },
        { icon: "calendar", label: "Date", value: date || "—" },
      ],
    },
    items: rows.length ? { label: "ITEMS IN THIS ORDER", rows } : undefined,
    notice: {
      icon: "clock",
      title: seller ? (paid ? "Fulfill this order" : "Waiting for payment") : "Next step",
      body: seller
        ? paid
          ? "Open the order to pack, ship, or deliver digital access. The customer has already been told their payment is complete."
          : "We'll let you know when payment is completed. Fulfillment should wait until then."
        : "We'll process your order once the payment is completed. If you haven't completed the payment yet, please do so to avoid order cancellation.",
    },
    cta: { label: "View Order", url: href },
    help: HELP.order,
  });
  return {
    subject: seller
      ? `New order #${payload.orderNumber}`
      : `Order #${payload.orderNumber} created`,
    preview: seller
      ? `New order #${payload.orderNumber}`
      : `Order #${payload.orderNumber} was created`,
    ...content,
  };
}

function orderReceived(payload: EmailPayload): RenderedEmail | null {
  if (!payload.orderNumber) return null;
  const count = countItems(payload);
  const href = orderHref(payload, "/orders/:id");
  const content = render({
    preview: `We've received order #${payload.orderNumber} and it is now being processed.`,
    icon: "cart-check",
    titleLead: "Order ",
    titleAccent: "received!",
    subtitle: "Thank you for your purchase. We've received your order and it's now being processed.",
    details: {
      label: "ORDER DETAILS",
      headline: `#${payload.orderNumber}`,
      stats: [
        { icon: "bag", label: "Items", value: count > 0 ? String(count) : "—" },
        { icon: "card", label: "Payment", value: "Completed" },
        { icon: "box", label: "Status", value: payload.statusLabel?.trim() || "Processing" },
        { icon: "calendar", label: "Date", value: formatEmailDate(payload.occurredAt, false) || "—" },
      ],
    },
    notice: {
      icon: "clock",
      title: "We'll notify you soon",
      body: "You'll receive another email once your order has been shipped or is ready for download. You can also track your order from your account.",
    },
    cta: { label: "View Order", url: href },
    help: HELP.order,
  });
  return {
    subject: `Order #${payload.orderNumber} received`,
    preview: content.text.split("\n")[0] ?? `Order #${payload.orderNumber} received`,
    html: content.html,
    text: content.text,
  };
}

export function renderTransactionalEmail(payload: EmailPayload): RenderedEmail | null {
  switch (payload.kind) {
    case "order_confirmation":
      return orderCreated(payload, false);
    case "seller_new_order":
      return orderCreated({ ...payload, paymentLabel: payload.paymentLabel ?? "Pending", statusLabel: payload.statusLabel ?? "Order Created" }, true);
    case "seller_order_paid":
      return orderCreated({ ...payload, paymentLabel: "Completed", statusLabel: payload.statusLabel ?? "Ready to fulfill" }, true);
    case "payment_success":
      return orderReceived(payload);
    case "payment_failed":
      return noticeEmail(payload, {
        icon: "alert",
        titleLead: "Payment ",
        titleAccent: "failed",
        subtitle: payload.orderNumber
          ? `We couldn't process payment for order #${payload.orderNumber}.`
          : "We couldn't process your payment.",
        noticeTitle: "Try again",
        noticeBody: payload.reason?.trim()
          ? payload.reason.trim()
          : "Please try again with the same or a different payment method. Your order stays unpaid until a payment succeeds.",
        ctaLabel: "View Order",
        href: payload.orderId ? absoluteAppUrl(payload.actionPath || `/checkout?order=${payload.orderId}`) : absoluteAppUrl("/orders"),
        subject: payload.orderNumber ? `Payment failed — order #${payload.orderNumber}` : "Payment failed",
        help: HELP.order,
      });
    case "order_shipped":
      if (!payload.orderNumber) return null;
      return noticeEmail(payload, {
        icon: "box",
        titleLead: "Order ",
        titleAccent: "shipped",
        subtitle: `Good news — order #${payload.orderNumber} is on the way.`,
        noticeTitle: "Tracking",
        noticeBody: payload.trackingNumber?.trim()
          ? `Tracking number: ${payload.trackingNumber.trim()}`
          : "Tracking details will appear on your order as soon as the carrier provides them.",
        ctaLabel: payload.trackingUrl?.trim() ? "Track shipment" : "View Order",
        href: payload.trackingUrl?.trim()
          ? payload.trackingUrl.trim()
          : orderHref(payload, "/orders/:id"),
        subject: `Shipped — order #${payload.orderNumber}`,
        help: HELP.order,
        statsHeadline: `#${payload.orderNumber}`,
        stats: [
          { icon: "box", label: "Status", value: "Shipped" },
          { icon: "card", label: "Tracking", value: payload.trackingNumber?.trim() || "Pending" },
          { icon: "calendar", label: "Date", value: formatEmailDate(payload.occurredAt, false) || "—" },
        ],
      });
    case "order_delivered":
      if (!payload.orderNumber) return null;
      return noticeEmail(payload, {
        icon: "shield-check",
        titleLead: "Order ",
        titleAccent: "delivered",
        subtitle: `Order #${payload.orderNumber} is marked delivered.`,
        noticeTitle: "You're all set",
        noticeBody: "If something is missing or damaged, contact support from your order page.",
        ctaLabel: "View Order",
        href: orderHref(payload, "/orders/:id"),
        subject: `Delivered — order #${payload.orderNumber}`,
        help: HELP.order,
      });
    case "order_cancelled":
      if (!payload.orderNumber) return null;
      return noticeEmail(payload, {
        icon: "alert",
        titleLead: "Order ",
        titleAccent: "cancelled",
        subtitle: `Order #${payload.orderNumber} has been cancelled.`,
        noticeTitle: "What this means",
        noticeBody: payload.reason?.trim() || "This order will not be fulfilled. If you already paid, a refund is a separate confirmed step.",
        ctaLabel: "View Order",
        href: orderHref(payload, "/orders/:id"),
        subject: `Cancelled — order #${payload.orderNumber}`,
        help: HELP.order,
      });
    case "refund_completed":
      if (!payload.orderNumber) return null;
      return noticeEmail(payload, {
        icon: "card",
        titleLead: "Refund ",
        titleAccent: "completed",
        subtitle: `A refund for order #${payload.orderNumber} was confirmed by the payment provider.`,
        noticeTitle: "Refund amount",
        noticeBody:
          payload.amount != null && payload.currency
            ? formatEmailMoney(payload.amount, payload.currency)
            : "The refunded amount will appear with your payment provider.",
        ctaLabel: "View Order",
        href: orderHref(payload, "/orders/:id"),
        subject: `Refund completed — order #${payload.orderNumber}`,
        help: HELP.order,
      });
    case "withdrawal_requested":
      if (payload.amount == null || !payload.currency) return null;
      return noticeEmail(payload, {
        icon: "card",
        titleLead: "Withdrawal ",
        titleAccent: "requested",
        subtitle: "We received your withdrawal request. It is pending review and has not been paid yet.",
        noticeTitle: "Request details",
        noticeBody: `${formatEmailMoney(payload.amount, payload.currency)}${payload.destinationLabel ? ` · ${payload.destinationLabel}` : ""}`,
        ctaLabel: "View wallet",
        href: absoluteAppUrl("/wallet/withdrawals"),
        subject: `Withdrawal request received — ${formatEmailMoney(payload.amount, payload.currency)}`,
        help: HELP.payout,
      });
    case "payout_sent":
      if (payload.amount == null || !payload.currency) return null;
      return noticeEmail(payload, {
        icon: "shield-check",
        titleLead: "Payout ",
        titleAccent: "sent",
        subtitle: "Your payout was marked paid. It can take a short time to appear depending on the destination.",
        noticeTitle: "Amount",
        noticeBody: `${formatEmailMoney(payload.amount, payload.currency)}${payload.destinationLabel ? `\nSent to: ${payload.destinationLabel}` : ""}`,
        ctaLabel: "View wallet",
        href: absoluteAppUrl("/wallet"),
        subject: `Payout sent — ${formatEmailMoney(payload.amount, payload.currency)}`,
        help: HELP.payout,
      });
    case "payout_failed":
      if (payload.amount == null || !payload.currency) return null;
      return noticeEmail(payload, {
        icon: "alert",
        titleLead: "Payout ",
        titleAccent: "update",
        subtitle: "This payout was not sent. Reserved funds were returned to your available balance when the request was rejected.",
        noticeTitle: "Amount",
        noticeBody: `${formatEmailMoney(payload.amount, payload.currency)}${payload.reason?.trim() ? `\n${payload.reason.trim()}` : ""}`,
        ctaLabel: "View wallet",
        href: absoluteAppUrl("/wallet/withdrawals"),
        subject: `Payout not sent — ${formatEmailMoney(payload.amount, payload.currency)}`,
        help: HELP.payout,
      });
    case "welcome": {
      const name = firstNameFrom(payload.destinationLabel) ?? "there";
      const content = render({
        preview: "Welcome to Jimvio — your next opportunity starts here.",
        icon: "shield-check",
        titleLead: "Welcome to ",
        titleAccent: "Jimvio!",
        subtitle: "Your next opportunity to create, sell, promote, and earn starts here.",
        details: {
          label: "YOU'RE PART OF JIMVIO",
          headline: `Hi ${name},`,
          paragraph:
            "Thanks for joining Jimvio. We're excited to have you here. Discover products, connect with communities, create content, and explore ways to earn on your terms.",
        },
        notice: {
          icon: "compass",
          title: "Your journey starts here",
          body: "Set up your profile, explore the marketplace, and find the opportunities that fit you best.",
        },
        cta: { label: "Explore Jimvio", url: absoluteAppUrl(payload.actionPath || "/") },
        footnote: "You can personalize your experience anytime.",
        help: "If you have questions, our support team is here to help.",
      });
      return { subject: "Welcome to Jimvio", preview: "Welcome to Jimvio", ...content };
    }
    case "verification_decision": {
      const business = payload.scope === "business";
      const approved = payload.decision === "approved";
      if (payload.decision !== "approved" && payload.decision !== "rejected") return null;
      return noticeEmail(payload, {
        icon: approved ? "shield-check" : "alert",
        titleLead: business ? "Business " : "Identity ",
        titleAccent: approved ? "verified" : "update",
        subtitle: approved
          ? business
            ? "Your business verification was approved."
            : "Your identity verification was approved."
          : business
            ? "Your business verification was not approved."
            : "Your identity verification was not approved.",
        noticeTitle: approved ? "You're verified" : "What you can do",
        noticeBody: approved
          ? "This decision came from the identity provider webhook. You can continue with the features that require verification."
          : "You can review the request and submit again from your verification page. A declined result is not an approval.",
        ctaLabel: "Review verification",
        href: absoluteAppUrl("/identity/verification"),
        subject: approved
          ? business
            ? "Business verification approved"
            : "Identity verification approved"
          : business
            ? "Business verification update"
            : "Identity verification update",
        help: HELP.account,
      });
    }
    case "creator_reward_paid":
      if (payload.amount == null || !payload.currency) return null;
      return noticeEmail(payload, {
        icon: "shield-check",
        titleLead: "Reward ",
        titleAccent: "paid",
        subtitle: "Your approved submission reward was credited.",
        noticeTitle: "Amount",
        noticeBody: formatEmailMoney(payload.amount, payload.currency),
        ctaLabel: "View earnings",
        href: absoluteAppUrl("/ugc/earnings"),
        subject: `Creator reward paid — ${formatEmailMoney(payload.amount, payload.currency)}`,
        help: HELP.payout,
      });
    case "account_notice":
      if (!payload.subject?.trim() || !payload.titleLead?.trim() || !payload.subtitle?.trim() || !payload.ctaLabel?.trim() || !payload.actionPath?.trim()) {
        return null;
      }
      return noticeEmail(payload, {
        icon: payload.icon ?? "compass",
        titleLead: payload.titleLead,
        titleAccent: payload.titleAccent ?? "",
        subtitle: payload.subtitle,
        noticeTitle: payload.noticeTitle || "Update",
        noticeBody: payload.noticeBody || payload.subtitle,
        ctaLabel: payload.ctaLabel,
        href: absoluteAppUrl(payload.actionPath),
        subject: payload.subject,
        help: payload.help || HELP.account,
      });
    default:
      return null;
  }
}

function noticeEmail(
  _payload: EmailPayload,
  spec: {
    icon: EmailIconName;
    titleLead: string;
    titleAccent: string;
    subtitle: string;
    noticeTitle: string;
    noticeBody: string;
    ctaLabel: string;
    href: string;
    subject: string;
    help: string;
    statsHeadline?: string;
    stats?: EmailStat[];
  },
): RenderedEmail {
  const content = render({
    preview: spec.subtitle,
    icon: spec.icon,
    titleLead: spec.titleLead,
    titleAccent: spec.titleAccent,
    subtitle: spec.subtitle,
    details: spec.stats
      ? { label: "DETAILS", headline: spec.statsHeadline, stats: spec.stats }
      : undefined,
    notice: { icon: spec.icon === "alert" ? "alert" : "clock", title: spec.noticeTitle, body: spec.noticeBody },
    cta: { label: spec.ctaLabel, url: spec.href },
    help: spec.help,
  });
  return { subject: spec.subject, preview: spec.subtitle, ...content };
}
